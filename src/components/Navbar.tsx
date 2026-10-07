import React from 'react';
import {
  Globe,
  Database,
  Plus,
  RefreshCw,
  Bot,
  Key,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { UserSession } from '../types';

interface NavbarProps {
  user: UserSession;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenHermesDrawer: () => void;
  onOpenApiModal: () => void;
  onRefreshAll: () => void;
  isCheckingAll: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onOpenAddModal,
  onOpenHermesDrawer,
  onOpenApiModal,
  onRefreshAll,
  isCheckingAll,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-white">
            <Globe className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 font-mono">
                HERMES<span className="text-emerald-600">://</span>LAUNCHPAD
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                <Database className="w-3 h-3 text-emerald-600" />
                <span>SQLite DB</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Panel central de URLs & Monitoreo de Salud con IA
            </p>
          </div>
        </div>

        {/* Center / Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh all */}
          <button
            onClick={onRefreshAll}
            disabled={isCheckingAll}
            title="Escanear estado de todas las URLs"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isCheckingAll ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">
              {isCheckingAll ? 'Escaneando...' : 'Verificar Todos'}
            </span>
          </button>

          {/* Add Service */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Agregar Programa</span>
            <span className="sm:hidden">Nuevo</span>
          </button>

          {/* Hermes Agent AI Trigger */}
          <button
            onClick={onOpenHermesDrawer}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold transition-all shadow-xs cursor-pointer relative"
          >
            <Bot className="w-4 h-4 text-purple-600" />
            <span className="hidden lg:inline">Hermes Agent IA</span>
            <span className="lg:hidden">Hermes</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600" />
            </span>
          </button>

          {/* API Docs & Key */}
          <button
            onClick={onOpenApiModal}
            title="API & Integración Externa"
            className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors shadow-xs cursor-pointer"
          >
            <Key className="w-4 h-4 text-amber-600" />
          </button>

          {/* User & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {user.username}
              </span>
              {user.isDemo ? (
                <span className="text-[10px] font-mono text-emerald-700 flex items-center justify-end gap-1 font-medium">
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
              className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
