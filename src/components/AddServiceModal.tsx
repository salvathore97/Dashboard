import React, { useState } from 'react';
import { X, Plus, Globe, AlertCircle, Sparkles } from 'lucide-react';
import { ServiceItem } from '../types';

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServiceAdded: (newService: ServiceItem) => void;
}

const CATEGORIES = [
  'Dev Tools',
  'Producción',
  'AI / LLM',
  'APIs & Backend',
  'Bases de Datos',
  'Finanzas',
  'Cloud / Infra',
  'General',
];

const QUICK_PRESETS = [
  { name: 'Supabase Dashboard', url: 'https://supabase.com', category: 'Bases de Datos' },
  { name: 'Vercel Platform', url: 'https://vercel.com', category: 'Cloud / Infra' },
  { name: 'Stripe Developers', url: 'https://stripe.com', category: 'Finanzas' },
  { name: 'Anthropic Status', url: 'https://status.anthropic.com', category: 'AI / LLM' },
];

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  isOpen,
  onClose,
  onServiceAdded,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('Dev Tools');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError('El nombre y la URL son obligatorios');
      return;
    }

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: cleanUrl,
          category,
          description: description.trim(),
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el servicio');

      onServiceAdded(data.service);
      // Reset form & close
      setName('');
      setUrl('');
      setDescription('');
      setTagsInput('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (preset: { name: string; url: string; category: string }) => {
    setName(preset.name);
    setUrl(preset.url);
    setCategory(preset.category);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-900">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950 tracking-tight">
                Agregar Programa o URL
              </h2>
              <p className="text-xs text-slate-500">
                Se guardará en SQLite y se evaluará el anillo de salud en tiempo real.
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

        {/* Presets suggestions */}
        <div className="mb-4">
          <span className="text-[11px] font-mono text-slate-500 block mb-2 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            Prueba rápida con un preset:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 font-medium transition-colors cursor-pointer"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
              Nombre del Programa *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej. Panel de Ventas, Hugging Face, Servidor Auth"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
              URL Completa *
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mi-programa.com o http://localhost:3000"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
                Tags (separados por coma)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="api, backend, react"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 mb-1">
              Descripción Breve (opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Para qué sirve esta URL o qué sistema controla..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white resize-none transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Guardando & Haciendo Ping...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Guardar en SQLite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
