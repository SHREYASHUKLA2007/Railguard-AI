import React from 'react';
import { X, Train, ShieldCheck, AlertTriangle, Activity, Database, AlertOctagon, ExternalLink, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

export default function CardDetailModal({ modalType, onClose, telemetry, analytics, incidents, onNavigateTab }) {
  if (!modalType) return null;

  const trainState = telemetry?.train_state || 'STOPPED';
  const safeCount = telemetry?.safe_count ?? 0;
  const dangerCount = telemetry?.danger_count ?? 0;
  const activeAlerts = Array.isArray(telemetry?.alerts) ? telemetry.alerts : [];
  const passengers = telemetry?.passengers || {};
  const criticalIncidents = (incidents || []).filter(i => i.risk_level === 'CRITICAL');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            {modalType === 'train_status' && <Train className="text-blue-400" size={22} />}
            {modalType === 'safe_passengers' && <ShieldCheck className="text-emerald-400" size={22} />}
            {modalType === 'danger_zone' && <AlertTriangle className="text-rose-400" size={22} />}
            {modalType === 'active_alerts' && <Activity className="text-amber-400" size={22} />}
            {modalType === 'total_incidents' && <Database className="text-cyan-400" size={22} />}
            {modalType === 'critical_alerts' && <AlertOctagon className="text-rose-500" size={22} />}

            <div>
              <h3 className="font-bold text-slate-100 text-lg">
                {modalType === 'train_status' && 'Train Movement & Tracking Telemetry'}
                {modalType === 'safe_passengers' && 'Safe Passenger Platform Metrics'}
                {modalType === 'danger_zone' && 'Virtual Danger Zone Violation Analysis'}
                {modalType === 'active_alerts' && 'Active Real-Time Safety Alerts'}
                {modalType === 'total_incidents' && 'Incident Database Overview'}
                {modalType === 'critical_alerts' && 'Critical Safety Breaches (>= 3s Rule)'}
              </h3>
              <p className="text-xs text-slate-400">Detailed inspection of live telemetry and recorded logs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* TRAIN STATUS MODAL */}
          {modalType === 'train_status' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Current State</span>
                  <div className="text-2xl font-bold text-blue-400 mt-1">{trainState}</div>
                  <p className="text-xs text-slate-400 mt-1">Calculated via horizontal centroid delta tracking</p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Detection Engine</span>
                  <div className="text-base font-bold text-slate-200 mt-1">YOLOv8 Nano (Class 6: Train)</div>
                  <p className="text-xs text-slate-400 mt-1">Movement threshold: 2.0 pixels/frame</p>
                </div>
              </div>

              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-2">
                <h4 className="font-semibold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" /> State Transition Logic
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 pl-6 list-disc">
                  <li><strong>APPROACHING:</strong> Train centroid moves towards platform stop marker. Passengers entering danger zone trigger CRITICAL warnings.</li>
                  <li><strong>STOPPED:</strong> Centroid velocity remains within ±2px threshold. Safe boarding window active.</li>
                  <li><strong>DEPARTING:</strong> Train accelerates outward from platform. Violations trigger HIGH risk alerts.</li>
                </ul>
              </div>
            </div>
          )}

          {/* SAFE PASSENGERS MODAL */}
          {modalType === 'safe_passengers' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-emerald-400">Total Safe Passengers</span>
                  <div className="text-3xl font-black text-emerald-300 mt-0.5">{safeCount}</div>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-medium">
                  Compliance: {safeCount + dangerCount > 0 ? Math.round((safeCount / (safeCount + dangerCount)) * 100) : 100}%
                </span>
              </div>

              <div>
                <h4 className="font-semibold text-slate-200 mb-2">Tracked Passengers in Safe Perimeter</h4>
                {Object.keys(passengers).length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                    No active passengers tracked. Start video monitoring to display real-time bounding boxes and tracker IDs.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {Object.entries(passengers).map(([id, p]) => (
                      <div key={id} className={`p-2.5 rounded-lg border text-xs flex justify-between items-center ${p.zone === 'DANGER_ZONE' ? 'bg-rose-950/30 border-rose-500/40' : 'bg-slate-950/50 border-slate-800'}`}>
                        <div>
                          <span className="font-bold text-slate-200">Pass #{id}</span>
                          <span className="text-[10px] text-slate-400 block">Conf: {Math.round((p.conf || 0) * 100)}%</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.zone === 'DANGER_ZONE' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {p.zone}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DANGER ZONE MODAL */}
          {modalType === 'danger_zone' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${dangerCount > 0 ? 'bg-rose-950/40 border-rose-500/60' : 'bg-slate-950/50 border-slate-800'}`}>
                <div>
                  <span className="text-xs uppercase font-bold text-rose-400">Current Danger Zone Breaches</span>
                  <div className="text-3xl font-black text-rose-300 mt-0.5">{dangerCount}</div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${dangerCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  {dangerCount > 0 ? 'VIOLATION DETECTED' : 'ZONE CLEAR'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Virtual Boundary Parameters</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>Line Start: <span className="font-mono text-cyan-400">[215, 800]</span></div>
                  <div>Line End: <span className="font-mono text-cyan-400">[275, 171]</span></div>
                  <div>Safety Duration: <span className="font-mono text-amber-400">3.0 seconds</span></div>
                  <div>Mathematical Method: <span className="font-mono text-slate-300">Cross-Product</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVE ALERTS MODAL */}
          {modalType === 'active_alerts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Real-time alerts broadcasted from AI Risk Engine:</span>
                <span className="text-xs font-bold text-amber-400">{activeAlerts.length} Active</span>
              </div>

              {activeAlerts.length === 0 ? (
                <div className="p-6 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  No active danger alerts. The safety boundary is currently secure.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {activeAlerts.map((a, i) => (
                    <div key={i} className="p-3 bg-rose-950/40 border border-rose-500/50 rounded-xl flex items-start gap-3">
                      <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={18} />
                      <div className="flex-1 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-rose-300">Passenger #{a.passenger_id}</span>
                          <span className="bg-rose-500/30 text-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            {a.risk_level}
                          </span>
                        </div>
                        <p className="text-slate-300">{a.reason || 'Exceeded danger threshold while train in motion.'}</p>
                        <div className="mt-1 text-[11px] text-slate-400">
                          Duration in zone: <strong className="text-white">{Number(a.danger_duration || 0).toFixed(1)}s</strong> | Train: <strong>{a.train_state}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TOTAL INCIDENTS MODAL */}
          {modalType === 'total_incidents' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Logs</span>
                  <div className="text-2xl font-bold text-cyan-400 mt-0.5">{analytics.total_incidents ?? 0}</div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Critical</span>
                  <div className="text-2xl font-bold text-rose-400 mt-0.5">{analytics.critical_alerts ?? 0}</div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">High Priority</span>
                  <div className="text-2xl font-bold text-amber-400 mt-0.5">{analytics.high_alerts ?? 0}</div>
                </div>
              </div>

              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 text-xs space-y-2">
                <p className="text-slate-300">
                  Incidents are automatically logged to SQLite database <code className="text-cyan-400">railguard.db</code> whenever a passenger crosses the danger zone threshold.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateTab('incidents');
                  }}
                  className="w-full mt-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink size={14} /> Open Full Incident History Table
                </button>
              </div>
            </div>
          )}

          {/* CRITICAL ALERTS MODAL */}
          {modalType === 'critical_alerts' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Severe incidents triggered while train was in motion:</span>
                <span className="font-bold text-rose-400">{criticalIncidents.length} Critical</span>
              </div>

              {criticalIncidents.length === 0 ? (
                <div className="p-6 text-center bg-slate-950/50 rounded-xl border border-slate-800 text-slate-400 text-xs">
                  Zero critical incidents recorded.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {criticalIncidents.slice(0, 8).map((inc, i) => (
                    <div key={inc.id || i} className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-rose-300">Incident #{inc.id} - Pass #{inc.passenger_id}</span>
                        <span className="text-[10px] text-slate-400">
                          {inc.timestamp ? new Date(inc.timestamp).toLocaleTimeString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{inc.reason}</p>
                      <div className="text-[10px] text-slate-400 flex gap-3 pt-0.5">
                        <span>Duration: <strong className="text-white">{Number(inc.danger_duration || 0).toFixed(1)}s</strong></span>
                        <span>Train: <strong className="text-white">{inc.train_state}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
