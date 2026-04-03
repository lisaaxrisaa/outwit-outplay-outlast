import React, { useEffect } from 'react';

export default function CastawayNotesModal({ castaway, note, onChange, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!castaway) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-amber-300/35 bg-zinc-950/95 p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">Private Notes</div>
            <h3 className="mt-1 text-2xl font-semibold text-zinc-100">{castaway.name}</h3>
            <p className="text-sm text-zinc-400">{castaway.occupation}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 bg-black/30 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-500"
          >
            Close
          </button>
        </div>

        <textarea
          value={note || ''}
          onChange={(e) => onChange(castaway.id, e.target.value)}
          placeholder={`Your read on ${castaway.name}...`}
          rows={12}
          className="mt-4 w-full resize-y rounded-xl border border-amber-300/35 bg-black/35 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500/80 outline-none transition focus:border-amber-300/65"
          autoFocus
        />

        <div className="mt-2 text-right text-[11px] text-zinc-400">Auto-saves as you type</div>
      </div>
    </div>
  );
}
