import React, { useState } from 'react';
import { ExternalLink, Copy, Check, RefreshCw, Trash2, Zap, Shield } from 'lucide-react';
import { ServiceItem } from '../types';

interface TableViewProps {
  services: ServiceItem[];
  onCheckSingle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const TableView: React.FC<TableViewProps> = ({
  services,
  onCheckSingle,
  onDelete,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const checkNow = async (id: string) => {
    setCheckingId(id);
    try {
      await onCheckSingle(id);
    } finally {
      setCheckingId(null);
    }
  };

  const launch = (url: string) => {
    let dest = url.trim();
    if (!dest.startsWith('http://') && !dest.startsWith('https://')) {
      dest = 'https://' + dest;
    }
    window.open(dest, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase">
            <tr>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Nombre / URL</th>
              <th className="py-3 px-4">Categoría</th>
              <th className="py-3 px-4">Latencia</th>
              <th className="py-3 px-4">Código</th>
              <th className="py-3 px-4">Estabilidad</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map((service) => {
              const isOnline = service.status === 'online';
              const isOffline = service.status === 'offline';
              const isChecking = checkingId === service.id;

              return (
                <tr
                  key={service.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {/* Status indicator ring */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          isOnline
                            ? 'bg-emerald-500 ring-4 ring-emerald-100'
                            : isOffline
                            ? 'bg-rose-500 ring-4 ring-rose-100 animate-pulse'
                            : 'bg-amber-500 ring-4 ring-amber-100'
                        }`}
                      />
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          isOnline ? 'text-emerald-700' : isOffline ? 'text-rose-700' : 'text-amber-700'
                        }`}
                      >
                        {isOnline ? 'Online' : isOffline ? 'Offline' : 'Degradado'}
                      </span>
                    </div>
                  </td>

                  {/* Name and URL */}
                  <td className="py-3 px-4">
                    <div className="truncate max-w-xs">
                      <span className="font-bold text-slate-900 block truncate">
                        {service.name}
                      </span>
                      <button
                        onClick={() => launch(service.url)}
                        className="text-[11px] font-mono text-teal-700 hover:underline truncate block text-left"
                      >
                        {service.url}
                      </button>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 font-semibold">
                      {service.category || 'General'}
                    </span>
                  </td>

                  {/* Latency */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                    {service.status === 'offline' ? '--' : `${service.last_response_time_ms} ms`}
                  </td>

                  {/* HTTP code */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono">
                    <span
                      className={`font-bold ${
                        service.last_status_code >= 200 && service.last_status_code < 400
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {service.last_status_code ? `${service.last_status_code}` : 'ERR'}
                    </span>
                  </td>

                  {/* Uptime % */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-emerald-700">
                    <div className="flex items-center gap-2">
                      <span>{service.uptime_percentage}%</span>
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${service.uptime_percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => launch(service.url)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition-colors cursor-pointer"
                        title="Abrir en navegador"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => copyUrl(service.url, service.id)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="Copiar URL"
                      >
                        {copiedId === service.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => checkNow(service.id)}
                        disabled={isChecking}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        title="Hacer ping ahora"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isChecking ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar "${service.name}" de SQLite?`)) {
                            onDelete(service.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
