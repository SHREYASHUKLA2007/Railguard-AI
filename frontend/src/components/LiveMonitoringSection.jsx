import React, { useState } from 'react';
import { Activity, Play, Square, Upload, Maximize2, Minimize2, Video, Train, ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2, Film } from 'lucide-react';

export default function LiveMonitoringSection({
  status,
  telemetry,
  frame,
  connectionMode,
  availableVideos,
  currentVideo,
  onToggleMonitoring,
  onUploadVideo,
  onSelectVideo,
  onSeedDemoData,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Compute live risk condition
  const alertsList = Array.isArray(telemetry?.alerts) ? telemetry.alerts : [];
  let currentRisk = 'LOW';
  let riskBadgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  if (alertsList.length > 0) {
    const hasCritical = alertsList.some(a => a?.risk_level === 'CRITICAL');
    if (hasCritical) {
      currentRisk = 'CRITICAL';
      riskBadgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/50 animate-pulse';
    } else {
      currentRisk = 'HIGH';
      riskBadgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/50';
    }
  }

  // Connection indicator status
  let statusBadge = (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-slate-500" />
      OFFLINE
    </span>
  );
  if (status.is_monitoring) {
    if (frame) {
      statusBadge = (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          LIVE FEED
        </span>
      );
    } else {
      statusBadge = (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/40 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          CONNECTING...
        </span>
      );
    }
  }

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col mb-8 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
      {/* Control Room Top Header */}
      <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
            <Video size={18} className="text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-100 text-sm tracking-wide">
                CONTROL ROOM CAMERA FEED #01
              </h2>
              {statusBadge}
            </div>
            <p className="text-[11px] text-slate-400">
              YOLOv8 Object Detection &bull; Virtual Danger Zone Boundary &bull; BoT-SORT Tracker
            </p>
          </div>
        </div>

        {/* Right Action Bar: Video Source + Upload + Start/Stop */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Video Selector Dropdown */}
          {availableVideos && availableVideos.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
              <Film size={14} className="text-slate-400" />
              <select
                value={currentVideo || ''}
                onChange={(e) => onSelectVideo(e.target.value)}
                disabled={status.is_monitoring}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer disabled:opacity-50"
                title="Select active CCTV recording"
              >
                {availableVideos.map((v) => (
                  <option key={v.filename} value={v.filename} className="bg-slate-900 text-white">
                    {v.filename} ({v.size_mb} MB)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Upload Button */}
          <label className={`px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer flex items-center gap-1.5 transition ${status.is_monitoring ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Upload size={14} className="text-blue-400" />
            <span>Upload CCTV</span>
            <input
              type="file"
              accept="video/mp4,video/*"
              className="hidden"
              onChange={onUploadVideo}
              disabled={status.is_monitoring}
            />
          </label>

          {/* Start / Stop Monitoring Button */}
          {status.is_monitoring ? (
            <button
              onClick={onToggleMonitoring}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition shadow-lg shadow-rose-900/30 cursor-pointer"
            >
              <Square size={13} fill="currentColor" />
              Stop Monitoring
            </button>
          ) : (
            <button
              onClick={onToggleMonitoring}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition shadow-lg shadow-blue-900/30 cursor-pointer"
            >
              <Play size={13} fill="currentColor" />
              Start Monitoring
            </button>
          )}

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main Video Screen Area */}
      <div className="bg-black relative flex-1 min-h-[460px] flex items-center justify-center overflow-hidden">
        {status.is_monitoring && frame ? (
          <img
            src={`data:image/jpeg;base64,${frame}`}
            alt="Live AI Safety Camera"
            className="w-full h-full object-contain max-h-[620px]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-blue-400/60 shadow-inner">
              <Activity size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-200">Camera Feed Inactive</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Click <strong>&quot;Start Monitoring&quot;</strong> above to initialize the AI inference pipeline, load the YOLOv8 model, and stream real-time platform tracking.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <button
                onClick={onToggleMonitoring}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-md"
              >
                Start Monitoring Now
              </button>
              <button
                onClick={onSeedDemoData}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
              >
                Seed Sample Records
              </button>
            </div>
          </div>
        )}

        {/* Live Risk Level Badge Overlay */}
        {status.is_monitoring && (
          <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700 shadow-xl flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Threat Level:</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded border ${riskBadgeColor}`}>
              {currentRisk}
            </span>
          </div>
        )}

        {/* Stream Protocol / HUD overlay at top left */}
        {status.is_monitoring && (
          <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400 font-mono">
            PROTOCOL: {connectionMode === 'websocket' ? 'WS STREAM (LIVE)' : 'HTTP POLLING'}
          </div>
        )}
      </div>

      {/* Control Room Telemetry HUD Bar */}
      <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Train size={14} className="text-slate-400" />
            <span>Train:</span>
            <strong className={`font-mono ${telemetry?.train_state === 'APPROACHING' ? 'text-amber-400' : 'text-blue-400'}`}>
              {telemetry?.train_state || 'STOPPED'}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Safe Passengers:</span>
            <strong className="text-emerald-400 font-mono">{telemetry?.safe_count ?? 0}</strong>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-400" />
            <span>Danger Zone:</span>
            <strong className={`font-mono ${(telemetry?.danger_count ?? 0) > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {telemetry?.danger_count ?? 0}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span>Source: <code className="text-slate-300">{currentVideo || 'demo.mp4'}</code></span>
          <span className="text-slate-600">|</span>
          <span>Safety Rule: <strong className="text-amber-400">&ge; 3.0s Threshold</strong></span>
        </div>
      </div>
    </div>
  );
}
