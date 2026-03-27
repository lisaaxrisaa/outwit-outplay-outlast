import React from 'react';

export default function GameSummaryPhase({ roundRecap, finalSummary, continueToEmail }) {
  return (
    <section className="animate-fadeIn space-y-5">
      <div className="rounded-2xl border border-amber-300/35 bg-black/45 p-5">
        <div className="text-xs uppercase tracking-[0.2em] text-amber-200">Season Recap</div>
        <h2 className="mt-2 font-display text-4xl tracking-wide text-amber-100">Two-Round Breakdown</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {roundRecap.map((round) => (
          <div key={`round-recap-${round.round}`} className="rounded-2xl border border-zinc-700/70 bg-black/40 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Round {round.round}</div>
            <div className="mt-2 text-lg font-semibold text-zinc-100">Eliminated: {round.eliminatedName || 'Unknown'}</div>
            <div className="mt-2 text-sm text-zinc-300">{round.note}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-300/30 bg-emerald-900/15 p-4 text-sm text-zinc-100">
        <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">Final Verdict</div>
        <div className="mt-2 whitespace-pre-wrap">{finalSummary}</div>
      </div>

      <button
        onClick={continueToEmail}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-3 text-sm font-bold text-zinc-950"
      >
        Continue
      </button>
    </section>
  );
}
