import React from 'react';
import { BarChart3, Zap, Shield, CheckCircle, AlertTriangle, ArrowUpRight, TrendingUp } from 'lucide-react';
import { ServiceItem, SystemStats } from '../../types';

interface AnalyticsViewProps {
  services: ServiceItem[];
  stats: SystemStats;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ services, stats }) => {
  // Sort services by speed (excluding offline 0 latency)
  const sortedBySpeed = [...services]
    .filter((s) => s.status !== 'offline')
    .sort((a, b) => a.last_response_time_ms - b.last_response_time_ms);

  // Group by category
  const categoryStats = services.reduce((acc, s) => {
    const cat = s.category || 'General';
    if (!acc[cat]) {
      acc[cat] = { total: 0, online: 0, avgLatency: 0, latencies: [] as number[] };
    }
    acc[cat].total += 1;
    if (s.status === 'online') acc[cat].online += 1;
    if (s.last_response_time_ms > 0) acc[cat].latencies.push(s.last_response_time_ms);
    return acc;
  }, {} as Record<string, { total: number; online: number; avgLatency: number; latencies: number[] }>);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          <span>Métricas de Estabilidad & Rendimiento</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Análisis de disponibilidad histórica, latencias HTTP y ranking de velocidad de tus aplicaciones.
        </p>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Disponibilidad Promedio</span>
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-700">
              {stats.avgUptime}%
            </span>
            <span className="text-xs text-emerald-600 font-semibold font-mono">SLA Global</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Calculado sobre {services.reduce((acc, s) => acc + s.total_checks, 0)} verificaciones
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Latencia Media</span>
            <Zap className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900">
              {stats.avgLatency}ms
            </span>
            <span className="text-xs text-teal-700 font-semibold font-mono">HTTP Ping</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Tiempo promedio de ida y vuelta (RTT)
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Servicios Operativos</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-700">
              {stats.online}/{stats.total}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">Activos</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            {stats.offline} servicio(s) caído(s) actualmente
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Estabilidad Óptima (&gt;99%)</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-slate-900">
              {services.filter((s) => s.uptime_percentage >= 99).length}
            </span>
            <span className="text-xs text-slate-500">de {services.length}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-2 block">
            Programas con alta fidelidad y sin interrupciones
          </span>
        </div>
      </div>

      {/* Speed Ranking & Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speed Ranking */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Ranking de Velocidad (Más Rápidos)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Tiempo de respuesta</span>
          </div>

          <div className="space-y-3">
            {sortedBySpeed.slice(0, 6).map((service, idx) => (
              <div key={service.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-3 truncate">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {service.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate block">
                      {service.url}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs font-extrabold text-teal-700">
                    {service.last_response_time_ms} ms
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    {service.uptime_percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Salud por Categoría</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Distribución</span>
          </div>

          <div className="space-y-4">
            {Object.entries(categoryStats).map(([cat, data]) => {
              const percentOnline = Math.round((data.online / data.total) * 100);
              const avgLat = data.latencies.length > 0
                ? Math.round(data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length)
                : 0;

              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{cat}</span>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-slate-500">{avgLat}ms promedio</span>
                      <span className="font-bold text-emerald-700">{data.online}/{data.total} activos</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentOnline === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${percentOnline}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
