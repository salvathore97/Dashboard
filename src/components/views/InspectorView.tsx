import React, { useState } from 'react';
import { Zap, ShieldCheck, ShieldAlert, Globe, ArrowRight, Plus, CheckCircle, Clock } from 'lucide-react';
import { InspectorResult, ServiceItem } from '../../types';

interface InspectorViewProps {
  onSaveToLaunchpad: (name: string, url: string) => void;
}

export const InspectorView: React.FC<InspectorViewProps> = ({ onSaveToLaunchpad }) => {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'HEAD'>('GET');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InspectorResult | null>(null);
  const [savedName, setSavedName] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const handleTestUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setResult(null);
    setJustSaved(false);

    try {
      const res = await fetch('/api/inspector/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), method }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          setResult(data);
          try {
            const parsed = new URL(data.url);
            const domain = parsed.hostname.replace('www.', '').split('.')[0];
            setSavedName(domain.charAt(0).toUpperCase() + domain.slice(1));
          } catch {
            setSavedName('Nuevo Servicio');
          }
          return;
        }
      }
      throw new Error('Servicio temporalmente inaccesible');
    } catch (err: any) {
      setResult({
        success: false,
        url,
        status: 0,
        statusText: 'Error',
        ok: false,
        durationMs: 0,
        protocol: 'HTTP',
        sslValid: false,
        headers: {},
        error: err?.message || 'Error de red',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSave = () => {
    if (!result || !savedName.trim()) return;
    onSaveToLaunchpad(savedName.trim(), result.url);
    setJustSaved(true);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Zap className="w-5 h-5 text-teal-600" />
          <span>Inspector HTTP & Diagnóstico de Conexión</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Prueba cualquier dirección web en tiempo real: mide latencia, inspecciona certificados SSL, cabeceras HTTP y códigos de estado.
        </p>
      </div>

      {/* Input Tester Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleTestUrl} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-teal-500 shrink-0"
            >
              <option value="GET">GET</option>
              <option value="HEAD">HEAD</option>
            </select>

            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ingresa cualquier URL (ej: https://api.github.com o tu backend)"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {loading ? (
                <span>Inspeccionando...</span>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Lanzar Ping</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
            <span>Pruebas sugeridas:</span>
            <button
              type="button"
              onClick={() => setUrl('https://api.github.com')}
              className="text-teal-700 hover:underline cursor-pointer"
            >
              GitHub API
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setUrl('https://1.1.1.1')}
              className="text-teal-700 hover:underline cursor-pointer"
            >
              Cloudflare 1.1.1.1
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setUrl('https://httpbin.org/status/404')}
              className="text-teal-700 hover:underline cursor-pointer"
            >
              Prueba 404
            </button>
          </div>
        </form>
      </div>

      {/* Results View */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in duration-200">
          {/* Status Header Banner */}
          <div
            className={`p-4 border-b flex items-center justify-between ${
              result.ok
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`p-2 rounded-xl text-white font-bold text-xs font-mono ${
                  result.ok ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {result.status || 'ERR'}
              </span>
              <div>
                <span className="font-bold text-sm block">
                  {result.ok ? 'Servidor Respondió Correctamente' : 'Error en la Petición'}
                </span>
                <span className="text-xs font-mono opacity-80">{result.url}</span>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="font-extrabold text-sm block">{result.durationMs} ms</span>
              <span className="opacity-75">Latencia total</span>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Seguridad SSL</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  {result.sslValid ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-mono">Válido (HTTPS)</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span className="text-rose-700 font-mono">Inseguro / No SSL</span>
                    </>
                  )}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Protocolo</span>
                <span className="font-bold font-mono text-slate-800 mt-0.5 block truncate">
                  {result.protocol}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Servidor Web</span>
                <span className="font-bold font-mono text-slate-800 mt-0.5 block truncate">
                  {result.server || 'Oculto'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-mono block">Content-Type</span>
                <span className="font-bold font-mono text-slate-800 mt-0.5 block truncate">
                  {result.contentType || 'Desconocido'}
                </span>
              </div>
            </div>

            {/* Quick Save to Launchpad Section */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-emerald-950 block">
                  ¿Deseas alojar este programa en tu Launchpad?
                </span>
                <span className="text-[11px] text-emerald-800 block">
                  Se guardará en la base de datos SQLite y se monitoreará con su anillo de salud.
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={savedName}
                  onChange={(e) => setSavedName(e.target.value)}
                  placeholder="Nombre de la app"
                  className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-800 w-full sm:w-40 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleQuickSave}
                  disabled={justSaved}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shrink-0 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {justSaved ? '¡Guardado!' : '+ Guardar'}
                </button>
              </div>
            </div>

            {/* Headers Viewer */}
            {Object.keys(result.headers).length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase font-mono block mb-2">
                  Cabeceras HTTP de Respuesta ({Object.keys(result.headers).length})
                </span>
                <div className="max-h-52 overflow-y-auto rounded-xl bg-slate-900 p-3 text-[11px] font-mono text-slate-300 space-y-1">
                  {Object.entries(result.headers).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-teal-400 font-semibold">{k}:</span>
                      <span className="text-slate-300 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
