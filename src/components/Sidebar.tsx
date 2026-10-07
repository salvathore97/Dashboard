import React from 'react';
import {
  Globe,
  Rocket,
  BarChart3,
  AlertTriangle,
  Zap,
  Bot,
  Settings,
  Database,
  LogOut,
  Command,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { SidebarTab, UserSession, SystemStats } from '../types';

interface SidebarProps {
  currentTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  user: UserSession;
  onLogout: () => void;
  stats: SystemStats;
  onOpenCommandPalette: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  stats,
  onOpenCommandPalette,
}) => {
  const navItems = [
    {
      id: 'launchpad' as SidebarTab,
      label: 'Mis Programas',
      icon: Rocket,
      badge: stats.total > 0 ? stats.total : undefined,
      description: 'Grill cards con aro verde/rojo',
    },
    {
      id: 'analytics' as SidebarTab,
      label: 'Métricas & Uptime',
      icon: BarChart3,
      badge: `${stats.avgUptime}%`,
      badgeColor: 'text-emerald-700 bg-emerald-50',
      description: 'Estabilidad y latencia',
    },
    {
      id: 'incidents' as SidebarTab,
      label: 'Registro de Caídas',
      icon: AlertTriangle,
      badge: stats.offline > 0 ? stats.offline : undefined,
      badgeColor: 'text-rose-700 bg-rose-50 border border-rose-200',
      description: 'Log de fallos y downtime',
    },
    {
      id: 'inspector' as SidebarTab,
      label: 'Inspector HTTP / Ping',
      icon: Zap,
      description: 'Probar cualquier URL al vuelo',
    },
    {
      id: 'hermes_hub' as SidebarTab,
      label: 'Hermes AI Hub',
      icon: Bot,
      isAi: true,
      description: 'Agente y diagnósticos',
    },
    {
      id: 'settings' as SidebarTab,
      label: 'Ajustes & SQLite',
      icon: Settings,
      description: 'Backup DB, APIs y reglas',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-xs z-30 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Globe className="w-5 h-5 font-bold" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900 font-mono block">
              HERMES<span className="text-emerald-600">://</span>LAUNCHPAD
            </span>
            <span className="text-[11px] text-slate-500 block font-sans">
              DevOps & Status Manager
            </span>
          </div>
        </div>

        {/* Quick Launch Command Bar Button */}
        <div className="p-3">
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs transition-colors cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Command className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
              <span>Búsqueda Rápida...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group text-left ${
                  isActive
                    ? item.isAi
                      ? 'bg-purple-50 text-purple-900 border border-purple-200 shadow-xs font-bold'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? item.isAi
                          ? 'bg-purple-600 text-white'
                          : 'bg-emerald-600 text-white'
                        : item.isAi
                        ? 'text-purple-600 bg-purple-50'
                        : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block truncate">{item.label}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.badgeColor || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info & User */}
      <div className="p-3 border-t border-slate-100 space-y-2 bg-slate-50/50">
        {/* SQLite Database status card */}
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>dashboard.sqlite</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Base de datos local activa
          </span>
        </div>

        {/* User profile & Logout */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200">
          <div className="truncate mr-2">
            <span className="text-xs font-bold text-slate-800 block truncate leading-tight">
              {user.username}
            </span>
            {user.isDemo ? (
              <span className="text-[10px] font-mono text-emerald-700 flex items-center gap-1 font-semibold">
                <Sparkles className="w-2.5 h-2.5" />
                Modo Demo
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-500 uppercase">
                {user.role}
              </span>
            )}
          </div>

          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
