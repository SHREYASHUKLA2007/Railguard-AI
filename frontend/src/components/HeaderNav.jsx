import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, Video, Database, Clock } from 'lucide-react';

export default function HeaderNav({ activeTab, setActiveTab, status, telemetry, backendConnected = true }) {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'monitoring', label: 'Live Monitoring', icon: Video },
    { id: 'incidents', label: 'Incidents', icon: Database },
  ];

  return (
    <header className="mb-6 pb-4 border-b border-slate-800">
      {/* Top Banner: Logo, Live Status, Station Clock */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="text-blue-400" size={22} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                RAILGUARD AI
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 tracking-widest uppercase">
                  v2.0 COMMAND
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Intelligent Railway Platform Safety &bull; YOLOv8 Detection &bull; Automated Danger Zone Alerting
            </p>
          </div>
        </div>

        {/* Status Badge & Clock */}
        <div className="flex items-center gap-3">
          {/* Station Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock size={13} className="text-slate-400" />
            <span>{currentTime}</span>
          </div>

          {/* System Online / Offline Badge */}
          <div
            className={`px-3 py-1.5 rounded-full border text-xs font-bold flex items-center gap-2 ${
              !backendConnected
                ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 shadow-sm shadow-amber-950'
                : status.is_monitoring
                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shadow-sm shadow-emerald-950'
                : 'border-slate-700 text-slate-400 bg-slate-900'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !backendConnected
                  ? 'bg-amber-400 animate-pulse'
                  : status.is_monitoring
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-slate-500'
              }`}
            />
            <span>
              {!backendConnected
                ? 'BACKEND CONNECTING...'
                : status.is_monitoring
                ? 'AI ENGINE ONLINE'
                : 'SYSTEM STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Navigation Tabs */}
      <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition cursor-pointer focus:outline-none whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30 border border-blue-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon size={15} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
