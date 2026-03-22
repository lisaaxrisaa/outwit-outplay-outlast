import React from 'react';
import { MODEL } from '../../lib/gameUtils';

export default function Header({ phase, playerName, playerOccupation }) {
  return (
    <header className="mb-8 animate-fadeIn">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl tracking-wider text-orange-300 sm:text-6xl">Outwit</h1>
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-300/90">A social deduction campfire built on Claude</p>
        </div>
        {phase !== 'dev' && (
          <div className="rounded-lg border border-orange-300/20 bg-black/30 px-4 py-2 text-xs text-zinc-300">
            <div>
              Player: {playerName || 'Unknown'}
              {playerOccupation ? ` (${playerOccupation})` : ''}
            </div>
            <div>Model: {MODEL}</div>
          </div>
        )}
      </div>
    </header>
  );
}
