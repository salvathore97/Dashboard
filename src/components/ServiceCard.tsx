import React, { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Clock,
  Zap,
  Shield,
  Activity,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { ServiceItem } from '../types';

interface ServiceCardProps {
  service: ServiceItem;
  onCheckSingle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (service: ServiceItem) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onCheckSingle,
  onDelete,
}) => {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(service.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCheckNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    try {
      await onCheckSingle(service.id);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`¿Seguro que deseas eliminar "${service.name}" de SQLite?`)) {
      setIsDeleting(true);
      try {
        await onDelete(service.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleOpenProgram = (e: React.MouseEvent) => {
    e.stopPropagation();
    let dest = service.url.trim();
    if (!dest.startsWith('http://') && !dest.startsWith('https://')) {
      dest = 'https://' + dest;
    }
    window.open(dest, '_blank', 'noopener,noreferrer');
  };

  // Ring styles in White Mode (Online = Green Ring, Offline = Red Ring)
  let ringClasses = '';
  let statusBadgeColor = '';
  let statusIcon = null;
  let statusLabel = '';

  if (service.status === 'online') {
    ringClasses = 'ring-2 ring-emerald-500 shadow-[0_4px_20px_-2px_rgba(16,185,129,0.25)] border-emerald-400 bg-white';
    statusBadgeColor = 'text-emerald-800 bg-emerald-50 border border-emerald-300';
    statusIcon = <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
    statusLabel = 'Activo (Online)';
  } else if (service.status === 'offline') {
    ringClasses = 'ring-2 ring-rose-500 shadow-[0_4px_24px_-2px_rgba(244,63,94,0.3)] border-rose-400 bg-white animate-[pulse_3s_infinite]';
    statusBadgeColor = 'text-rose-800 bg-rose-50 border border-rose-300';
    statusIcon = <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
    statusLabel = 'Caído (Offline)';
  } else if (service.status === 'degraded') {
    ringClasses = 'ring-2 ring-amber-500 shadow-[0_4px_18px_-2px_rgba(245,158,11,0.2)] border-amber-400 bg-white';
    statusBadgeColor = 'text-amber-800 bg-amber-50 border border-amber-300';
    statusIcon = <Activity className="w-3.5 h-3.5 text-amber-600" />;
    statusLabel = 'Lento / Degradado';
  } else {
    ringClasses = 'ring-2 ring-sky-500 shadow-[0_4px_16px_-2px_rgba(14,165,233,0.2)] border-sky-300 bg-white animate-pulse';
    statusBadgeColor = 'text-sky-800 bg-sky-50 border border-sky-300';
    statusIcon = <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />;
    statusLabel = 'Verificando...';
  }

  const getLastCheckedText = () => {
    if (!service.last_checked_at) return 'Pendiente';
    try {
      const diffMs = Date.now() - new Date(service.last_checked_at).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `Hace ${Math.max(1, diffSec)}s`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `Hace ${diffMin}m`;
      return `Hace ${Math.floor(diffMin / 60)}h`;
    } catch {
      return 'Reciente';
    }
  };

  const historyBars = service.history || [];

  return (
    <div
      className={`group relative rounded-2xl p-5 transition-all duration-300 hover:translate-y-[-2px] flex flex-col justify-between ${ringClasses}`}
    >
      {/* Top row: Category & Status */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="font-semibold text-slate-700 tracking-wide uppercase text-[11px]">
              {service.category || 'General'}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getLastCheckedText()}
            </span>
          </div>

          {/* Status badge */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold font-mono ${statusBadgeColor}`}>
            {statusIcon}
            <span>{statusLabel}</span>
          </div>
        </div>

        {/* Title and Launch button */}
        <div className="mb-2">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors flex items-center justify-between gap-2">
            <span className="truncate">{service.name}</span>
            <button
              onClick={handleOpenProgram}
              title="Abrir este programa en una nueva pestaña"
              className="flex-shrink-0 p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </h3>

          {service.description && (
            <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
              {service.description}
            </p>
          )}
        </div>

        {/* Clickable URL line */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 mb-4 group/url">
          <button
            onClick={handleOpenProgram}
            title={`Abrir ${service.url}`}
            className="flex-1 text-left text-xs font-mono text-teal-800 hover:text-teal-950 font-medium truncate cursor-pointer hover:underline"
          >
            {service.url}
          </button>
          <button
            onClick={handleCopyUrl}
            title="Copiar URL al portapapeles"
            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0 cursor-pointer"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Stability & Metrics Section */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        {/* Latency and HTTP Code */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="block text-[10px] text-slate-500 uppercase font-mono font-medium">Latencia</span>
            <span className="font-bold font-mono text-slate-900 flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-teal-600" />
              {service.status === 'offline' ? '--' : `${service.last_response_time_ms}ms`}
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="block text-[10px] text-slate-500 uppercase font-mono font-medium">Código</span>
            <span className={`font-bold font-mono ${
              service.last_status_code >= 200 && service.last_status_code < 400
                ? 'text-emerald-700'
                : 'text-rose-700'
            }`}>
              {service.last_status_code ? `${service.last_status_code}` : 'ERR'}
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="block text-[10px] text-slate-500 uppercase font-mono font-medium">Estabilidad</span>
            <span className="font-bold font-mono text-emerald-700 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" />
              {service.uptime_percentage}%
            </span>
          </div>
        </div>

        {/* Uptime Progress Bar */}
        <div>
          <div className="flex justify-between items-center text-[11px] font-mono mb-1">
            <span className="text-slate-600 font-medium">Salud del Servicio</span>
            <span className={`font-bold ${service.uptime_percentage > 95 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {service.uptime_percentage}% uptime
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                service.uptime_percentage >= 98
                  ? 'bg-emerald-500'
                  : service.uptime_percentage >= 85
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, service.uptime_percentage))}%` }}
            />
          </div>
        </div>

        {/* Latency History Sparkline Dots */}
        {historyBars.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
              <span>Historial reciente ({historyBars.length} pings)</span>
              <span>Tiempo real</span>
            </div>
            <div className="flex items-end gap-1 h-6 p-1 bg-slate-100 rounded-lg border border-slate-200">
              {historyBars.map((hist, idx) => {
                const isOnline = hist.status === 'online';
                const isDegraded = hist.status === 'degraded';
                const heightPercent = hist.status === 'offline' ? 30 : Math.min(100, Math.max(25, (hist.response_time_ms / 300) * 100));

                let barColor = 'bg-emerald-500';
                if (isDegraded) barColor = 'bg-amber-500';
                if (hist.status === 'offline') barColor = 'bg-rose-500';

                return (
                  <div
                    key={hist.id || idx}
                    title={`${new Date(hist.checked_at).toLocaleTimeString()}: ${hist.status} (${hist.response_time_ms}ms)`}
                    className="flex-1 flex flex-col justify-end h-full group/bar cursor-help"
                  >
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-sm transition-all ${barColor} group-hover/bar:brightness-110`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            onClick={handleOpenProgram}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir en Navegador</span>
          </button>

          <button
            onClick={handleCheckNow}
            disabled={isChecking}
            title="Hacer ping ahora"
            className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isChecking ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            title="Eliminar de SQLite"
            className="p-2 rounded-lg bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-300 hover:border-rose-300 transition-colors cursor-pointer shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
