import React from 'react';
import { CHALLENGE_META } from '../../lib/gameUtils';

export default function ImmunityResultPhase({ immunityResult, immunityType }) {
  if (!immunityResult) return null;
  return (
    <section className="mx-auto max-w-3xl animate-fadeIn">
      <div className="rounded-3xl border border-amber-300/45 bg-black/60 p-8 text-center">
        <h2 className="font-display text-5xl tracking-wide text-amber-100">
          {immunityResult.won
            ? '🏆 You won immunity'
            : immunityResult.castawayWinner
            ? `🏆 ${immunityResult.castawayWinner} wins immunity`
            : '💀 You lost immunity'}
        </h2>
        <p className="mt-3 text-sm text-zinc-200">
          {immunityResult.won
            ? 'You cannot be voted out tonight.'
            : immunityResult.castawayWinner
            ? `You are vulnerable. ${immunityResult.castawayWinner} is safe tonight.`
            : 'You are vulnerable at tribal council.'}
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          Time: {immunityResult.time}s / Par: {CHALLENGE_META[immunityType].par}s
        </p>
        <p className="mt-4 text-xs uppercase tracking-widest text-amber-200 animate-flicker">Heading back to camp...</p>
      </div>
    </section>
  );
}
