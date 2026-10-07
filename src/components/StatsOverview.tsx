import React from 'react';
import { Activity, CheckCircle2, AlertTriangle, Zap, Server, ShieldCheck } from 'lucide-react';
import { SystemStats } from '../types';

interface StatsOverviewProps {
  stats: SystemStats;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
      {/* Total Services */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-medium">URLs Alojadas</span>
          <Server className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900">{stats.total}</span>
          <span className="text-[11px] text-slate-500">en SQLite</span>
        </div>
      </div>

      {/* Online / Active (Green Ring) */}
      <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between text-emerald-700 mb-2">
          <span className="text-xs font-semibold">Activos (Online)</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-700">{stats.online}</span>
          <span className="text-[11px] text-emerald-600 font-medium">anillo verde</span>
        </div>
      </div>

      {/* Offline / Down (Red Ring) */}
      <div className={`rounded-xl p-3.5 sm:p-4 shadow-xs transition-all ${
        stats.offline > 0
          ? 'bg-rose-50/80 border border-rose-300 shadow-sm'
          : 'bg-white border border-slate-200'
      }`}>
        <div className="flex items-center justify-between text-rose-700 mb-2">
          <span className="text-xs font-semibold">Caídos (Alerta)</span>
          <AlertTriangle className={`w-4 h-4 ${stats.offline > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-rose-700">{stats.offline}</span>
          <span className="text-[11px] text-rose-600 font-medium">anillo rojo</span>
        </div>
      </div>

      {/* Degraded */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between text-amber-700 mb-2">
          <span className="text-xs font-medium">Degradados / Lentos</span>
          <Activity className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-amber-700">{stats.degraded}</span>
          <span className="text-[11px] text-slate-500">&gt;1.4s resp</span>
        </div>
      </div>

      {/* Latency */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-medium">Latencia Promedio</span>
          <Zap className="w-4 h-4 text-teal-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-slate-900">
            {stats.avgLatency > 0 ? `${stats.avgLatency}ms` : '--'}
          </span>
          <span className="text-[11px] text-teal-700 font-medium">tiempo HTTP</span>
        </div>
      </div>

      {/* Global Stability */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-medium">Estabilidad Global</span>
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono text-emerald-700">
            {stats.avgUptime}%
          </span>
          <span className="text-[11px] text-slate-500">histórico</span>
        </div>
      </div>
    </div>
  );
};
