import React from 'react';
import { CHALLENGE_META } from '../../lib/gameUtils';

function getTechnicalInstruction(type) {
  if (type === 'sliding') return 'Click any tile next to the empty slot. Arrange tiles 1-8 in order.';
  if (type === 'memory') return 'Click two cards to flip. Match all pairs to clear the board.';
  if (type === 'cipher') return 'Use the partial key, type the decoded phrase, then click Decode.';
  if (type === 'maze') return 'Use Arrow keys/WASD or the direction buttons. Reach the green exit tile.';
  if (type === 'jigsaw') return 'Click one piece, then another to swap. Rebuild the reference image.';
  if (type === 'rope') return 'Drag nodes to remove all line crossings. Crossings must reach zero.';
  if (type === 'sequence') return 'Watch the flash pattern, then click symbols in the same order.';
  if (type === 'water') return 'Select source then destination to pour. Hit the exact target amount.';
  if (type === 'torch') return 'Click cells to rotate pipes and connect fire to every torch.';
  return CHALLENGE_META[type]?.intro || '';
}

export default function ImmunityIntroPhase({ immunityType, startImmunityChallenge }) {
  return (
    <section className="mx-auto max-w-3xl animate-fadeIn">
      <div className="rounded-3xl border border-amber-300/50 bg-gradient-to-br from-amber-900/35 via-yellow-900/20 to-black/70 p-8 text-center shadow-2xl shadow-amber-500/20">
        <div className="text-xs uppercase tracking-[0.22em] text-amber-200">Challenge Arena</div>
        <h2 className="mt-2 font-display text-6xl tracking-wide text-amber-100">⚡ Immunity Challenge</h2>
        <div className="mt-3 text-xs uppercase tracking-[0.2em] text-zinc-300">Par Time {CHALLENGE_META[immunityType].par}s</div>
        <p className="mt-4 text-sm leading-7 text-amber-100/90">{CHALLENGE_META[immunityType].intro}</p>
        <div className="mx-auto mt-4 max-w-2xl rounded-xl border border-amber-300/30 bg-black/35 px-4 py-3 text-left text-sm text-amber-100/95">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-200">How To Play</div>
          <div className="mt-1">{getTechnicalInstruction(immunityType)}</div>
        </div>
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
