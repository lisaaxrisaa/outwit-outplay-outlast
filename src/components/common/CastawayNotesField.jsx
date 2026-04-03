import React from 'react';

export default function CastawayNotesField({
  castawayId,
  castawayName,
  note,
  onOpen,
  className = ''
}) {
  const safeNote = typeof note === 'string' ? note : '';
  const firstLine = safeNote.split(/\r?\n/)[0] || '';
  const placeholder = `Your read on ${castawayName}...`;
  const hasNote = safeNote.trim().length > 0;

  return (
    <div className={`mt-2 ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Private Notes</span>
        {hasNote && (
          <span className="rounded-full border border-emerald-400/30 bg-emerald-900/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
            Saved
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(castawayId);
        }}
        className={`mt-1 w-full rounded-lg border px-2 py-1.5 text-left text-xs transition ${
          hasNote
            ? 'border-emerald-500/40 bg-emerald-950/10 text-zinc-200'
            : 'border-zinc-700/70 bg-black/30 text-zinc-500/80 hover:border-zinc-600'
        }`}
      >
        <span className="block truncate">{hasNote ? firstLine : placeholder}</span>
      </button>
    </div>
  );
}
