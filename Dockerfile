# ── Stage 1: Build Frontend (React 19 / Vite) ──────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Unified Production Server (Python 3.11) ───────
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PORT=10000 \
    KMP_DUPLICATE_LIB_OK=TRUE

WORKDIR /app

# OpenCV / PyTorch runtime libraries (headless wheels still need these)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    libglib2.0-0 \
    libgomp1 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU first, then lock those wheels so ultralytics cannot
# replace them with CUDA packages from PyPI (that fails / OOMs on Render).
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip freeze | grep -E '^(torch|torchvision|torchaudio)==' > /tmp/torch-constraint.txt && \
    pip install --no-cache-dir -c /tmp/torch-constraint.txt -r requirements.txt

# Copy backend application, AI engine, data and model weights
COPY ai_engine/ ./ai_engine/
COPY backend/ ./backend/
COPY database/ ./database/
COPY data/ ./data/
COPY yolov8n.pt .
COPY railguard.db .

RUN mkdir -p /app/data/input

# Copy compiled frontend from Stage 1 into the backend distribution path
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose web service port
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

# Bind to Render's injected PORT; trust proxy headers for HTTPS / WebSockets
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips='*'"]
