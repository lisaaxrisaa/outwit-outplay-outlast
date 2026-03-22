import React from 'react';
import { CHALLENGE_META } from '../../lib/gameUtils';

export default function ImmunityIntroPhase({ immunityType, immunityCountdown }) {
  return (
    <section className="mx-auto max-w-3xl animate-fadeIn">
      <div className="rounded-3xl border border-amber-300/50 bg-gradient-to-br from-amber-900/35 via-yellow-900/20 to-black/70 p-8 text-center shadow-2xl shadow-amber-500/20">
        <div className="text-xs uppercase tracking-[0.22em] text-amber-200">Challenge Arena</div>
        <h2 className="mt-2 font-display text-6xl tracking-wide text-amber-100">⚡ Immunity Challenge</h2>
        <p className="mt-3 text-sm text-amber-100/90">{CHALLENGE_META[immunityType].intro}</p>
        <div className="mt-6 text-6xl font-bold text-yellow-200 animate-flicker">{Math.max(0, immunityCountdown)}</div>
        <div className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-300">Get Ready</div>
      </div>
    </section>
  );
}
