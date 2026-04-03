import React from 'react';

export default function Header({ phase, playerName, playerOccupation, onResetGame }) {
  return (
    <header className="mb-8 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider text-orange-300 sm:text-6xl">Outwit</h1>
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-300/90">A social deduction campfire strategy game</p>
        </div>
        {phase !== 'dev' && (
          <div className="flex items-center gap-2">
            {phase !== 'meet' && (
              <button
                type="button"
                onClick={onResetGame}
                className="rounded-lg border border-red-300/35 bg-red-900/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-red-100 transition hover:border-red-200/50 hover:bg-red-900/30"
              >
                Reset Game
              </button>
            )}
            <div className="rounded-lg border border-orange-300/20 bg-black/30 px-4 py-2 text-xs text-zinc-300">
              <div>
                Player: {playerName || 'Unknown'}
                {playerOccupation ? ` (${playerOccupation})` : ''}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
