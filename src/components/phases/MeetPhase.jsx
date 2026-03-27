import React from 'react';

export default function MeetPhase({ playerNameInput, setPlayerNameInput, playerOccupationInput, setPlayerOccupationInput, generateCastaways, generatingCastaways }) {
  return (
    <section className="mx-auto max-w-2xl animate-fadeIn">
      <div className="rounded-2xl border border-emerald-300/20 bg-black/45 p-6 backdrop-blur">
        <h2 className="font-display text-4xl tracking-wide text-emerald-200">Phase 1: Meet Your Tribe</h2>
        <p className="mt-2 text-sm text-zinc-300">Enter your name and occupation, then generate eight strategic castaways with hidden agendas.</p>

        <form onSubmit={generateCastaways} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            value={playerNameInput}
            onChange={(e) => setPlayerNameInput(e.target.value)}
            placeholder="Your name"
            className="rounded-xl border border-zinc-600/70 bg-zinc-950/80 px-4 py-3 text-sm outline-none ring-emerald-300/0 transition focus:border-emerald-300/70 focus:ring-2"
          />
          <input
            type="text"
            value={playerOccupationInput}
            onChange={(e) => setPlayerOccupationInput(e.target.value)}
            placeholder="Your Occupation"
            className="rounded-xl border border-zinc-600/70 bg-zinc-950/80 px-4 py-3 text-sm outline-none ring-emerald-300/0 transition focus:border-emerald-300/70 focus:ring-2"
          />
          <button
            type="submit"
            disabled={generatingCastaways}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 px-5 py-3 text-sm font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {generatingCastaways ? 'Summoning Castaways...' : 'Generate Castaways'}
          </button>
        </form>
      </div>
    </section>
  );
}
