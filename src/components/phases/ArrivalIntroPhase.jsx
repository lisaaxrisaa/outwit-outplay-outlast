import React, { useEffect, useMemo, useRef, useState } from 'react';

function splitIntoLines(text) {
  const parts = String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return parts.length ? parts : [String(text || '').trim()].filter(Boolean);
}

export default function ArrivalIntroPhase({ loading, introMessages, onJoin }) {
  const [renderedLines, setRenderedLines] = useState([]);
  const [showJoin, setShowJoin] = useState(false);
  const timersRef = useRef([]);
  const intervalsRef = useRef([]);
  const finalJeffLine =
    'You have the rest of today before your first challenge. Get to know these people. Out here, trust is built in the quiet moments before everything goes sideways.';

  const cinematicScript = useMemo(() => {
    const messages = Array.isArray(introMessages) ? introMessages : [];
    if (!messages.length) return [];

    const jeff = messages.find((m) => String(m.speaker || '').toLowerCase() === 'jeff') || messages[0];
    const reactions = messages.filter((m) => m.id !== jeff.id).slice(0, 3);

    const script = [];
    splitIntoLines(jeff.text).forEach((line) => {
      script.push({ speaker: 'Jeff', text: line });
    });
    reactions.forEach((r) => {
      script.push({ speaker: r.speaker || 'Castaway', text: r.text || '' });
    });
    return script.filter((item) => item.text);
  }, [introMessages]);

  useEffect(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    intervalsRef.current.forEach((id) => clearInterval(id));
    timersRef.current = [];
    intervalsRef.current = [];
    setRenderedLines([]);
    setShowJoin(false);

    if (!loading && !cinematicScript.length) {
      setShowJoin(true);
      return undefined;
    }
    if (loading || !cinematicScript.length) return undefined;

    let cancelled = false;

    const wait = (ms) =>
      new Promise((resolve) => {
        const id = setTimeout(resolve, ms);
        timersRef.current.push(id);
      });

    const typeLine = (speaker, text, cps = 42) =>
      new Promise((resolve) => {
        const lineId = `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setRenderedLines((prev) => [...prev, { id: lineId, speaker, text: '' }]);
        let i = 0;
        const tickMs = Math.max(16, Math.floor(1000 / cps));
        const id = setInterval(() => {
          if (cancelled) {
            clearInterval(id);
            return;
          }
          i += 1;
          const nextText = text.slice(0, i);
          setRenderedLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, text: nextText } : line)));
          if (i >= text.length) {
            clearInterval(id);
            resolve();
          }
        }, tickMs);
        intervalsRef.current.push(id);
      });

    (async () => {
      await wait(600);
      for (let idx = 0; idx < cinematicScript.length; idx += 1) {
        if (cancelled) return;
        const beat = cinematicScript[idx];
        const speed = beat.speaker === 'Jeff' ? 38 : 48;
        await typeLine(beat.speaker, beat.text, speed);
        await wait(beat.speaker === 'Jeff' ? 420 : 700);
      }
      if (cancelled) return;
      await wait(650);
      await typeLine('Jeff', finalJeffLine, 38);
      await wait(900);
      if (!cancelled) setShowJoin(true);
    })();

    return () => {
      cancelled = true;
      timersRef.current.forEach((id) => clearTimeout(id));
      intervalsRef.current.forEach((id) => clearInterval(id));
      timersRef.current = [];
      intervalsRef.current = [];
    };
  }, [loading, cinematicScript]);

  return (
    <section className="relative min-h-[70vh] overflow-hidden rounded-3xl border border-amber-300/20 bg-black/85 p-6 sm:p-10 animate-fadeIn">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.12),transparent_45%),radial-gradient(circle_at_80%_25%,rgba(249,115,22,0.12),transparent_40%),radial-gradient(circle_at_50%_110%,rgba(16,185,129,0.1),transparent_45%)]" />
      <div className="relative mx-auto flex h-full max-w-4xl flex-col justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-amber-200/90">Camp Arrival</div>
          <h2 className="mt-2 font-display text-5xl tracking-wider text-amber-100">The Tribe Hits The Beach</h2>
          <div className="mt-8 space-y-4">
            {loading && (
              <div className="rounded-xl border border-zinc-700/70 bg-black/35 px-4 py-3 text-sm text-zinc-300 animate-flicker">
                Eyes are locking in around camp...
              </div>
            )}
            {!loading &&
              renderedLines.map((line) => (
                <div key={line.id} className="rounded-xl border border-zinc-700/70 bg-black/45 px-4 py-3 text-sm text-zinc-100">
                  <div className="mb-1 text-[10px] uppercase tracking-[0.16em] text-amber-200">{line.speaker}</div>
                  <div>{line.text}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onJoin}
            disabled={!showJoin}
            className={`rounded-xl px-6 py-3 text-sm font-bold transition ${
              showJoin
                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-950 opacity-100'
                : 'cursor-default border border-zinc-700 bg-black/35 text-zinc-500 opacity-0'
            }`}
          >
            Join Your Tribe
          </button>
        </div>
      </div>
    </section>
  );
}
