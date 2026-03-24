import React from 'react';

export default function FinalPhase({ notifyEmail, setNotifyEmail, submitNotify, notifyMessage, notifySubmitting }) {
  return (
    <section className="mx-auto mt-10 max-w-xl animate-fadeIn">
      <div className="rounded-3xl border border-emerald-300/25 bg-black/55 p-6 text-center backdrop-blur">
        <h2 className="font-display text-5xl tracking-wider text-emerald-200">You Survived Tribal Council</h2>
        <p className="mt-3 text-sm text-zinc-300">Want to play the full season?</p>

        <form onSubmit={submitNotify} className="mt-5 space-y-3">
          <input
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-zinc-600/70 bg-zinc-950/80 px-4 py-3 text-sm outline-none ring-emerald-300/0 transition focus:border-emerald-300/70 focus:ring-2"
          />
          <button
            type="submit"
            disabled={notifySubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {notifySubmitting ? 'Submitting...' : 'Notify Me'}
          </button>
        </form>

        {notifyMessage && (
          <div className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-100">
            {notifyMessage}
          </div>
        )}
      </div>
    </section>
  );
}
