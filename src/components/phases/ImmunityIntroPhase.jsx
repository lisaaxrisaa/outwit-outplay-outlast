import React from 'react';
import { CHALLENGE_META } from '../../lib/gameUtils';

export default function ImmunityIntroPhase({ immunityType, startImmunityChallenge }) {
  return (
    <section className="mx-auto max-w-3xl animate-fadeIn">
      <div className="rounded-3xl border border-amber-300/50 bg-gradient-to-br from-amber-900/35 via-yellow-900/20 to-black/70 p-8 text-center shadow-2xl shadow-amber-500/20">
        <div className="text-xs uppercase tracking-[0.22em] text-amber-200">Challenge Arena</div>
        <h2 className="mt-2 font-display text-6xl tracking-wide text-amber-100">⚡ Immunity Challenge</h2>
        <div className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-300">Par Time {CHALLENGE_META[immunityType].par}s</div>
        <p className="mt-4 text-sm leading-7 text-amber-100/90">{CHALLENGE_META[immunityType].intro}</p>
        <button
          onClick={startImmunityChallenge}
          className="mt-8 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:brightness-105"
        >
          I&apos;m Ready — Start Challenge
        </button>
      </div>
    </section>
  );
}
