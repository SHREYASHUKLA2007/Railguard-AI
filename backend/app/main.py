"""
RailGuard AI — Pure Starlette Backend
Works on Python 3.14 with no Rust/C++ compilation.
No Pydantic required.
"""

import os, sys, time, base64, json, asyncio, shutil, threading, sqlite3
from datetime import datetime
from typing import Optional

import cv2
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.routing import Route, WebSocketRoute, Mount
from starlette.staticfiles import StaticFiles
from starlette.requests import Request
from starlette.responses import JSONResponse, FileResponse
from starlette.exceptions import HTTPException
from starlette.websockets import WebSocket, WebSocketDisconnect

# ──────────────────────────────────────────────
# Storage & SQLite setup
# Compatible with local dev, Docker and Render Persistent Disks
# ──────────────────────────────────────────────
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATA_DIR = os.environ.get("DATA_DIR")
if DATA_DIR:
    os.makedirs(DATA_DIR, exist_ok=True)
    DB_PATH = os.path.join(DATA_DIR, "railguard.db")
    INPUT_DIR = os.path.join(DATA_DIR, "input")
    os.makedirs(INPUT_DIR, exist_ok=True)
    default_db = os.path.join(ROOT_DIR, "railguard.db")
    if not os.path.exists(DB_PATH) and os.path.exists(default_db):
        try:
            shutil.copy2(default_db, DB_PATH)
        except Exception:
            pass
    default_input = os.path.join(ROOT_DIR, "data", "input")
    if os.path.exists(default_input):
        try:
            for item in os.listdir(default_input):
                s = os.path.join(default_input, item)
                d = os.path.join(INPUT_DIR, item)
                if os.path.isfile(s) and not os.path.exists(d):
                    shutil.copy2(s, d)
        except Exception:
            pass
else:
    DB_PATH = os.path.join(ROOT_DIR, "railguard.db")
    INPUT_DIR = os.path.join(ROOT_DIR, "data", "input")
    os.makedirs(INPUT_DIR, exist_ok=True)

def _get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def _init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp     TEXT    DEFAULT (datetime('now')),
            camera_id     INTEGER DEFAULT 1,
            passenger_id  INTEGER,
            train_state   TEXT,
            danger_duration REAL,
            risk_level    TEXT,
            reason        TEXT,
            status        TEXT    DEFAULT 'OPEN'
        )
    """)
    conn.commit()
    conn.close()

_init_db()

# ──────────────────────────────────────────────
# Shared app state
# ──────────────────────────────────────────────
state = {
    "is_monitoring": False,
    "video_path": None,
    "frame_b64": None,
    "telemetry": {
        "train_state": "STOPPED",
        "safe_count": 0,
        "danger_count": 0,
        "alerts": [],
    },
}
ws_clients = []

# ──────────────────────────────────────────────
# Alert / incident save
# ──────────────────────────────────────────────
def save_incident(alert: dict):
    conn = _get_conn()
    conn.execute(
        """INSERT INTO incidents
           (passenger_id, train_state, danger_duration, risk_level, reason)
           VALUES (?, ?, ?, ?, ?)""",
        (
            alert.get("passenger_id", -1),
            alert.get("train_state", "UNKNOWN"),
            alert.get("danger_duration", 0.0),
            alert.get("risk_level", "CRITICAL"),
            alert.get("reason", ""),
        ),
    )
    conn.commit()
    conn.close()

# ──────────────────────────────────────────────
# Demo video generator
# ──────────────────────────────────────────────
def _make_demo_video(path: str):
    import numpy as np
    os.makedirs(os.path.dirname(path), exist_ok=True)
    w, h = 640, 480
    out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), 25, (w, h))
    for i in range(150):
        frame = np.full((h, w, 3), (30, 30, 50), dtype=np.uint8)
        tx = max(0, w - i * 3)
        cv2.rectangle(frame, (tx, 80), (tx + 200, 220), (200, 100, 50), -1)
        cv2.putText(frame, "TRAIN", (tx + 10, 165), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
        py = min(h - 70, 80 + i * 2)
        cv2.rectangle(frame, (290, py), (325, py + 65), (50, 200, 80), -1)
        cv2.putText(frame, "PERSON", (272, py - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 100), 1)
        out.write(frame)
    out.release()
    print(f"[DEMO] Video written to {path}")

# ──────────────────────────────────────────────
# Video processing thread
# ──────────────────────────────────────────────
def _processing_loop():
    root = ROOT_DIR
    if root not in sys.path:
        sys.path.insert(0, root)

    try:
        from ai_engine.video_processing.processor import VideoProcessor
        processor = VideoProcessor(
            model_path=os.path.join(root, "yolov8n.pt"),
            config_path=os.path.join(root, "ai_engine", "danger_zone", "zone_config.json"),
            on_alert_callback=save_incident,
        )
        using_ai = True
        print("[AI] VideoProcessor loaded.")
    except Exception as e:
        print(f"[WARNING] AI engine unavailable: {e}. Running in visual-only mode.")
        processor = None
        using_ai = False

    path = state["video_path"] or os.path.join(INPUT_DIR, "demo.mp4")
    if not os.path.isabs(path):
        path = os.path.join(ROOT_DIR, path)
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open: {path}")
        state["is_monitoring"] = False
        return

    print(f"[INFO] Processing: {path}")
    while state["is_monitoring"]:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        try:
            if using_ai and processor:
                processed, telemetry = processor.process_frame(frame)
                state["telemetry"] = {
                    "train_state": telemetry.get("train_state", "STOPPED"),
                    "safe_count":  telemetry.get("safe_count", 0),
                    "danger_count": telemetry.get("danger_count", 0),
                    "alerts":      telemetry.get("alerts", []),
                    "passengers":  telemetry.get("passengers", {}),
                }
            else:
                processed = frame.copy()
                cv2.line(processed, (215, 480), (275, 0), (0, 255, 255), 3)
                cv2.putText(processed, "RAILGUARD AI - DEMO MODE",
                            (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 255), 2)
                cv2.putText(processed, f"Train: {state['telemetry']['train_state']}",
                            (10, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 100, 50), 2)

            ok, buf = cv2.imencode(".jpg", processed, [cv2.IMWRITE_JPEG_QUALITY, 72])
            if ok:
                state["frame_b64"] = base64.b64encode(buf.tobytes()).decode()
        except Exception as e:
            print(f"[FRAME ERR] {e}")

        time.sleep(0.04)

    cap.release()
    print("[INFO] Processing stopped.")

# ──────────────────────────────────────────────
# REST handlers
# ──────────────────────────────────────────────
async def health(request: Request):
    return JSONResponse({"status": "ok", "time": datetime.utcnow().isoformat()})

async def get_status(request: Request):
    return JSONResponse({"is_monitoring": state["is_monitoring"]})

async def get_frame(request: Request):
    return JSONResponse({
        "is_monitoring": state["is_monitoring"],
        "telemetry": state["telemetry"],
        "frame": state["frame_b64"]
    })

async def start_monitor(request: Request):
    if state["is_monitoring"]:
        return JSONResponse({"message": "Already monitoring"})
    if not state["video_path"]:
        demo = os.path.join(INPUT_DIR, "demo.mp4")
        if not os.path.exists(demo):
            _make_demo_video(demo)
        state["video_path"] = demo
    state["is_monitoring"] = True
    threading.Thread(target=_processing_loop, daemon=True).start()
    return JSONResponse({"message": "Started"})

async def stop_monitor(request: Request):
    state["is_monitoring"] = False
    return JSONResponse({"message": "Stopped"})

async def upload_video(request: Request):
    form  = await request.form()
    video = form.get("file")
    if video is None:
        return JSONResponse({"error": "No file"}, status_code=400)
    dest = os.path.join(INPUT_DIR, video.filename)
    content = await video.read()
    with open(dest, "wb") as f:
        f.write(content)
    state["video_path"] = dest
    return JSONResponse({"message": f"Uploaded {video.filename}"})

async def get_incidents(request: Request):
    risk = request.query_params.get("risk")
    search = request.query_params.get("search")
    limit_param = request.query_params.get("limit", "100")
    try:
        limit = int(limit_param)
    except ValueError:
        limit = 100

    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    if risk and risk.upper() != "ALL":
        query += " AND risk_level = ?"
        params.append(risk.upper())
    if search:
        query += " AND (CAST(passenger_id AS TEXT) LIKE ? OR train_state LIKE ? OR reason LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)

    conn = _get_conn()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return JSONResponse([dict(r) for r in rows])

async def get_analytics(request: Request):
    conn = _get_conn()
    total    = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    critical = conn.execute("SELECT COUNT(*) FROM incidents WHERE risk_level='CRITICAL'").fetchone()[0]
    high     = conn.execute("SELECT COUNT(*) FROM incidents WHERE risk_level='HIGH'").fetchone()[0]
    medium   = conn.execute("SELECT COUNT(*) FROM incidents WHERE risk_level='MEDIUM'").fetchone()[0]
    low      = conn.execute("SELECT COUNT(*) FROM incidents WHERE risk_level='LOW'").fetchone()[0]

    train_states = {}
    for r in conn.execute("SELECT train_state, COUNT(*) as cnt FROM incidents GROUP BY train_state").fetchall():
        train_states[r["train_state"] or "UNKNOWN"] = r["cnt"]

    timeline = []
    for r in conn.execute("SELECT SUBSTR(timestamp, 1, 13) as slot, risk_level, COUNT(*) as cnt FROM incidents GROUP BY slot, risk_level ORDER BY slot DESC LIMIT 20").fetchall():
        timeline.append(dict(r))

    conn.close()
    return JSONResponse({
        "total_incidents": total,
        "critical_alerts": critical,
        "high_alerts": high,
        "medium_alerts": medium,
        "low_alerts": low,
        "by_train_state": train_states,
        "timeline": timeline,
    })

async def get_videos(request: Request):
    files = []
    current_active = os.path.basename(state["video_path"]) if state["video_path"] else "demo.mp4"
    for f in os.listdir(INPUT_DIR):
        if f.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
            full_p = os.path.join(INPUT_DIR, f)
            size_mb = round(os.path.getsize(full_p) / (1024 * 1024), 2)
            files.append({"filename": f, "size_mb": size_mb, "is_active": f == current_active})
    return JSONResponse({"videos": files, "current_video": current_active})

async def select_video(request: Request):
    try:
        body = await request.json()
        filename = body.get("filename")
    except Exception:
        filename = None
    if not filename:
        return JSONResponse({"error": "filename required"}, status_code=400)
    dest = os.path.join(INPUT_DIR, os.path.basename(filename))
    if not os.path.exists(dest):
        return JSONResponse({"error": "Video file not found"}, status_code=404)
    state["video_path"] = dest
    return JSONResponse({"message": f"Selected {filename}", "video_path": dest})

START_TIME = time.time()

async def get_system_info(request: Request):
    conn = _get_conn()
    total_incidents = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    conn.close()

    model_path = os.path.join(ROOT_DIR, "yolov8n.pt")
    config_path = os.path.join(ROOT_DIR, "ai_engine", "danger_zone", "zone_config.json")
    zone_cfg = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                zone_cfg = json.load(f)
        except Exception:
            pass

    return JSONResponse({
        "status": "ONLINE",
        "model": {
            "name": "YOLOv8 Nano (yolov8n.pt)",
            "classes": ["person (0)", "train (6)"],
            "tracker": "BoT-SORT / ByteTrack",
            "exists": os.path.exists(model_path),
            "size_mb": round(os.path.getsize(model_path) / (1024 * 1024), 2) if os.path.exists(model_path) else 0,
        },
        "database": {
            "engine": "SQLite",
            "path": DB_PATH,
            "connected": True,
            "incidents_count": total_incidents,
        },
        "danger_zone": zone_cfg,
        "active_video": os.path.basename(state["video_path"]) if state["video_path"] else "demo.mp4",
        "monitoring": state["is_monitoring"],
        "uptime_seconds": round(time.time() - START_TIME, 1),
    })

async def seed_incidents(request: Request):
    conn = _get_conn()
    existing = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    if existing == 0:
        demo_items = [
            ("APPROACHING", 4.2, "CRITICAL", "Passenger #102 in danger zone for 4.2s while train APPROACHING"),
            ("APPROACHING", 3.8, "CRITICAL", "Passenger #105 in danger zone for 3.8s while train APPROACHING"),
            ("DEPARTING", 3.5, "HIGH", "Passenger #109 in danger zone for 3.5s while train DEPARTING"),
            ("STOPPED", 5.1, "HIGH", "Passenger #112 in danger zone for 5.1s while train STOPPED"),
            ("APPROACHING", 2.2, "MEDIUM", "Passenger #118 near platform edge threshold"),
            ("STOPPED", 3.1, "HIGH", "Passenger #121 crossed yellow line during boarding"),
            ("DEPARTING", 4.0, "CRITICAL", "Passenger #125 ran alongside departing train"),
            ("APPROACHING", 4.8, "CRITICAL", "Passenger #130 leaned over track while train approaching"),
            ("STOPPED", 1.5, "LOW", "Brief danger zone transit during disembarking"),
            ("DEPARTING", 3.2, "HIGH", "Passenger #134 stood on platform edge during departure"),
        ]
        import random
        for state_val, dur, risk, rsn in demo_items:
            pass_id = random.randint(101, 140)
            conn.execute(
                """INSERT INTO incidents (passenger_id, train_state, danger_duration, risk_level, reason)
                   VALUES (?, ?, ?, ?, ?)""",
                (pass_id, state_val, dur, risk, rsn)
            )
        conn.commit()
    count = conn.execute("SELECT COUNT(*) FROM incidents").fetchone()[0]
    conn.close()
    return JSONResponse({"message": "Demo incidents seeded", "total": count})

# ──────────────────────────────────────────────
# WebSocket
# ──────────────────────────────────────────────
async def ws_monitor(websocket: WebSocket):
    await websocket.accept()
    ws_clients.append(websocket)
    try:
        while True:
            if state["is_monitoring"] and state["frame_b64"]:
                payload = json.dumps({
                    "telemetry": state["telemetry"],
                    "frame":     state["frame_b64"],
                })
                await websocket.send_text(payload)
            await asyncio.sleep(0.08)
    except Exception:
        pass
    finally:
        if websocket in ws_clients:
            ws_clients.remove(websocket)

# ──────────────────────────────────────────────
# App routes
# CRITICAL: API and WebSocket routes FIRST, Mount LAST!
# ──────────────────────────────────────────────
frontend_dist = os.path.join(ROOT_DIR, "frontend", "dist")

routes = [
    Route("/api/health",          health),
    Route("/api/status",          get_status),
    Route("/api/monitor/frame",   get_frame),
    Route("/api/monitor/start",   start_monitor,  methods=["POST"]),
    Route("/api/monitor/stop",    stop_monitor,   methods=["POST"]),
    Route("/api/video/upload",    upload_video,   methods=["POST"]),
    Route("/api/video/select",    select_video,   methods=["POST"]),
    Route("/api/videos",          get_videos),
    Route("/api/incidents",       get_incidents),
    Route("/api/incidents/seed",  seed_incidents, methods=["POST"]),
    Route("/api/analytics",       get_analytics),
    Route("/api/system/info",     get_system_info),
    WebSocketRoute("/ws/monitor", ws_monitor),
]

class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except HTTPException as ex:
            if ex.status_code == 404:
                index_path = os.path.join(self.directory, "index.html")
                if os.path.exists(index_path):
                    return FileResponse(index_path)
            raise

# Mount frontend with SPA routing if built; otherwise provide API root fallback
if os.path.isdir(frontend_dist):
    routes.append(Mount("/", app=SPAStaticFiles(directory=frontend_dist, html=True), name="frontend"))
else:
    async def root_fallback(request: Request):
        return JSONResponse({
            "name": "RailGuard AI Integrated Backend API",
            "status": "ONLINE",
            "docs": "/api/system/info",
            "health": "/api/health"
        })
    routes.append(Route("/", root_fallback))

# Dynamic CORS configuration with support for environment overrides
cors_origins_env = os.environ.get("CORS_ORIGINS")
allowed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env else ["*"]

middleware = [
    Middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_origin_regex=r"^https://.*\.vercel\.app$",
    )
]

app = Starlette(routes=routes, middleware=middleware)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=False)


