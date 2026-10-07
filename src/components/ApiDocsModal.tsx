import React, { useState, useEffect } from 'react';
import { X, Key, Copy, Check, Plus } from 'lucide-react';
import { ApiKeyItem } from '../types';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'endpoints' | 'curl' | 'tools'>('endpoints');

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
    }
  }, [isOpen]);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      if (data.keys) setKeys(data.keys);
    } catch {
      // fallback
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (data.key) {
        setKeys((prev) => [data.key, ...prev]);
        setNewKeyName('');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const sampleKey = keys[0]?.key || 'hermes_sk_live_99f381ad792e4c81a';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                API para Hermes Agent & Conexión Externa
              </h2>
              <p className="text-xs text-slate-500">
                Conecta tu IA externa (Hermes Agent, LangChain, CLI o scripts) a este dashboard y SQLite.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('endpoints')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'endpoints'
                ? 'bg-slate-100 text-emerald-700 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Endpoints REST
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'curl'
                ? 'bg-slate-100 text-emerald-700 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ejemplos cURL & Python
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-slate-100 text-emerald-700 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Definición de Tools IA
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* API Keys Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase font-mono block mb-2 flex items-center justify-between">
              <span>Tus Claves de API Hermes</span>
              <span className="text-[10px] text-emerald-700 font-semibold lowercase">Autenticación Bearer</span>
            </span>

            <div className="space-y-2 mb-3">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono shadow-2xs"
                >
                  <div className="truncate flex-1">
                    <span className="text-slate-700 font-semibold">{k.name}: </span>
                    <span className="text-amber-700 font-medium">{k.key}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(k.key, k.id)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    {copiedKey === k.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Create new key */}
            <form onSubmit={handleCreateKey} className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Nombre de clave (ej. Mi Hermes Agent Local)"
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={isGenerating || !newKeyName.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 shadow-xs"
              >
                + Generar Clave
              </button>
            </form>
          </div>

          {activeTab === 'endpoints' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    GET
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">/api/hermes/v1/services</span>
                </div>
                <p className="text-xs text-slate-600">
                  Devuelve todos los programas registrados, con su estado (online/offline), latencia y estabilidad en SQLite.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                    POST
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">/api/hermes/v1/services</span>
                </div>
                <p className="text-xs text-slate-600 mb-2">
                  Permite al agente IA registrar una nueva URL o programa y disparar el ping de validación inmediata.
                </p>
                <pre className="text-[11px] font-mono p-2.5 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto">
{`{
  "name": "Grafana Monitor",
  "url": "https://grafana.com",
  "category": "Infraestructura",
  "description": "Panel de métricas"
}`}
                </pre>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    GET
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-800">/api/hermes/v1/status</span>
                </div>
                <p className="text-xs text-slate-600">
                  Resumen de estado global: cantidad de activos, caídos, latencia promedio y porcentaje de estabilidad.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'curl' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono font-bold text-slate-700 block mb-1">
                  Consultar estado con cURL:
                </span>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800">
{`curl -X GET "${currentHost}/api/hermes/v1/status" \\
  -H "Authorization: Bearer ${sampleKey}"`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`curl -X GET "${currentHost}/api/hermes/v1/status" -H "Authorization: Bearer ${sampleKey}"`, 'curl-1')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {copiedKey === 'curl-1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono font-bold text-slate-700 block mb-1">
                  Pedirle a Hermes que agregue una página (cURL):
                </span>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800">
{`curl -X POST "${currentHost}/api/hermes/v1/services" \\
  -H "Authorization: Bearer ${sampleKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "API de Pagos", "url": "https://stripe.com", "category": "Finanzas"}'`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`curl -X POST "${currentHost}/api/hermes/v1/services" -H "Authorization: Bearer ${sampleKey}" -H "Content-Type: application/json" -d '{"name": "API de Pagos", "url": "https://stripe.com", "category": "Finanzas"}'`, 'curl-2')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {copiedKey === 'curl-2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tools' && (
            <div>
              <p className="text-xs text-slate-600 mb-2">
                Esta especificación JSON describe las herramientas que puedes pasar a tu Hermes Agent (o a cualquier agente con soporte de function calling) para que interactúe autónomamente con este Launchpad:
              </p>
              <pre className="p-3 rounded-lg bg-slate-900 text-purple-300 font-mono text-[11px] overflow-x-auto border border-slate-800 max-h-60">
{`{
  "tools": [
    {
      "name": "list_services",
      "description": "Lista servicios en SQLite con estado y latencia"
    },
    {
      "name": "add_service",
      "description": "Guarda una URL en SQLite y ejecuta ping de salud"
    },
    {
      "name": "check_service_status",
      "description": "Verifica si una URL está activa o caída"
    },
    {
      "name": "get_system_status",
      "description": "Resumen de servicios activos vs caídos"
    }
  ]
}`}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
