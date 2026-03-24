import React, { useEffect, useMemo, useRef, useState } from 'react';
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

function buildMiniSequence(progress, tick, sequence, currentLength) {
  const visibleCount = Math.max(1, Math.min(currentLength, 1 + Math.floor(progress / 20)));
  const flashIndex = Math.floor(tick / 2) % visibleCount;
  return {
    visibleCount,
    flashIndex,
    activeKey: sequence[flashIndex]
  };
}

function buildMiniWater(progress, tick) {
  const states = [
    [8, 0, 0],
    [3, 5, 0],
    [3, 2, 3],
    [6, 2, 0],
    [6, 0, 2],
    [1, 5, 2],
    [1, 4, 3]
  ];
  return states[Math.floor((progress / 100) * (states.length - 1) + tick / 10) % states.length];
}

function interpolateRopeNodes(ropeChallenge, progress) {
  const solvedById = Object.fromEntries(ropeChallenge.solvedNodes.map((node) => [node.id, node]));
  const factor = Math.max(0, Math.min(1, progress / 100));
  return ropeChallenge.nodes.map((node) => {
    const solved = solvedById[node.id];
    return {
      id: node.id,
      x: node.x + (solved.x - node.x) * factor,
      y: node.y + (solved.y - node.y) * factor
    };
  });
}

function PipeCellGlyph({ shape, rotation, lit, isSource, isTorch, isEnd }) {
  const connectionMap = {
    top: [50, 50, 50, 8],
    right: [50, 50, 92, 50],
    bottom: [50, 50, 50, 92],
    left: [50, 50, 8, 50]
  };
  const getConnections = () => {
    const base = {
      empty: [],
      end: ['top'],
      straight: ['top', 'bottom'],
      corner: ['top', 'right'],
      tee: ['top', 'left', 'right'],
      cross: ['top', 'right', 'bottom', 'left']
    }[shape] || [];
    const dirs = ['top', 'right', 'bottom', 'left'];
    return base.map((dir) => dirs[(dirs.indexOf(dir) + rotation) % 4]);
  };
  const connections = getConnections();
  const stroke = lit ? 'rgba(251,191,36,0.95)' : 'rgba(212,212,216,0.6)';

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {connections.map((dir) => (
        <line
          key={dir}
          x1={connectionMap[dir][0]}
          y1={connectionMap[dir][1]}
          x2={connectionMap[dir][2]}
          y2={connectionMap[dir][3]}
          stroke={stroke}
          strokeWidth="14"
          strokeLinecap="round"
        />
      ))}
      <circle cx="50" cy="50" r="11" fill={lit ? 'rgba(251,191,36,0.95)' : 'rgba(161,161,170,0.45)'} />
      {isSource && <text x="50" y="20" textAnchor="middle" fontSize="24">🔥</text>}
      {isTorch && <text x="50" y="86" textAnchor="middle" fontSize="22">🕯️</text>}
      {isSource && (
        <text x="50" y="96" textAnchor="middle" fontSize="12" fontWeight="700" fill="rgba(254,240,138,0.95)" letterSpacing="1.2">
          START
        </text>
      )}
      {isEnd && (
        <text x="50" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="rgba(254,240,138,0.95)" letterSpacing="1">
          END
        </text>
      )}
    </svg>
  );
}

function MiniPuzzle({ type, progress, tick, name, personality, cipherData, jigsawImageUrl, ropeChallenge, sequenceChallenge, sequenceSymbols, waterChallenge, torchChallenge }) {
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

  if (type === 'rope' && ropeChallenge) {
    const nodes = interpolateRopeNodes(ropeChallenge, p);
    const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
    return (
      <svg viewBox="0 0 100 100" className="h-24 w-full rounded-md border border-zinc-700 bg-zinc-950/55">
        {ropeChallenge.edges.map(([a, b], idx) => (
          <line
            key={`mini-rope-edge-${idx}`}
            x1={nodeById[a].x}
            y1={nodeById[a].y}
            x2={nodeById[b].x}
            y2={nodeById[b].y}
            stroke="rgba(245,158,11,0.6)"
            strokeWidth="2.5"
          />
        ))}
        {nodes.map((node) => (
          <circle key={`mini-rope-node-${node.id}`} cx={node.x} cy={node.y} r="4.5" fill="rgba(254,240,138,0.95)" />
        ))}
      </svg>
    );
  }

  if (type === 'sequence' && sequenceChallenge) {
    const info = buildMiniSequence(p, tick, sequenceChallenge.sequence, sequenceChallenge.currentLength);
    const symbolMap = Object.fromEntries(sequenceSymbols.map((symbol) => [symbol.key, symbol]));
    return (
      <div className="space-y-1">
        <div className="rounded-md border border-amber-300/35 bg-black/35 py-1 text-center text-lg">{symbolMap[info.activeKey]?.icon || '🔥'}</div>
        <div className="grid grid-cols-4 gap-1">
          {sequenceChallenge.sequence.slice(0, info.visibleCount).map((key, idx) => (
            <div
              key={`mini-sequence-${idx}`}
              className={`flex aspect-square items-center justify-center rounded-md border text-[11px] ${idx === info.flashIndex ? 'border-yellow-300/70 bg-yellow-500/20' : 'border-zinc-700 bg-zinc-900/60'}`}
            >
              {symbolMap[key]?.icon || '•'}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'water' && waterChallenge) {
    const levels = buildMiniWater(p, tick);
    return (
      <div className="grid grid-cols-3 gap-1">
        {levels.map((amount, idx) => {
          const capacity = waterChallenge.capacities[idx];
          const fill = (amount / capacity) * 100;
          return (
            <div key={`mini-water-${idx}`} className="flex h-16 flex-col justify-end overflow-hidden rounded-md border border-zinc-700 bg-zinc-950/60">
              <div className="bg-cyan-400/65 transition-all" style={{ height: `${fill}%` }} />
              <div className="pb-1 text-center text-[9px] text-zinc-200">{amount}/{capacity}</div>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'torch' && torchChallenge) {
    const litCutoff = Math.floor((p / 100) * (torchChallenge.size * torchChallenge.size));
    const endTorch = torchChallenge.torches[0];
    let cellIndex = 0;
    return (
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${torchChallenge.size}, minmax(0, 1fr))` }}>
        {torchChallenge.grid.flatMap((row, y) =>
          row.map((cell, x) => {
            const solved = p > 70 ? cell.solvedRotation : cell.rotation;
            const isLit = cellIndex++ <= litCutoff;
            const isSource = torchChallenge.source.x === x && torchChallenge.source.y === y;
            const isTorch = torchChallenge.torches.some((torch) => torch.x === x && torch.y === y);
            const isEnd = Boolean(endTorch && endTorch.x === x && endTorch.y === y);
            return (
              <div key={`mini-torch-${x}-${y}`} className="aspect-square rounded-md border border-zinc-700 bg-zinc-950/55 p-0.5">
                <PipeCellGlyph shape={cell.shape} rotation={solved} lit={isLit} isSource={isSource} isTorch={isTorch} isEnd={isEnd} />
              </div>
            );
          })
        )}
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
  const {
    ropeChallenge,
    ropeCrossings,
    setRopeNodePosition,
    sequenceChallenge,
    sequenceSymbols,
    handleSequenceClick,
    waterChallenge,
    handleWaterContainerClick,
    torchChallenge,
    torchStatus,
    rotateTorchCell
  } = props;
  const leftCastaways = castaways.slice(0, 2);
  const rightCastaways = castaways.slice(2);
  const ropeBoardRef = useRef(null);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const sequenceSymbolMap = useMemo(
    () => Object.fromEntries(sequenceSymbols.map((symbol) => [symbol.key, symbol])),
    [sequenceSymbols]
  );

  useEffect(() => {
    if (draggingNodeId === null) return undefined;
    const handleMove = (event) => {
      if (!ropeBoardRef.current) return;
      const rect = ropeBoardRef.current.getBoundingClientRect();
      const clientX = event.clientX ?? event.touches?.[0]?.clientX;
      const clientY = event.clientY ?? event.touches?.[0]?.clientY;
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      setRopeNodePosition(draggingNodeId, x, y);
    };
    const stopDragging = () => setDraggingNodeId(null);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stopDragging);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stopDragging);
    };
  }, [draggingNodeId, setRopeNodePosition]);

  function countSelected(key) {
    return sequenceChallenge.selectedKeys.filter((selectedKey) => selectedKey === key).length;
  }

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
          ropeChallenge={ropeChallenge}
          sequenceChallenge={sequenceChallenge}
          sequenceSymbols={sequenceSymbols}
          waterChallenge={waterChallenge}
          torchChallenge={torchChallenge}
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
                          className={`relative flex h-10 w-10 items-center justify-center ${isExit ? 'bg-emerald-600/25' : 'bg-zinc-900/70'} ${isPlayer ? 'ring-2 ring-yellow-300' : ''}`}
                          style={{
                            borderTop: cell.top ? '2px solid rgba(251,191,36,0.45)' : '2px solid transparent',
                            borderRight: cell.right ? '2px solid rgba(251,191,36,0.45)' : '2px solid transparent',
                            borderBottom: cell.bottom ? '2px solid rgba(251,191,36,0.45)' : '2px solid transparent',
                            borderLeft: cell.left ? '2px solid rgba(251,191,36,0.45)' : '2px solid transparent'
                          }}
                        >
                          {isPlayer && <div className="h-5 w-5 rounded-sm border border-yellow-100/70 bg-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.85)]" />}
                        </div>
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

            {immunityType === 'rope' && (
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-amber-300/30 bg-black/40 px-4 py-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Instructions</div>
                    <div className="mt-1 text-amber-100/90">Drag the nodes to untangle the web. Every line must have clear space, no crossings allowed.</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Crossings Remaining</div>
                    <div className="text-3xl font-bold text-yellow-200">{ropeCrossings}</div>
                  </div>
                </div>
                <svg ref={ropeBoardRef} viewBox="0 0 100 100" className="h-[28rem] w-full touch-none rounded-2xl border border-amber-300/35 bg-zinc-950/65">
                  {ropeChallenge.edges.map(([a, b], idx) => {
                    const nodeA = ropeChallenge.nodes.find((node) => node.id === a);
                    const nodeB = ropeChallenge.nodes.find((node) => node.id === b);
                    return (
                      <line
                        key={`rope-edge-${idx}`}
                        x1={nodeA.x}
                        y1={nodeA.y}
                        x2={nodeB.x}
                        y2={nodeB.y}
                        stroke="rgba(251,191,36,0.75)"
                        strokeWidth="1.7"
                      />
                    );
                  })}
                  {ropeChallenge.nodes.map((node) => (
                    <g key={`rope-node-${node.id}`} onPointerDown={() => setDraggingNodeId(node.id)} className="cursor-grab active:cursor-grabbing">
                      <circle cx={node.x} cy={node.y} r="3.6" fill="rgba(254,240,138,1)" />
                      <circle cx={node.x} cy={node.y} r="2.1" fill="rgba(120,53,15,0.95)" />
                    </g>
                  ))}
                </svg>
              </div>
            )}

            {immunityType === 'sequence' && (
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-black/40 px-4 py-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Instructions</div>
                    <div className="mt-1 text-amber-100/90">Watch the sequence carefully. Repeat it back in the exact same order by clicking the symbols.</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Round</div>
                    <div className="text-3xl font-bold text-yellow-200">{sequenceChallenge.currentLength} / 7</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-300/30 bg-zinc-950/60 p-6 text-center">
                  <div className="text-xs uppercase tracking-[0.2em] text-zinc-300">
                    {sequenceChallenge.phase === 'show'
                      ? 'Watch The Sequence'
                      : sequenceChallenge.phase === 'feedback_wrong'
                      ? 'Incorrect Input'
                      : sequenceChallenge.phase === 'feedback_success'
                      ? 'Round Cleared'
                      : 'Repeat The Sequence'}
                  </div>
                  <div className="mt-4 flex min-h-28 items-center justify-center rounded-2xl border border-amber-300/20 bg-black/35 text-6xl">
                    {sequenceChallenge.phase === 'show' && sequenceChallenge.flashStep % 2 === 0
                      ? sequenceSymbolMap[sequenceChallenge.sequence[Math.floor(sequenceChallenge.flashStep / 2)]]?.icon || '🔥'
                      : sequenceChallenge.phase === 'feedback_wrong'
                      ? sequenceSymbolMap[sequenceChallenge.lastPressedKey]?.icon || '✖'
                      : sequenceChallenge.phase === 'feedback_success'
                      ? '✓'
                      : '•'}
                  </div>
                  <div
                    className={`mt-3 text-sm ${
                      sequenceChallenge.phase === 'feedback_wrong'
                        ? 'text-red-200'
                        : sequenceChallenge.phase === 'feedback_success'
                        ? 'text-emerald-200'
                        : 'text-zinc-300'
                    }`}
                  >
                    {sequenceChallenge.phase === 'show'
                      ? 'Memorize the order as the symbols flash.'
                      : sequenceChallenge.phase === 'feedback_wrong'
                      ? 'Wrong symbol. Sequence will replay and the round gets harder.'
                      : sequenceChallenge.phase === 'feedback_success'
                      ? 'Correct. Get ready for the next round.'
                      : `Input ${sequenceChallenge.inputIndex + 1} of ${sequenceChallenge.currentLength}`}
                  </div>
                  <div className="mt-3 flex min-h-9 items-center justify-center gap-2">
                    {sequenceChallenge.selectedKeys.length ? (
                      sequenceChallenge.selectedKeys.map((key, idx) => (
                        <div
                          key={`selected-seq-${key}-${idx}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300/55 bg-emerald-600/20 text-lg"
                        >
                          {sequenceSymbolMap[key]?.icon || '•'}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">No Inputs Yet</div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {sequenceSymbols.map((symbol) => {
                    const used = countSelected(symbol.key);
                    const targetUsed = sequenceChallenge.selectedKeys.filter((_, idx) => sequenceChallenge.sequence[idx] === symbol.key).length;
                    const isCorrect = used > 0 && used === targetUsed;
                    const isWrongFlash = sequenceChallenge.phase === 'feedback_wrong' && sequenceChallenge.lastPressedKey === symbol.key;
                    const isRightFlash = sequenceChallenge.lastPressedCorrect && sequenceChallenge.lastPressedKey === symbol.key;
                    return (
                      <button
                        key={symbol.key}
                        onClick={() => handleSequenceClick(symbol.key)}
                        disabled={sequenceChallenge.phase !== 'input'}
                        className={`rounded-2xl border px-4 py-5 text-center transition ${
                          isWrongFlash
                            ? 'border-red-300/75 bg-red-700/25'
                            : isRightFlash || isCorrect
                            ? 'border-emerald-300/70 bg-emerald-600/20'
                            : 'border-amber-300/35 bg-zinc-900/65 hover:bg-zinc-800/80'
                        } ${sequenceChallenge.phase !== 'input' ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <div className="text-4xl">{symbol.icon}</div>
                        <div className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-300">{symbol.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {immunityType === 'water' && (
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-black/40 px-4 py-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Instructions</div>
                    <div className="mt-1 text-amber-100/90">
                      Goal: get exactly the target amount in any jug.
                    </div>
                    <div className="mt-1 text-zinc-300">
                      Click a filled jug to select it, then click a different jug to pour into it until the source is empty or the destination is full.
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-yellow-200">
                      {waterChallenge.selectedFrom === null
                        ? 'Step 1: Select a jug with water'
                        : `Step 2: Pour from ${['Large Jug', 'Medium Jug', 'Small Jug'][waterChallenge.selectedFrom]}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Target Amount</div>
                    <div className="text-3xl font-bold text-yellow-200">{waterChallenge.target}</div>
                  </div>
                </div>
                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
                  {waterChallenge.amounts.map((amount, idx) => {
                    const capacity = waterChallenge.capacities[idx];
                    const fill = (amount / capacity) * 100;
                    const selected = waterChallenge.selectedFrom === idx;
                    const labels = ['Large Jug', 'Medium Jug', 'Small Jug'];
                    return (
                      <button
                        key={`water-container-${idx}`}
                        onClick={() => handleWaterContainerClick(idx)}
                        className={`flex min-h-[23rem] flex-col items-center rounded-2xl border p-4 text-center transition ${
                          selected ? 'border-yellow-300 bg-yellow-500/10' : 'border-zinc-700 bg-zinc-900/65 hover:border-amber-300/50'
                        }`}
                      >
                        <div className="mb-3 min-h-[2.5rem] text-xs uppercase tracking-[0.18em] text-zinc-300">{labels[idx]}</div>
                        <div className="mx-auto flex h-64 w-24 flex-col justify-end overflow-hidden rounded-b-3xl rounded-t-xl border-4 border-zinc-400/70 bg-zinc-950">
                          <div className="bg-cyan-400/75 transition-all duration-300" style={{ height: `${fill}%` }} />
                        </div>
                        <div className="mt-3 text-2xl font-bold text-amber-100">{amount} / {capacity}</div>
                        <div className={`mt-2 text-[11px] uppercase tracking-[0.16em] ${selected ? 'text-yellow-200' : 'text-zinc-500'}`}>
                          {selected ? 'Selected Source' : amount === 0 ? 'Empty' : 'Available'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {immunityType === 'torch' && (
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-black/40 px-4 py-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Instructions</div>
                    <div className="mt-1 text-amber-100/90">Rotate the path pieces by clicking them to connect the flame to every torch on the grid.</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-300">Torches Lit</div>
                    <div className="text-3xl font-bold text-yellow-200">{torchStatus.litTorchCount} / {torchChallenge.torches.length}</div>
                  </div>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${torchChallenge.size}, minmax(0, 1fr))` }}>
                  {torchChallenge.grid.flatMap((row, y) =>
                    row.map((cell, x) => {
                      const isSource = torchChallenge.source.x === x && torchChallenge.source.y === y;
                      const isTorch = torchChallenge.torches.some((torch) => torch.x === x && torch.y === y);
                      const isEnd = Boolean(torchChallenge.torches[0] && torchChallenge.torches[0].x === x && torchChallenge.torches[0].y === y);
                      const lit = torchStatus.lit.has(`${x},${y}`);
                      return (
                        <button
                          key={`torch-cell-${x}-${y}`}
                          onClick={() => rotateTorchCell(x, y)}
                          className={`aspect-square rounded-2xl border p-1 transition ${lit ? 'border-yellow-300/70 bg-yellow-600/10' : 'border-zinc-700 bg-zinc-900/65 hover:border-amber-300/50'}`}
                        >
                          <PipeCellGlyph shape={cell.shape} rotation={cell.rotation} lit={lit} isSource={isSource} isTorch={isTorch} isEnd={isEnd} />
                        </button>
                      );
                    })
                  )}
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
