import React, { useState, useEffect, useRef } from 'react';
import { Search, ExternalLink, Globe, ArrowRight, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { ServiceItem } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  services,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = services.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.url.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          launchUrl(filtered[selectedIndex].url);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  const launchUrl = (url: string) => {
    let dest = url.trim();
    if (!dest.startsWith('http://') && !dest.startsWith('https://')) {
      dest = 'https://' + dest;
    }
    window.open(dest, '_blank', 'noopener,noreferrer');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col text-slate-900">
        {/* Search header */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/60">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Lanzador rápido: escribe el nombre o URL..."
            className="w-full bg-transparent border-none text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No se encontraron programas con "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isOnline = item.status === 'online';

              return (
                <div
                  key={item.id}
                  onClick={() => launchUrl(item.url)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-emerald-50 text-emerald-950' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        isOnline ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-rose-500 ring-2 ring-rose-300'
                      }`}
                    />
                    <div className="truncate">
                      <span className="font-bold text-xs text-slate-900 block truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 truncate block">
                        {item.url}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {item.category}
                    </span>
                    <button
                      className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                      title="Abrir"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>Usa ↑ ↓ para navegar · Enter para abrir</span>
          <span>Hermes Quick Launch</span>
        </div>
      </div>
    </div>
  );
};
