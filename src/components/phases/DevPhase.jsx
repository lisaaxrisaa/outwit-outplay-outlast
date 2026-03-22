import React from 'react';

export default function DevPhase({ apiKeyInput, setApiKeyInput, handleSaveApiKey }) {
  return (
    <section className="mx-auto mt-8 max-w-xl animate-fadeIn">
      <div className="rounded-2xl border border-orange-300/30 bg-black/45 p-6 shadow-2xl backdrop-blur">
        <div className="mb-4 inline-block rounded-full bg-orange-500/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-100 animate-flicker">
          Dev Mode / Testing Only
        </div>
        <h2 className="mb-2 font-display text-3xl tracking-wide text-orange-200">Connect Claude</h2>
        <p className="mb-5 text-sm text-zinc-300">Enter an Anthropic API key for local testing. The key stays in React state for this session only.</p>
        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-xl border border-zinc-600/70 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-100 outline-none ring-orange-300/0 transition focus:border-orange-300/70 focus:ring-2"
          />
          <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:brightness-110">
            Enter the Jungle
          </button>
        </form>
      </div>
    </section>
  );
}
