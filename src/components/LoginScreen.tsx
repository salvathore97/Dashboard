import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Terminal, ArrowRight, Database, Activity, Lock } from 'lucide-react';
import { UserSession } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<{ allowDemo: boolean; defaultAdminUser: string }>({
    allowDemo: true,
    defaultAdminUser: 'admin',
  });

  useEffect(() => {
    fetch('/api/auth/config')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.allowDemo === 'boolean') {
          setAuthConfig(data);
          if (!username && data.defaultAdminUser) {
            setUsername(data.defaultAdminUser);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales inválidas');

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar demo');

      onLoginSuccess(data.user);
    } catch (err: any) {
      // Fallback local demo session
      onLoginSuccess({
        id: 'usr-demo-local',
        username: 'Invitado Demo',
        role: 'demo',
        isDemo: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Background ambient lighting in light mode */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-200/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f080_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f080_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-white border border-slate-200 mb-4 shadow-sm text-xs font-mono text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>HERMES SYSTEM v1.4</span>
            <span className="text-slate-300">·</span>
            <span>SQLITE READY</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 flex items-center justify-center gap-3">
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Hermes Launchpad
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Dashboard para alojar tus URLs, con anillos de salud en tiempo real, base de datos SQLite y agente IA Hermes.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 relative">
          {/* Quick Demo Mode Banner (only if demo is enabled) */}
          {authConfig.allowDemo && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-emerald-50 via-white to-cyan-50 border border-emerald-200 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-slate-900">¿Quieres probar sin registrarte?</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-300">
                  Demo Activo
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Ingresa al instante en Modo Demo con programas precargados, estado de anillo verde/rojo y asistente Hermes listo.
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
              >
                <span>Entrar con Modo Demo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {authConfig.allowDemo && (
            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-4 text-xs uppercase font-mono text-slate-500 tracking-wider">
                O Acceso con Credenciales
              </span>
              <div className="flex-grow border-t border-slate-200" />
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5 font-mono flex items-center justify-between">
                <span>Usuario</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Configurado en variables de entorno
                </span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={authConfig.defaultAdminUser || 'admin'}
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-slate-700 font-mono">
                  Contraseña
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  Variable ADMIN_PASSWORD
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all font-mono"
              />
            </div>

            {/* Quick credential helper badge */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div className="font-mono text-[11px]">
                <span className="text-slate-400">Credenciales por defecto: </span>
                <span className="font-semibold text-slate-800">admin</span> / <span className="font-semibold text-slate-800">admin123</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsername(authConfig.defaultAdminUser || 'admin');
                  setPassword('admin123');
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer ml-2"
              >
                Rellenar
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-slate-300" />
              <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
            </button>
          </form>

          {/* Quick Features List */}
          <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <Database className="w-4 h-4 text-emerald-600 mb-1" />
              <span className="text-[11px] text-slate-800 font-medium">SQLite DB</span>
              <span className="text-[10px] text-slate-500">Volumen persistente</span>
            </div>
            <div className="flex flex-col items-center">
              <Activity className="w-4 h-4 text-teal-600 mb-1" />
              <span className="text-[11px] text-slate-800 font-medium">Anillo de Salud</span>
              <span className="text-[10px] text-slate-500">Verde o Rojo</span>
            </div>
            <div className="flex flex-col items-center">
              <Terminal className="w-4 h-4 text-purple-600 mb-1" />
              <span className="text-[11px] text-slate-800 font-medium">Coolify Ready</span>
              <span className="text-[10px] text-slate-500">Docker + Env Vars</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6 font-mono">
          Hermes Launchpad · Despliegue listo para Coolify y GitHub
        </p>
      </div>
    </div>
  );
};
