/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Globe,
  Database,
  Bot,
  X,
  LayoutGrid,
  Table as TableIcon,
  Menu,
} from 'lucide-react';
import { ServiceItem, SystemStats, UserSession, SidebarTab } from './types';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { StatsOverview } from './components/StatsOverview';
import { ServiceCard } from './components/ServiceCard';
import { TableView } from './components/TableView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { IncidentsView } from './components/views/IncidentsView';
import { InspectorView } from './components/views/InspectorView';
import { HermesHubView } from './components/views/HermesHubView';
import { SettingsView } from './components/views/SettingsView';
import { AddServiceModal } from './components/AddServiceModal';
import { HermesAgentDrawer } from './components/HermesAgentDrawer';
import { ApiDocsModal } from './components/ApiDocsModal';
import { LoginScreen } from './components/LoginScreen';

const DEFAULT_STATS: SystemStats = {
  total: 0,
  online: 0,
  offline: 0,
  degraded: 0,
  checking: 0,
  avgLatency: 0,
  avgUptime: 100,
};

export default function App() {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      const stored = localStorage.getItem('hermes_user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentTab, setCurrentTab] = useState<SidebarTab>('launchpad');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [stats, setStats] = useState<SystemStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  // View style for launchpad: grid cards vs compact table
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'degraded'>('all');

  // Modals & Panels
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHermesOpen, setIsHermesOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // Sound and monitoring settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pingIntervalSec, setPingIntervalSec] = useState(30);

  const prevOfflineCount = useRef<number>(0);

  // Beep sound on service down
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(640, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  // Load services & stats with graceful error handling
  const fetchServicesAndStats = useCallback(async () => {
    try {
      const [resServices, resStats] = await Promise.all([
        fetch('/api/services').catch(() => null),
        fetch('/api/stats').catch(() => null),
      ]);

      if (resServices && resServices.ok) {
        const dataServices = await resServices.json().catch(() => null);
        if (dataServices && Array.isArray(dataServices.services)) {
          setServices(dataServices.services);
        }
      }
      if (resStats && resStats.ok) {
        const dataStats = await resStats.json().catch(() => null);
        if (dataStats && dataStats.stats) {
          const currentStats: SystemStats = dataStats.stats;
          // Trigger alert if new offline service appeared
          if (currentStats.offline > prevOfflineCount.current && prevOfflineCount.current > 0) {
            playAlertSound();
          }
          prevOfflineCount.current = currentStats.offline;
          setStats(currentStats);
        }
      }
    } catch {
      // Quiet recovery: will retry cleanly on the next cycle
    } finally {
      setLoading(false);
    }
  }, [playAlertSound]);

  useEffect(() => {
    if (user) {
      fetchServicesAndStats();
      const intervalMs = Math.max(10, pingIntervalSec) * 1000;
      const timer = setInterval(fetchServicesAndStats, intervalMs);
      return () => clearInterval(timer);
    }
  }, [user, pingIntervalSec, fetchServicesAndStats]);

  // Command palette shortcut (Cmd + K or Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLoginSuccess = (newUser: UserSession) => {
    setUser(newUser);
    try {
      localStorage.setItem('hermes_user_session', JSON.stringify(newUser));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('hermes_user_session');
    } catch {
      // ignore
    }
  };

  const handleCheckSingle = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}/check`, { method: 'POST' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data && data.service) {
          setServices((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...data.service } : s))
          );
        }
        const resStats = await fetch('/api/stats').catch(() => null);
        if (resStats && resStats.ok) {
          const statsData = await resStats.json().catch(() => null);
          if (statsData && statsData.stats) {
            setStats(statsData.stats);
          }
        }
      }
    } catch {
      // ignore error
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const res = await fetch(`/api/services/${id}`, { method: 'DELETE' }).catch(() => null);
      if (res && res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== id));
        fetchServicesAndStats();
      }
    } catch {
      // ignore error
    }
  };

  const handleRefreshAll = async () => {
    setIsCheckingAll(true);
    try {
      const res = await fetch('/api/services/check-all', { method: 'POST' }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          if (data.services) setServices(data.services);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch {
      // ignore error
    } finally {
      setIsCheckingAll(false);
    }
  };

  const handleServiceAdded = (newService: ServiceItem) => {
    setServices((prev) => [newService, ...prev]);
    fetchServicesAndStats();
  };

  const handleQuickSaveFromInspector = async (name: string, url: string) => {
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, category: 'Inspector' }),
      });
      const data = await res.json();
      if (data.service) {
        handleServiceAdded(data.service);
      }
    } catch (err) {
      console.error('Error saving from inspector:', err);
    }
  };

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesUrl = s.url.toLowerCase().includes(query);
        const matchesDesc = (s.description || '').toLowerCase().includes(query);
        const matchesCat = (s.category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesUrl && !matchesDesc && !matchesCat) {
          return false;
        }
      }

      if (selectedCategory !== 'all' && s.category !== selectedCategory) {
        return false;
      }

      if (statusFilter !== 'all' && s.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [services, searchQuery, selectedCategory, statusFilter]);

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Sidebar Desktop */}
      <div className="hidden md:block">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          user={user}
          onLogout={handleLogout}
          stats={stats}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-900/50 backdrop-blur-xs flex">
          <div className="w-64 bg-white h-full">
            <Sidebar
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              user={user}
              onLogout={handleLogout}
              stats={stats}
              onOpenCommandPalette={() => {
                setIsMobileSidebarOpen(false);
                setIsCommandPaletteOpen(true);
              }}
            />
          </div>
          <div
            className="flex-1"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 uppercase font-mono tracking-wider">
                {currentTab === 'launchpad' && '🚀 Mis Programas'}
                {currentTab === 'analytics' && '📊 Métricas & Uptime'}
                {currentTab === 'incidents' && '⚠️ Registro de Caídas'}
                {currentTab === 'inspector' && '⚡ Inspector HTTP'}
                {currentTab === 'hermes_hub' && '🤖 Hermes AI Hub'}
                {currentTab === 'settings' && '⚙️ Ajustes & SQLite'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick search button */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-mono transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar...</span>
              <kbd className="px-1 text-[10px] bg-white border border-slate-200 rounded">⌘K</kbd>
            </button>

            {/* Refresh all */}
            <button
              onClick={handleRefreshAll}
              disabled={isCheckingAll}
              title="Escanear estado de todas las URLs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isCheckingAll ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isCheckingAll ? 'Escaneando...' : 'Verificar Todos'}
              </span>
            </button>

            {/* Add program */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Agregar Programa</span>
              <span className="sm:hidden">Nuevo</span>
            </button>

            {/* Hermes Drawer Trigger */}
            <button
              onClick={() => setIsHermesOpen(true)}
              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors shadow-2xs cursor-pointer relative"
              title="Abrir Hermes Agent IA"
            >
              <Bot className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            </button>
          </div>
        </header>

        {/* Views Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {/* TAB: LAUNCHPAD */}
          {currentTab === 'launchpad' && (
            <div className="space-y-6">
              {/* Global Health Overview */}
              <StatsOverview stats={stats} />

              {/* Search, Filter Bar and View Switcher */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, URL, tag o categoría..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filters & Status Segmented Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category dropdown */}
                  {categories.length > 0 && (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">Todas las categorías ({services.length})</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Status segmented buttons */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        statusFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos ({services.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('online')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        statusFilter === 'online'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Activos ({services.filter((s) => s.status === 'online').length})</span>
                    </button>
                    <button
                      onClick={() => setStatusFilter('offline')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        statusFilter === 'offline'
                          ? 'bg-rose-50 text-rose-800 border border-rose-300 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-rose-700'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>Caídos ({services.filter((s) => s.status === 'offline').length})</span>
                    </button>
                  </div>

                  {/* View Mode Toggle (Grid vs Table) */}
                  <div className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs">
                    <button
                      onClick={() => setViewMode('grid')}
                      title="Vista Grill Cards (con Aros)"
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      title="Vista Tabla Compacta"
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        viewMode === 'table'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <TableIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Services Rendering */}
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Cargando programas desde SQLite...</p>
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-slate-300 bg-white shadow-xs">
                  <Globe className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">
                    No se encontraron programas
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                    {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
                      ? 'Ningún programa coincide con los filtros de búsqueda actuales.'
                      : 'Aún no has registrado ninguna URL en la base de datos SQLite.'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    {(searchQuery || selectedCategory !== 'all' || statusFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setStatusFilter('all');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 cursor-pointer border border-slate-200"
                      >
                        Limpiar Filtros
                      </button>
                    )}
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Agregar Primer Programa</span>
                    </button>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onCheckSingle={handleCheckSingle}
                      onDelete={handleDeleteService}
                    />
                  ))}
                </div>
              ) : (
                <TableView
                  services={filteredServices}
                  onCheckSingle={handleCheckSingle}
                  onDelete={handleDeleteService}
                />
              )}
            </div>
          )}

          {/* TAB: ANALYTICS */}
          {currentTab === 'analytics' && (
            <AnalyticsView services={services} stats={stats} />
          )}

          {/* TAB: INCIDENTS */}
          {currentTab === 'incidents' && (
            <IncidentsView onCheckService={handleCheckSingle} />
          )}

          {/* TAB: INSPECTOR */}
          {currentTab === 'inspector' && (
            <InspectorView onSaveToLaunchpad={handleQuickSaveFromInspector} />
          )}

          {/* TAB: HERMES HUB */}
          {currentTab === 'hermes_hub' && (
            <HermesHubView
              services={services}
              onRefreshServices={fetchServicesAndStats}
            />
          )}

          {/* TAB: SETTINGS */}
          {currentTab === 'settings' && (
            <SettingsView
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled((prev) => !prev)}
              pingIntervalSec={pingIntervalSec}
              onChangePingInterval={setPingIntervalSec}
              onRefreshData={fetchServicesAndStats}
            />
          )}
        </main>
      </div>

      {/* Modals & Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        services={services}
      />

      <AddServiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onServiceAdded={handleServiceAdded}
      />

      <HermesAgentDrawer
        isOpen={isHermesOpen}
        onClose={() => setIsHermesOpen(false)}
        onRefreshServices={fetchServicesAndStats}
      />

      <ApiDocsModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />
    </div>
  );
}
