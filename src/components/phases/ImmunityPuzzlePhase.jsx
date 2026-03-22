import React from 'react';
import { CHALLENGE_META } from '../../lib/gameUtils';

const JIGSAW_FALLBACK_BG = 'linear-gradient(135deg, #6b2f12 0%, #92400e 45%, #3d1907 100%)';

function clampProgress(progress) {
  return Math.max(0, Math.min(100, Number(progress || 0)));
}

function hashName(name) {
  const str = String(name || '');
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 100000;
  }
  return h;
}

function getPaceLabel(personality, progress) {
  const p = String(personality || '').toLowerCase();
  const value = clampProgress(progress);
  if (p.includes('competitive') || p.includes('challenge') || p.includes('athlet') || p.includes('physical')) {
    return value > 70 ? 'Hard push' : 'Aggressive pace';
  }
  if (p.includes('quiet') || p.includes('analytical') || p.includes('observant')) {
    return value > 60 ? 'Late burst' : 'Steady focus';
  }
  if (p.includes('social') || p.includes('charmer') || p.includes('bubbly')) {
    return value < 35 ? 'Warming up' : 'Building speed';
  }
  return value > 80 ? 'Final sprint' : 'Measured pace';
}

function buildMiniSliding(progress, tick, seed) {
  const solved = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  const swaps = Math.max(0, Math.ceil((100 - progress) / 16));
  const board = [...solved];
  for (let i = 0; i < swaps; i += 1) {
    const a = (seed + tick + i * 3) % board.length;
    const b = (seed + tick * 2 + i * 5 + 1) % board.length;
    [board[a], board[b]] = [board[b], board[a]];
  }
  return board;
}

function buildMiniMemory(progress, tick, seed) {
  const symbols = ['🔥', '🏝️', '💀', '🌴', '🌊', '🕯️', '🗺️', '🎭'];
  const matchedPairs = Math.max(0, Math.min(8, Math.floor(progress / 12.5)));
  const matched = new Set();
  for (let i = 0; i < matchedPairs; i += 1) {
    matched.add(i);
  }
  const activeA = (seed + tick) % 16;
  const activeB = (seed + tick * 3 + 5) % 16;

  return Array.from({ length: 16 }, (_, idx) => {
    const pair = idx % 8;
    return {
      symbol: symbols[pair],
      shown: matched.has(pair) || idx === activeA || idx === activeB
    };
  });
}

function toSnakeIndex(size, idx) {
  const y = Math.floor(idx / size);
  const local = idx % size;
  const x = y % 2 === 0 ? local : size - 1 - local;
  return { x, y };
}

function buildMiniJigsaw(progress, tick, seed) {
  const pieces = Array.from({ length: 9 }, (_, i) => i);
  const swaps = Math.max(0, Math.ceil((100 - progress) / 18));
  for (let i = 0; i < swaps; i += 1) {
    const a = (seed + tick + i * 2) % pieces.length;
    const b = (seed + tick * 2 + i * 4 + 1) % pieces.length;
    [pieces[a], pieces[b]] = [pieces[b], pieces[a]];
  }
  return pieces;
}

function getJigsawTileStyle(piece, imageUrl) {
  const col = piece % 3;
  const row = Math.floor(piece / 3);
  const x = (col / 2) * 100;
  const y = (row / 2) * 100;
  return {
    backgroundImage: imageUrl ? `url(${imageUrl})` : JIGSAW_FALLBACK_BG,
    backgroundSize: '300% 300%',
    backgroundPosition: `${x}% ${y}%`
  };
}

function MiniPuzzle({ type, progress, tick, name, personality, cipherData, jigsawImageUrl }) {
  const p = clampProgress(progress);
  const seed = hashName(name);

  if (type === 'sliding') {
    const board = buildMiniSliding(p, tick, seed);
    return (
      <div className="grid grid-cols-3 gap-1">
        {board.map((tile, idx) => (
          <div key={`mini-slide-${idx}`} className={`flex aspect-square items-center justify-center rounded-md border text-[10px] font-bold ${tile === 0 ? 'border-zinc-700 bg-zinc-900/40 text-transparent' : 'border-amber-300/45 bg-amber-600/20 text-amber-100'}`}>
            {tile || '0'}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'memory') {
    const cards = buildMiniMemory(p, tick, seed);
    return (
      <div className="grid grid-cols-4 gap-1">
        {cards.map((card, idx) => (
          <div key={`mini-memory-${idx}`} className={`flex aspect-square items-center justify-center rounded-md border text-[11px] transition ${card.shown ? 'border-amber-300/45 bg-amber-700/25' : 'border-zinc-700 bg-zinc-900/60'}`}>
            {card.shown ? card.symbol : '🗿'}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'cipher') {
    const plain = cipherData?.plain || 'THE TRIBE HAS SPOKEN';
    const count = Math.min(plain.length, Math.floor((p / 100) * plain.length));
    const filled = plain.slice(0, count);
    const nextChar = count < plain.length && tick % 2 === 0 ? '|' : '';
    return (
      <div className="space-y-1">
        <div className="truncate rounded-md border border-zinc-700 bg-zinc-900/50 px-2 py-1 text-[9px] text-zinc-300">{cipherData?.encoded || '...'} </div>
        <div className="h-7 rounded-md border border-amber-300/45 bg-black/40 px-2 py-1 font-mono text-[10px] text-amber-100">
          {filled}
          <span className="text-yellow-200">{nextChar}</span>
        </div>
      </div>
    );
  }

  if (type === 'maze') {
    const size = 8;
    const idx = Math.floor((p / 100) * (size * size - 1));
    const pos = toSnakeIndex(size, idx);
    return (
      <div className="grid grid-cols-8 gap-[1px] rounded-md bg-zinc-900/70 p-1">
        {Array.from({ length: size * size }, (_, i) => {
          const cell = toSnakeIndex(size, i);
          const isCursor = cell.x === pos.x && cell.y === pos.y;
          const isEnd = cell.x === 7 && cell.y === 7;
          return (
            <div
              key={`mini-maze-${i}`}
              className={`aspect-square rounded-[2px] ${isEnd ? 'bg-emerald-700/70' : 'bg-zinc-800'} ${isCursor ? 'ring-1 ring-yellow-300 bg-amber-600/70' : ''}`}
            />
          );
        })}
      </div>
    );
  }

  const pieces = buildMiniJigsaw(p, tick, seed);
  return (
    <div className="grid grid-cols-3 gap-1">
      {pieces.map((piece, idx) => {
        return (
          <div
            key={`mini-jigsaw-${idx}`}
            className="aspect-square rounded-md border border-amber-300/35"
            style={getJigsawTileStyle(piece, jigsawImageUrl)}
          />
        );
      })}
    </div>
  );
}

export default function ImmunityPuzzlePhase(props) {
  const {
    immunityType,
    immunityTimer,
    slidingBoard,
    handleSlidingClick,
    memoryDeck,
    handleMemoryClick,
    cipherData,
    cipherGuess,
    setCipherGuess,
    submitCipherGuess,
    mazeGrid,
    mazePos,
    moveMaze,
    jigsawPieces,
    jigsawSelected,
    handleJigsawClick,
    jigsawImageUrl,
    castaways,
    castawayRaceProgress,
    castawayRaceWinner,
    castawayRaceTick,
    giveUpImmunityChallenge
  } = props;
  const leftCastaways = castaways.slice(0, 2);
  const rightCastaways = castaways.slice(2);

  function renderCastawayPanel(c) {
    const progress = clampProgress(castawayRaceProgress[c.name] || 0);
    const isWinner = castawayRaceWinner === c.name;
    return (
      <div
        key={`race-${c.id}`}
        className={`rounded-xl border p-2 transition ${isWinner ? 'border-yellow-300 bg-yellow-600/15 shadow-lg shadow-yellow-400/25 animate-flicker' : 'border-zinc-700 bg-zinc-900/45'}`}
      >
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className={isWinner ? 'font-semibold text-yellow-100' : 'text-zinc-200'}>{c.name}</span>
          <span className={isWinner ? 'text-yellow-200' : 'text-zinc-400'}>{Math.floor(progress)}%</span>
        </div>
        <MiniPuzzle
          type={immunityType}
          progress={progress}
          tick={castawayRaceTick}
          name={c.name}
          personality={c.personality}
          cipherData={cipherData}
          jigsawImageUrl={jigsawImageUrl}
        />
        <div className="mt-2 text-[10px] uppercase tracking-wide text-zinc-400">{getPaceLabel(c.personality, progress)}</div>
        {isWinner && <div className="mt-2 text-center text-xs font-bold uppercase tracking-widest text-yellow-100">{c.name} wins immunity</div>}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-7xl animate-fadeIn">
      <div className="rounded-3xl border border-amber-300/45 bg-gradient-to-br from-zinc-950 via-amber-950/25 to-black p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-amber-200">Immunity Challenge</div>
            <h2 className="font-display text-4xl tracking-wide text-yellow-100">{CHALLENGE_META[immunityType].name}</h2>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-300">Par Time {CHALLENGE_META[immunityType].par}s</div>
            <div className="text-4xl font-bold text-amber-200 animate-flicker">{immunityTimer}s</div>
          </div>
        </div>
        {castawayRaceWinner && (
          <div className="mb-4 rounded-xl border border-yellow-300/50 bg-yellow-700/20 px-3 py-2 text-center text-sm font-semibold uppercase tracking-widest text-yellow-100 animate-flicker">
            {castawayRaceWinner} wins immunity
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
          <div className="space-y-3 rounded-2xl border border-amber-300/25 bg-black/25 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200">Left Lanes</div>
            {leftCastaways.map(renderCastawayPanel)}
          </div>

          <div className="rounded-2xl border border-zinc-700/70 bg-black/35 p-4 sm:p-5">
            {immunityType === 'sliding' && (
              <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2">
                {slidingBoard.map((tile, idx) => (
                  <button
                    key={`${tile}-${idx}`}
                    onClick={() => handleSlidingClick(idx)}
                    className={`aspect-square rounded-xl border text-2xl font-bold transition ${
                      tile === 0
                        ? 'border-zinc-700 bg-zinc-900/30 text-transparent'
                        : 'border-amber-300/40 bg-amber-600/20 text-amber-100 hover:bg-amber-500/30'
                    }`}
                  >
                    {tile || ''}
                  </button>
                ))}
              </div>
            )}

            {immunityType === 'memory' && (
              <div className="mx-auto grid w-full max-w-2xl grid-cols-4 gap-2">
                {memoryDeck.map((card, idx) => (
                  <button
                    key={`${card.key}-${card.id}-${idx}`}
                    onClick={() => handleMemoryClick(idx)}
                    className="memory-card aspect-square rounded-xl border border-zinc-700 bg-zinc-900/70 p-0"
                  >
                    <div className={`memory-card-inner ${card.flipped || card.matched ? 'flipped' : ''}`}>
                      <div className="memory-card-face rounded-xl bg-zinc-900/80 text-2xl">🗿</div>
                      <div className="memory-card-face memory-card-back rounded-xl border border-amber-300/40 bg-amber-700/25 text-2xl">{card.icon}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {immunityType === 'cipher' && (
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="rounded-xl border border-amber-300/30 bg-black/45 p-4 text-center">
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Encoded Phrase</div>
                  <div className="mt-2 text-2xl font-bold tracking-widest text-amber-100">{cipherData.encoded}</div>
                  <div className="mt-3 text-xs text-zinc-400">Partial Key: {cipherData.key}</div>
                </div>
                <form onSubmit={submitCipherGuess} className="flex gap-2">
                  <input
                    type="text"
                    value={cipherGuess}
                    onChange={(e) => setCipherGuess(e.target.value.toUpperCase())}
                    placeholder="Type decoded phrase..."
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-100 outline-none ring-amber-300/0 transition focus:border-amber-300/70 focus:ring-2"
                  />
                  <button type="submit" className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3 text-sm font-semibold text-zinc-950">
                    Decode
                  </button>
                </form>
              </div>
            )}

            {immunityType === 'maze' && (
              <div className="mx-auto max-w-xl space-y-4">
                <div className="mx-auto grid w-[320px] grid-cols-8">
                  {mazeGrid.map((row, y) =>
                    row.map((cell, x) => {
                      const isPlayer = mazePos.x === x && mazePos.y === y;
                      const isExit = x === 7 && y === 7;
                      return (
                        <div
                          key={`${x}-${y}`}
                          className={`h-10 w-10 ${isExit ? 'bg-emerald-600/25' : 'bg-zinc-900/70'} ${isPlayer ? 'ring-2 ring-yellow-300' : ''}`}
                          style={{
                            borderTop: cell.top ? '2px solid rgba(251,191,36,0.45)' : '2px solid transparent',
                            borderRight: cell.right ? '2px solid rgba(251,191,36,0.45)' : '2px solid transparent',
                            borderBottom: cell.bottom ? '2px solid rgba(251,191,36,0.45)' : '2px solid transparent',
                            borderLeft: cell.left ? '2px solid rgba(251,191,36,0.45)' : '2px solid transparent'
                          }}
                        />
                      );
                    })
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-sm">
                  <button onClick={() => moveMaze(0, -1, 'top')} className="rounded-lg border border-zinc-600 px-3 py-2">Up</button>
                  <button onClick={() => moveMaze(-1, 0, 'left')} className="rounded-lg border border-zinc-600 px-3 py-2">Left</button>
                  <button onClick={() => moveMaze(1, 0, 'right')} className="rounded-lg border border-zinc-600 px-3 py-2">Right</button>
                  <button onClick={() => moveMaze(0, 1, 'bottom')} className="rounded-lg border border-zinc-600 px-3 py-2">Down</button>
                </div>
              </div>
            )}

            {immunityType === 'jigsaw' && (
              <div className="mx-auto w-full max-w-sm">
                <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-amber-300/25 bg-black/30 p-2">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-300">Reference</div>
                  <img
                    src={jigsawImageUrl}
                    alt="Puzzle reference"
                    className="h-14 w-14 rounded-md border border-amber-300/35 object-cover"
                    loading="eager"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {jigsawPieces.map((piece, idx) => (
                    <button
                      key={`${piece}-${idx}`}
                      onClick={() => handleJigsawClick(idx)}
                      className={`aspect-square overflow-hidden rounded-xl border ${
                        jigsawSelected === idx ? 'border-yellow-300 ring-2 ring-yellow-300/35' : 'border-amber-300/35 hover:border-amber-200/55'
                      }`}
                    >
                      <div className="h-full w-full rounded-lg" style={getJigsawTileStyle(piece, jigsawImageUrl)} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-amber-300/25 bg-black/25 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200">Right Lanes</div>
            {rightCastaways.map(renderCastawayPanel)}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button onClick={giveUpImmunityChallenge} className="rounded-xl border border-red-400/50 bg-red-900/30 px-4 py-2 text-sm font-semibold text-red-100">
            Give Up
          </button>
        </div>
      </div>
    </section>
  );
}
