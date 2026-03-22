import React from 'react';

export default function ImmunityPepPhase({ immunityPepLoading, immunityPepTalk, setPhase }) {
  return (
    <section className="mx-auto max-w-4xl animate-fadeIn">
      <div className="rounded-3xl border border-yellow-300/50 bg-black/75 p-10 text-center shadow-2xl shadow-yellow-500/20">
        <div className="text-xs uppercase tracking-[0.25em] text-yellow-200">Jeff</div>
        <h2 className="mt-2 font-display text-5xl tracking-wide text-yellow-100">Before We Begin</h2>
        <div className="mx-auto mt-6 max-w-3xl text-lg font-bold leading-relaxed text-yellow-100">
          {immunityPepLoading ? <span className="animate-flicker">Tonight, one challenge decides everything...</span> : immunityPepTalk}
        </div>
        <button
          onClick={() => setPhase('immunity_intro')}
          className="mt-8 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-6 py-3 text-sm font-bold text-zinc-950"
        >
          Let's Go
        </button>
      </div>
    </section>
  );
}
