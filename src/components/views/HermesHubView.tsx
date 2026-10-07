import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Terminal, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Code, Copy, Check } from 'lucide-react';
import { HermesChatMessage, ServiceItem } from '../../types';

interface HermesHubViewProps {
  services: ServiceItem[];
  onRefreshServices: () => Promise<void>;
}

export const HermesHubView: React.FC<HermesHubViewProps> = ({ services, onRefreshServices }) => {
  const [messages, setMessages] = useState<HermesChatMessage[]>([
    {
      id: 'hub-msg-1',
      role: 'assistant',
      content: `¡Bienvenido al centro de mando de Hermes Agent! 
Aquí puedo ayudarte con:
1. Auditorías de estabilidad en vivo.
2. Añadir y verificar URLs directamente en tu base de datos SQLite.
3. Generar scripts en Python/Bash para automatizar tus chequeos desde tu servidor.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: HermesChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyForApi = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyForApi,
        }),
      }).catch(() => null);

      if (!res || !res.ok) {
        throw new Error('Servidor temporalmente no disponible');
      }

      const data = await res.json().catch(() => ({ reply: 'No se pudo leer la respuesta' }));

      const botMsg: HermesChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString(),
        toolResults: data.toolResults || [],
      };

      setMessages((prev) => [...prev, botMsg]);
      if (data.toolResults && data.toolResults.length > 0) {
        await onRefreshServices();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: `Error al comunicar con Hermes Agent: ${err?.message || 'Error de conexión'}.`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const samplePythonScript = `import requests

HERMES_API_URL = "http://localhost:3000/api/hermes/v1/services"
HERMES_API_KEY = "hermes_sk_live_99f381ad792e4c81a"

# Registrar un nuevo servicio automáticamente en SQLite
response = requests.post(
    HERMES_API_URL,
    headers={"Authorization": f"Bearer {HERMES_API_KEY}"},
    json={
        "name": "Mi Microservicio Docker",
        "url": "http://localhost:8080/health",
        "category": "Infraestructura"
    }
)

print("Respuesta de Hermes Launchpad:", response.json())
`;

  const copyScript = () => {
    navigator.clipboard.writeText(samplePythonScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-600" />
          <span>Hermes AI Hub // Consola Autónoma</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Asistente inteligente con herramientas para consultar SQLite, ejecutar pings automáticos y gestionar infraestructura.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[580px] overflow-hidden">
          {/* Top Bar with Quick Prompts */}
          <div className="p-3 border-b border-slate-200 bg-purple-50/40 flex items-center justify-between gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-purple-900 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              Acciones Rápidas:
            </span>
            <button
              onClick={() => handleSendMessage('Haz una auditoría completa del sistema y dime qué está caído.')}
              className="px-2.5 py-1 rounded-md bg-white border border-purple-200 text-purple-800 text-[11px] font-medium hover:bg-purple-100 transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              Auditoría General
            </button>
            <button
              onClick={() => handleSendMessage('¿Cuál es la latencia promedio de todos los servicios?')}
              className="px-2.5 py-1 rounded-md bg-white border border-purple-200 text-purple-800 text-[11px] font-medium hover:bg-purple-100 transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              Reporte de Latencia
            </button>
            <button
              onClick={() => handleSendMessage('Verifica todos los programas ahora mismo.')}
              className="px-2.5 py-1 rounded-md bg-white border border-purple-200 text-purple-800 text-[11px] font-medium hover:bg-purple-100 transition-colors shrink-0 shadow-2xs cursor-pointer"
            >
              Ping a Todos
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mb-1">
                  {m.role === 'assistant' ? (
                    <>
                      <Bot className="w-3 h-3 text-purple-600" />
                      <span className="font-semibold text-slate-700">Hermes Agent</span>
                    </>
                  ) : (
                    <span className="font-semibold text-slate-700">Tú</span>
                  )}
                  <span>· {m.timestamp}</span>
                </div>

                <div
                  className={`max-w-[90%] rounded-xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white font-medium rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-sans'
                  }`}
                >
                  {m.content}
                </div>

                {/* Tool calls */}
                {m.toolResults && m.toolResults.length > 0 && (
                  <div className="mt-2 w-[90%] space-y-1.5">
                    {m.toolResults.map((tr, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-[11px] font-mono text-purple-900 flex items-start gap-2"
                      >
                        <Terminal className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-bold uppercase text-[10px] block">
                            Herramienta: {tr.tool}
                          </span>
                          {tr.result?.message && (
                            <span className="text-emerald-700 block mt-0.5 font-medium">
                              {tr.result.message}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-purple-700 font-mono p-3 bg-purple-50 rounded-xl border border-purple-200">
                <Bot className="w-4 h-4 animate-spin text-purple-600" />
                <span>Hermes Agent ejecutando herramientas sobre SQLite...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder="Pídele a Hermes: 'Agrega https://...' o '¿Qué páginas están lentas?'"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all shadow-xs cursor-pointer disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Script & Automations Column (1 Column) */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Code className="w-4 h-4 text-purple-600" />
              <span>Automatización con Python</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Usa este script en tu servidor para que reporte automáticamente el estado de tus contenedores o APIs a Hermes Launchpad.
            </p>

            <div className="relative">
              <pre className="p-3 rounded-xl bg-slate-900 text-purple-300 font-mono text-[11px] overflow-x-auto max-h-64 border border-slate-800">
                {samplePythonScript}
              </pre>
              <button
                onClick={copyScript}
                className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                title="Copiar código"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Estado del Agente</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Conexión activa con el motor SQLite y ejecutor de peticiones HTTP en tiempo real.
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Motor IA:</span>
                <span className="font-bold text-slate-800">Gemini 3.8 Flash / Hermes</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Base de Datos:</span>
                <span className="font-bold text-emerald-700">dashboard.sqlite (Activa)</span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500">Modo de Chequeo:</span>
                <span className="font-bold text-teal-700">HTTP Pings Directos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
