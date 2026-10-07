import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Download,
  Key,
  Copy,
  Check,
  Bell,
  Volume2,
  VolumeX,
  FileCode,
  Shield,
  Clock,
  Users,
  Server,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { ApiKeyItem, UserItem } from '../../types';

interface SettingsViewProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  pingIntervalSec: number;
  onChangePingInterval: (sec: number) => void;
  onRefreshData?: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  soundEnabled,
  onToggleSound,
  pingIntervalSec,
  onChangePingInterval,
  onRefreshData,
}) => {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users').catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.users) setUsers(data.users);
      }
    } catch {
      // fallback
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) return;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: userRole,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUsers((prev) => [...prev.filter((u) => u.username !== data.user.username), data.user]);
        setNewUsername('');
        setNewPassword('');
        setUserMessage(`Usuario ${data.user.username} guardado exitosamente en SQLite.`);
        setTimeout(() => setUserMessage(null), 4000);
      } else {
        setUserMessage(data.error || 'Error al crear usuario');
      }
    } catch (err: any) {
      setUserMessage(err?.message || 'Error de conexión');
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/keys').catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.keys) setKeys(data.keys);
      }
    } catch {
      // fallback
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.key) {
          setKeys((prev) => [data.key, ...prev]);
          setNewKeyName('');
        }
      }
    } catch {
      // fallback
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportJson = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/database/export');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hermes-launchpad-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWipeServices = async () => {
    if (!window.confirm('¿Seguro que deseas vaciar todas las tablas de servicios e historial en SQLite? La base de datos quedará completamente limpia y vacía.')) {
      return;
    }
    setIsWiping(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/database/wipe-services', { method: 'POST' }).catch(() => null);
      if (res && res.ok) {
        setStatusNotice('Base de datos SQLite limpiada. Todas las tablas de programas están vacías.');
        if (onRefreshData) await onRefreshData();
      }
    } finally {
      setIsWiping(false);
    }
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    setStatusNotice(null);
    try {
      const res = await fetch('/api/database/seed-demo', { method: 'POST' }).catch(() => null);
      if (res && res.ok) {
        setStatusNotice('Datos de demostración agregados a SQLite con éxito.');
        if (onRefreshData) await onRefreshData();
      }
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          <span>Ajustes & Gestión de Base de Datos SQLite</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Configura intervalos de monitoreo, descargas de copia de seguridad de SQLite y autenticación API.
        </p>
      </div>

      {/* Database Backup Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 mb-4">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Copia de Seguridad & Exportación SQLite
            </h3>
            <p className="text-xs text-slate-500">
              Tus URLs y registros están almacenados localmente en <code className="text-slate-800 font-semibold">data/dashboard.sqlite</code>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block mb-1">
                Descargar Base de Datos .sqlite
              </span>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Descarga el archivo binario SQLite 3 nativo para abrirlo en DB Browser for SQLite, DBeaver o restaurarlo.
              </p>
            </div>
            <a
              href="/api/database/download"
              download="dashboard.sqlite"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Descargar .sqlite</span>
            </a>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block mb-1">
                Exportar Respaldo en Formato JSON
              </span>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Exporta todas tus URLs, categorías, notas de estabilidad y métricas en un archivo JSON estructurado.
              </p>
            </div>
            <button
              onClick={handleExportJson}
              disabled={isExporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <FileCode className="w-4 h-4" />
              <span>{isExporting ? 'Exportando...' : 'Exportar JSON'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table State & Migrations Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Migraciones & Estado de Tablas SQLite</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Esquema de base de datos migrado automáticamente (versión 1). Puedes vaciar las tablas para iniciar limpio.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold shrink-0 self-start sm:self-auto">
            Schema v1 · Migrado
          </span>
        </div>

        {statusNotice && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
            <span>{statusNotice}</span>
            <button onClick={() => setStatusNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">×</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block mb-1">
                Vaciar Tablas (SQLite Limpia y Vacía)
              </span>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Elimina todos los programas e historial para que la base de datos quede 100% vacía para tus URLs personales.
              </p>
            </div>
            <button
              onClick={handleWipeServices}
              disabled={isWiping}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <span>{isWiping ? 'Limpiando...' : 'Vaciar Todas las Tablas'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 block mb-1">
                Cargar Datos de Ejemplo (Demo)
              </span>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Agrega programas de muestra (GitHub, Google, Cloudflare, etc.) con datos de latencia para probar el dashboard.
              </p>
            </div>
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span>{isSeeding ? 'Cargando...' : 'Cargar URLs de Prueba'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monitoring & Alerts Preferences */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-600" />
          <span>Frecuencia & Preferencias de Alerta</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-mono">
              Intervalo de Chequeo Automático
            </label>
            <select
              value={pingIntervalSec}
              onChange={(e) => onChangePingInterval(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
            >
              <option value={15}>Cada 15 segundos (Alta frecuencia)</option>
              <option value={30}>Cada 30 segundos (Recomendado)</option>
              <option value={60}>Cada 1 minuto</option>
              <option value={300}>Cada 5 minutos</option>
            </select>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Frecuencia con la que el servidor comprueba el estado de las URLs en segundo plano.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 font-mono">
              Notificación Sonora de Caída
            </label>
            <button
              type="button"
              onClick={onToggleSound}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                soundEnabled
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-slate-50 border-slate-300 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                )}
                <span>Alerta sonora en el navegador</span>
              </div>
              <span className="text-[11px] font-mono uppercase">
                {soundEnabled ? 'Activado' : 'Silenciado'}
              </span>
            </button>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Emite un aviso sonoro discreto cuando un servicio pase a anillo rojo (offline).
            </span>
          </div>
        </div>
      </div>

      {/* API Keys Box */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-amber-500" />
          <span>Claves API de Hermes Agent</span>
        </h3>

        <div className="space-y-2 mb-4">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
            >
              <div className="truncate flex-1">
                <span className="text-slate-800 font-bold">{k.name}: </span>
                <span className="text-amber-700 font-medium">{k.key}</span>
              </div>
              <button
                onClick={() => copyToClipboard(k.key, k.id)}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Copiar clave"
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

        <form onSubmit={handleCreateKey} className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Nombre para nueva clave API (ej. Script en VPS)"
            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={!newKeyName.trim()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
          >
            + Crear Clave
          </button>
        </form>
      </div>

      {/* Users Management in SQLite */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Usuarios & Credenciales en SQLite</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700 font-bold border border-slate-200">
            {users.length} {users.length === 1 ? 'Usuario' : 'Usuarios'}
          </span>
        </div>

        {userMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
            {userMessage}
          </div>
        )}

        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-bold text-slate-900">{u.username}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold">
                  {u.role}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Creado: {new Date(u.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleCreateUser} className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Nuevo Usuario"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Contraseña"
            className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as any)}
            className="px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
          >
            <option value="user">Rol: user</option>
            <option value="admin">Rol: admin</option>
          </select>
          <button
            type="submit"
            disabled={!newUsername.trim() || !newPassword.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
          >
            + Guardar en SQLite
          </button>
        </form>
      </div>

      {/* Coolify / Docker Deployment Reference Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Variables de Entorno para Coolify / Docker</h3>
          </div>
          <button
            onClick={() => {
              const envText = `ADMIN_USERNAME=admin\nADMIN_PASSWORD=admin123\nALLOW_DEMO=false\nSEED_DEMO_DATA=false\nDATA_DIR=/app/data\nDATABASE_PATH=/app/data/dashboard.sqlite\nPORT=3000\nGEMINI_API_KEY=\n`;
              navigator.clipboard.writeText(envText);
              setCopiedEnv(true);
              setTimeout(() => setCopiedEnv(false), 2000);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition-colors cursor-pointer"
          >
            {copiedEnv ? <Check className="w-3.5 h-3.5 text-teal-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEnv ? '¡Copiado!' : 'Copiar Variables'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Para desplegar en <strong>Coolify</strong> desde GitHub con persistencia total en SQLite:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">1. Volumen Persistente</span>
            <div className="text-slate-800 font-semibold">Destination: <span className="text-emerald-700">/app/data</span></div>
            <div className="text-[11px] text-slate-500 font-sans">Asegura que tu base de datos SQLite no se borre en actualizaciones.</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">2. Puerto Interno</span>
            <div className="text-slate-800 font-semibold">Port: <span className="text-emerald-700">3000</span></div>
            <div className="text-[11px] text-slate-500 font-sans">Coolify enruta el dominio o subdominio con SSL automático a este puerto.</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto space-y-1">
          <div className="text-slate-400 text-[11px] mb-2 font-sans font-semibold">Variables recomendadas en Coolify:</div>
          <div><span className="text-cyan-400">ADMIN_USERNAME</span>=<span className="text-amber-300">"admin"</span></div>
          <div><span className="text-cyan-400">ADMIN_PASSWORD</span>=<span className="text-amber-300">"admin123"</span> <span className="text-slate-500"># Cámbiala por tu clave privada</span></div>
          <div><span className="text-cyan-400">ALLOW_DEMO</span>=<span className="text-amber-300">"false"</span> <span className="text-slate-500"># Desactiva el modo demo en producción</span></div>
          <div><span className="text-cyan-400">SEED_DEMO_DATA</span>=<span className="text-amber-300">"false"</span> <span className="text-slate-500"># Tablas SQLite 100% vacías</span></div>
          <div><span className="text-cyan-400">DATA_DIR</span>=<span className="text-amber-300">"/app/data"</span></div>
          <div><span className="text-cyan-400">DATABASE_PATH</span>=<span className="text-amber-300">"/app/data/dashboard.sqlite"</span></div>
          <div><span className="text-cyan-400">PORT</span>=<span className="text-amber-300">"3000"</span></div>
        </div>
      </div>
    </div>
  );
};
