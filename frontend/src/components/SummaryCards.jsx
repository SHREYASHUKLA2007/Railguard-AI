import React from 'react';
import { Train, ShieldCheck, AlertTriangle, Activity, Database, AlertOctagon, ChevronRight, TrendingUp, TrendingDown, Clock, ShieldAlert } from 'lucide-react';

export default function SummaryCards({ telemetry, analytics, status, onOpenModal }) {
  const trainState = telemetry?.train_state || 'STOPPED';
  const safeCount = telemetry?.safe_count ?? 0;
  const dangerCount = telemetry?.danger_count ?? 0;
  const activeAlertsCount = Array.isArray(telemetry?.alerts) ? telemetry.alerts.length : 0;
  const totalIncidents = analytics?.total_incidents ?? 0;
  const criticalAlerts = analytics?.critical_alerts ?? 0;

  // Visual state styling for train
  let trainColor = 'text-blue-400';
  let trainBg = 'bg-blue-500/10 border-blue-500/30';
  let trainStatusText = 'Stationary at Platform';
  if (trainState === 'APPROACHING') {
    trainColor = 'text-amber-400';
    trainBg = 'bg-amber-500/10 border-amber-500/30';
    trainStatusText = 'Incoming Track Motion';
  } else if (trainState === 'DEPARTING') {
    trainColor = 'text-orange-400';
    trainBg = 'bg-orange-500/10 border-orange-500/30';
    trainStatusText = 'Departing Platform';
  }

  // Cards definitions
  const cards = [
    {
      id: 'train_status',
      title: 'TRAIN STATUS',
      value: trainState,
      subtitle: trainStatusText,
      trend: status.is_monitoring ? 'AI Active' : 'Offline',
      icon: Train,
      accentColor: trainColor,
      badgeColor: trainState === 'STOPPED' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300',
      borderColor: trainState === 'APPROACHING' ? 'border-amber-500/40' : 'border-slate-800',
      statusType: trainState === 'APPROACHING' ? 'warning' : 'normal',
    },
    {
      id: 'safe_passengers',
      title: 'SAFE PASSENGERS',
      value: safeCount,
      subtitle: 'Inside platform boundary',
      trend: `${safeCount} tracked`,
      icon: ShieldCheck,
      accentColor: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/20 text-emerald-300',
      borderColor: 'border-slate-800',
      statusType: 'normal',
    },
    {
      id: 'danger_zone',
      title: 'DANGER ZONE',
      value: dangerCount,
      subtitle: 'Beyond yellow safety line',
      trend: dangerCount > 0 ? 'CRITICAL RISK' : 'Area Clear',
      icon: AlertTriangle,
      accentColor: dangerCount > 0 ? 'text-rose-400' : 'text-slate-400',
      badgeColor: dangerCount > 0 ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'bg-slate-800 text-slate-400',
      borderColor: dangerCount > 0 ? 'border-rose-500/60 shadow-lg shadow-rose-950/40' : 'border-slate-800',
      statusType: dangerCount > 0 ? 'critical' : 'normal',
    },
    {
      id: 'active_alerts',
      title: 'ACTIVE ALERTS',
      value: activeAlertsCount,
      subtitle: 'Real-time telemetry warnings',
      trend: activeAlertsCount > 0 ? 'Action Needed' : 'Nominal',
      icon: Activity,
      accentColor: activeAlertsCount > 0 ? 'text-amber-400' : 'text-slate-400',
      badgeColor: activeAlertsCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400',
      borderColor: activeAlertsCount > 0 ? 'border-amber-500/50' : 'border-slate-800',
      statusType: activeAlertsCount > 0 ? 'warning' : 'normal',
    },
    {
      id: 'total_incidents',
      title: 'TOTAL INCIDENTS',
      value: totalIncidents,
      subtitle: 'Historical database logs',
      trend: 'SQLite Synced',
      icon: Database,
      accentColor: 'text-cyan-400',
      badgeColor: 'bg-cyan-500/20 text-cyan-300',
      borderColor: 'border-slate-800',
      statusType: 'normal',
    },
    {
      id: 'critical_alerts',
      title: 'CRITICAL ALERTS',
      value: criticalAlerts,
      subtitle: 'Safety violations (>= 3s)',
      trend: criticalAlerts > 0 ? 'High Priority' : 'Zero Recorded',
      icon: AlertOctagon,
      accentColor: criticalAlerts > 0 ? 'text-rose-400' : 'text-slate-400',
      badgeColor: criticalAlerts > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400',
      borderColor: criticalAlerts > 0 ? 'border-rose-500/40' : 'border-slate-800',
      statusType: criticalAlerts > 0 ? 'critical' : 'normal',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 mb-6">
      {cards.map((c) => {
        const IconComponent = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onOpenModal(c.id)}
            className={`group relative text-left bg-slate-900/90 hover:bg-slate-850 p-4 rounded-xl border ${c.borderColor} transition-all duration-200 cursor-pointer glow-card focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
          >
            {/* Top row: Icon and Trend badge */}
            <div className="flex items-center justify-between mb-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.badgeColor} border border-white/5`}>
                <IconComponent size={20} className={c.accentColor} />
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${c.badgeColor}`}>
                {c.trend}
              </span>
            </div>

            {/* Metric Value */}
            <div className="mb-1">
              <span className={`text-2xl font-black tracking-tight ${c.accentColor}`}>
                {c.value}
              </span>
            </div>

            {/* Label and Subtitle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-300 tracking-wider uppercase">
                  {c.title}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                  {c.subtitle}
                </p>
              </div>
              <ChevronRight
                size={14}
                className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
