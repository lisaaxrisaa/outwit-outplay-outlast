import React from 'react';

export default function ImmunityPepPhase({ immunityPepLoading, immunityPepTalk, setPhase }) {
  const canContinue = !immunityPepLoading && Boolean(immunityPepTalk.trim());

  return (
    <section className="mx-auto max-w-4xl animate-fadeIn">
      <div className="rounded-3xl border border-yellow-300/50 bg-black/75 p-10 text-center shadow-2xl shadow-yellow-500/20">
        <div className="text-xs uppercase tracking-[0.25em] text-yellow-200">Jeff</div>
        <h2 className="mt-2 font-display text-5xl tracking-wide text-yellow-100">Before We Begin</h2>
        <div className="mx-auto mt-6 min-h-[96px] max-w-3xl text-lg font-bold leading-relaxed text-yellow-100">
          {immunityPepLoading ? (
            <span className="text-yellow-100/85">Host briefing loading...</span>
          ) : (
            immunityPepTalk
          )}
        </div>
        <button
          type="button"
          onClick={() => setPhase('immunity_intro')}
          disabled={!canContinue}
          className="mt-8 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canContinue ? "Let's Go" : 'Loading Host Intro...'}
        </button>
      </div>
    </section>
  );
}
