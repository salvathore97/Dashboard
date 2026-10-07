import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Bot,
  Send,
  Terminal,
  RotateCcw,
} from 'lucide-react';
import { HermesChatMessage } from '../types';

interface HermesAgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshServices: () => Promise<void>;
}

const INITIAL_MESSAGES: HermesChatMessage[] = [
  {
    id: 'msg-init',
    role: 'assistant',
    content: `¡Hola! Soy Hermes Agent, tu asistente de DevOps e infraestructura para este Launchpad.

Puedo ayudarte a:
• Monitorear el estado de tus páginas (anillo verde si está activa, rojo si está caída).
• Agregar nuevas URLs directamente a la base de datos SQLite con prueba de ping en vivo.
• Analizar la latencia y estabilidad de tus programas.

¿Qué deseas verificar o agregar hoy?`,
    timestamp: new Date().toLocaleTimeString(),
  },
];

const SUGGESTED_PROMPTS = [
  '¿Cuál es el estado de mis programas?',
  '¿Cuántos servicios están caídos?',
  'Agrega https://linear.app con categoría Dev Tools',
  'Verifica la salud de todas las URLs ahora',
];

export const HermesAgentDrawer: React.FC<HermesAgentDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshServices,
}) => {
  const [messages, setMessages] = useState<HermesChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

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

      // If tools modified DB or checked services, refresh the parent dashboard
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

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-wide font-mono">
                HERMES AGENT // IA
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500">
              Conexión activa con SQLite y monitor HTTP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            title="Reiniciar conversación"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Cerrar panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Suggested chips */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto flex gap-1.5 text-xs no-scrollbar">
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
            className="flex-shrink-0 px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-emerald-700 text-[11px] font-medium transition-colors shadow-2xs cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mb-1 px-1">
              {msg.role === 'assistant' ? (
                <>
                  <Bot className="w-3 h-3 text-purple-600" />
                  <span className="font-semibold text-slate-700">Hermes Agent</span>
                </>
              ) : (
                <span className="font-semibold text-slate-700">Tú</span>
              )}
              <span>· {msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[90%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white font-medium rounded-tr-none shadow-xs'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-sans whitespace-pre-wrap shadow-xs'
              }`}
            >
              {msg.content}
            </div>

            {/* Display tool results if any */}
            {msg.toolResults && msg.toolResults.length > 0 && (
              <div className="mt-2 w-[90%] space-y-1.5">
                {msg.toolResults.map((tr, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-purple-50/80 border border-purple-200 text-[11px] font-mono text-purple-900 flex items-start gap-2 shadow-2xs"
                  >
                    <Terminal className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 overflow-hidden">
                      <span className="font-bold text-purple-900 uppercase text-[10px] block">
                        Acción ejecutada: {tr.tool}
                      </span>
                      {tr.result?.message && (
                        <p className="text-emerald-700 mt-0.5 font-medium">{tr.result.message}</p>
                      )}
                      {tr.result?.initialPing && (
                        <p className="text-slate-600 mt-0.5 text-[10px]">
                          Ping: {tr.result.initialPing.responseTimeMs}ms · Estado:{' '}
                          <span
                            className={
                              tr.result.initialPing.status === 'online'
                                ? 'text-emerald-700 font-bold'
                                : 'text-rose-700 font-bold'
                            }
                          >
                            {tr.result.initialPing.status.toUpperCase()}
                          </span>
                        </p>
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
            <span>Hermes Agent está procesando y consultando SQLite...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
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
            placeholder="Pídele a Hermes: 'Agrega https://...' o 'Verifica estado'"
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all disabled:opacity-40 cursor-pointer shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <span className="block text-[10px] text-slate-500 font-mono mt-1.5 text-center">
          Hermes Agent ejecuta herramientas reales sobre SQLite y pings HTTP en vivo.
        </span>
      </div>
    </div>
  );
};
