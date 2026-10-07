import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, CheckCircle, ExternalLink, ShieldAlert } from 'lucide-react';
import { IncidentRecord } from '../../types';

interface IncidentsViewProps {
  onCheckService: (id: string) => Promise<void>;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({ onCheckService }) => {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'offline' | 'degraded'>('all');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/incidents').catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.incidents) setIncidents(data.incidents);
      }
    } catch {
      // quiet fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filtered = incidents.filter((inc) => {
    if (filter === 'all') return true;
    return inc.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Registro de Incidentes & Caídas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Historial cronológico de páginas caídas, fallos de conexión y tiempos de respuesta degradados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl text-xs shadow-2xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos ({incidents.length})
            </button>
            <button
              onClick={() => setFilter('offline')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filter === 'offline' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              Caídos ({incidents.filter((i) => i.status === 'offline').length})
            </button>
          </div>

          <button
            onClick={fetchIncidents}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refrescar historial"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Incidents Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <RefreshCw className="w-6 h-6 text-rose-600 animate-spin mx-auto mb-2" />
            <span>Consultando historial de fallos en SQLite...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <span className="font-bold text-slate-800 text-sm block">Sin incidentes recientes</span>
            <span className="text-slate-400 mt-1 block">Todos tus programas se encuentran en estado óptimo o no hay caídas registradas.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const isOffline = item.status === 'offline';
              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isOffline ? 'bg-rose-50 border border-rose-200 text-rose-600' : 'bg-amber-50 border border-amber-200 text-amber-600'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {item.service_name || 'Servicio Desconocido'}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                            isOffline
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <a
                        href={item.service_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-teal-700 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>{item.service_url}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      {item.error_message && (
                        <p className="text-xs text-rose-600 font-mono mt-1">
                          Motivo: {item.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:text-right shrink-0">
                    <div>
                      <span className="block text-xs font-mono font-bold text-slate-800">
                        Código HTTP: {item.status_code || '0 (Timeout)'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 sm:justify-end">
                        <Clock className="w-3 h-3" />
                        {new Date(item.checked_at).toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => onCheckService(item.service_id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                      Probar Ahora
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
