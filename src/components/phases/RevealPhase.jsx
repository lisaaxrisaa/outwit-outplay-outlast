import React from 'react';

export default function RevealPhase({ revealLoading, revealData, castaways, setPhase }) {
  return (
    <section className="animate-fadeIn">
      <div className="mx-auto max-w-5xl rounded-3xl border border-amber-300/30 dossier p-6 sm:p-8">
        <h2 className="font-display text-5xl tracking-wider text-amber-200">Truth Revealed</h2>

        {revealLoading && (
          <div className="mt-5 rounded-xl border border-zinc-700/70 bg-black/45 p-4 text-sm text-zinc-300 animate-flicker">
            Opening sealed tribal dossier...
          </div>
        )}

        {!revealLoading && revealData && (
          <div className="mt-5 space-y-6">
            <div className="rounded-2xl border border-amber-200/25 bg-black/40 p-4 text-sm leading-relaxed text-zinc-200">{revealData.narrative}</div>

            <div>
              <h3 className="mb-3 text-xl font-semibold text-orange-200">Hidden Agendas Exposed</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {castaways.map((c) => (
                  <div key={c.id} className="rounded-xl border border-zinc-700/70 bg-black/35 p-4">
                    <div className="text-sm font-semibold text-zinc-100">{c.name}</div>
                    <div className="mt-1 text-sm text-zinc-300">{c.hiddenAgenda}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-semibold text-orange-200">Secret Alliances Laid Bare</h3>
              <div className="space-y-2">
                {revealData.alliancesExposed.length > 0 ? (
                  revealData.alliancesExposed.map((a, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-700/70 bg-black/35 p-3 text-sm text-zinc-200">
                      {a}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-zinc-700/70 bg-black/35 p-3 text-sm text-zinc-300">
                    No durable alliance held once the heat hit tribal.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xl font-semibold text-orange-200">What They Really Thought of You</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {revealData.thoughts.map((t, idx) => (
                  <div key={`${t.name}-${idx}`} className="rounded-xl border border-zinc-700/70 bg-black/35 p-4">
                    <div className="text-sm font-semibold text-zinc-100">{t.name}</div>
                    <div className="mt-1 text-sm text-zinc-300">{t.thought}</div>
                  </div>
                ))}
              </div>
            </div>

            {Array.isArray(revealData.flippedCallouts) && revealData.flippedCallouts.length > 0 && (
              <div>
                <h3 className="mb-3 text-xl font-semibold text-orange-200">Who Flipped</h3>
                <div className="space-y-3">
                  {revealData.flippedCallouts.map((f, idx) => (
                    <div key={`${f.name}-${idx}`} className="rounded-xl border border-red-300/35 bg-red-900/20 p-4 text-sm text-zinc-100">
                      <div className="font-semibold text-red-100">{f.name}</div>
                      {f.toldPlayer && <div className="mt-1 text-zinc-200">Told you: {f.toldPlayer}</div>}
                      <div className="mt-1 text-zinc-200">Actually did: {f.did}</div>
                      {f.why && <div className="mt-1 text-zinc-300">Why: {f.why}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-amber-300/35 bg-amber-700/15 p-4">
              {revealData.idolStory && (
                <div className="mb-3 rounded-xl border border-yellow-300/35 bg-yellow-700/15 p-3 text-sm text-zinc-100">
                  <div className="text-xs uppercase tracking-widest text-yellow-200">Idol Story</div>
                  <div className="mt-1">{revealData.idolStory}</div>
                </div>
              )}
              <div className="text-xs uppercase tracking-widest text-amber-200">Verdict</div>
              <div className="mt-2 text-sm text-zinc-100">{revealData.verdict}</div>
              <div className="mt-2 text-sm font-semibold text-amber-100">
                {revealData.rightMove ? 'You made the right move.' : 'You misread this tribal.'}
              </div>
            </div>

            <button
              onClick={() => setPhase('final')}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-3 text-sm font-bold text-zinc-950"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
