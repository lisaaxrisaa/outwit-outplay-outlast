import React, { useState } from 'react';

const LINK_COLORS = {
  confirmed: '#56B4E9',
  suspected: '#E69F00',
  broken: '#CC79A7'
};

function buildAdjacency(names, links) {
  const graph = Object.fromEntries(names.map((name) => [name, new Set()]));
  links.forEach((link) => {
    if (!graph[link.from] || !graph[link.to]) return;
    graph[link.from].add(link.to);
    graph[link.to].add(link.from);
  });
  return graph;
}

function buildTreeLevels(names, links, root = 'You') {
  const graph = buildAdjacency(names, links);
  const visited = new Set();
  const levels = [];
  const hasRoot = names.includes(root);
  const queue = hasRoot ? [{ name: root, level: 0 }] : [];

  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current.name)) continue;
    visited.add(current.name);
    if (!levels[current.level]) levels[current.level] = [];
    levels[current.level].push(current.name);

    const neighbors = Array.from(graph[current.name] || []);
    neighbors.sort((a, b) => a.localeCompare(b));
    neighbors.forEach((next) => {
      if (!visited.has(next)) queue.push({ name: next, level: current.level + 1 });
    });
  }

  const unvisited = names.filter((name) => !visited.has(name)).sort((a, b) => a.localeCompare(b));
  if (unvisited.length) {
    const fallbackLevel = Math.max(1, levels.length);
    if (!levels[fallbackLevel]) levels[fallbackLevel] = [];
    levels[fallbackLevel].push(...unvisited);
  }

  return levels.filter((level) => level && level.length);
}

function buildTreeLayout(names, links, width = 980, height = 440) {
  const levels = buildTreeLevels(names, links, 'You');
  const count = Math.max(1, levels.length);
  const topPad = 56;
  const bottomPad = 50;
  const leftPad = 62;
  const rightPad = 62;
  const rowGap = count > 1 ? (height - topPad - bottomPad) / (count - 1) : 0;
  const positions = {};
  const levelByName = {};

  levels.forEach((levelNames, row) => {
    const cols = levelNames.length;
    const usable = width - leftPad - rightPad;
    levelNames.forEach((name, col) => {
      const x = cols === 1 ? width / 2 : leftPad + (usable * col) / (cols - 1);
      const y = topPad + rowGap * row;
      positions[name] = { x, y };
      levelByName[name] = row;
    });
  });

  return { positions, levelByName };
}

function edgePath(from, to, fromLevel, toLevel) {
  if (fromLevel === toLevel) {
    const bendY = from.y - 26;
    return `M ${from.x} ${from.y} Q ${(from.x + to.x) / 2} ${bendY} ${to.x} ${to.y}`;
  }

  const upper = fromLevel < toLevel ? from : to;
  const lower = fromLevel < toLevel ? to : from;
  const midY = upper.y + (lower.y - upper.y) * 0.5;
  return `M ${upper.x} ${upper.y} L ${upper.x} ${midY} L ${lower.x} ${midY} L ${lower.x} ${lower.y}`;
}

export default function BetweenRoundsPhase({
  eliminatedName,
  remainingCount,
  allianceBriefLoading,
  allianceSummary,
  allianceLinks,
  allianceNodeNames,
  beginRound2
}) {
  const [activeLinkIndex, setActiveLinkIndex] = useState(-1);
  const width = 980;
  const height = 440;
  const sortedLinks = [...allianceLinks].sort((a, b) => {
    const rank = { confirmed: 0, suspected: 1, broken: 2 };
    return (rank[a.type] ?? 3) - (rank[b.type] ?? 3);
  });
  const visibleLinks = sortedLinks.slice(0, 16);
  const { positions, levelByName } = buildTreeLayout(allianceNodeNames, visibleLinks, width, height);

  return (
    <section className="animate-fadeIn space-y-5">
      <div className="rounded-2xl border border-red-300/35 bg-red-900/20 p-5 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-red-200">Tribe Update</div>
        <div className="mt-2 text-2xl font-bold text-red-100">
          {eliminatedName} has been voted out. {remainingCount} remain.
        </div>
      </div>

      <div className="rounded-2xl border border-amber-300/35 bg-black/40 p-4">
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-amber-200">Alliance Tree</div>
        <div className="mb-3 text-xs text-zinc-400">Structured view of social ties from top to bottom for easier scanning.</div>
        {allianceBriefLoading ? (
          <div className="rounded-xl border border-zinc-700/70 bg-black/35 p-4 text-sm text-zinc-300">Reading the social map heading into Round 2...</div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-[430px] w-full min-w-[980px] rounded-xl border border-zinc-700/70 bg-zinc-950/70">
                {visibleLinks.map((link, idx) => {
                  const from = positions[link.from];
                  const to = positions[link.to];
                  if (!from || !to) return null;
                  const color = LINK_COLORS[link.type] || '#9CA3AF';
                  const dash = link.type === 'suspected' ? '7 6' : '';
                  const fromLevel = levelByName[link.from] ?? 0;
                  const toLevel = levelByName[link.to] ?? 0;
                  const isActive = activeLinkIndex === idx;
                  const pathD = edgePath(from, to, fromLevel, toLevel);
                  return (
                    <g key={`alliance-link-${idx}`}>
                      <path
                        d={pathD}
                        stroke={color}
                        strokeWidth={isActive ? '5.2' : '3'}
                        strokeDasharray={dash}
                        fill="none"
                        strokeLinecap="round"
                        opacity={isActive ? '1' : '0.96'}
                      />
                      <path
                        d={pathD}
                        stroke="transparent"
                        strokeWidth="14"
                        fill="none"
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setActiveLinkIndex(idx)}
                        onMouseLeave={() => setActiveLinkIndex(-1)}
                        onClick={() => setActiveLinkIndex((prev) => (prev === idx ? -1 : idx))}
                      >
                        <title>{`${link.from} ↔ ${link.to}: ${link.label}`}</title>
                      </path>
                    </g>
                  );
                })}

                {allianceNodeNames.map((name) => {
                  const node = positions[name];
                  if (!node) return null;
                  const isPlayer = name === 'You';
                  return (
                    <g key={`alliance-node-${name}`}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isPlayer ? 36 : 27}
                        fill={isPlayer ? 'rgba(8,76,96,0.8)' : 'rgba(31,41,55,0.96)'}
                        stroke={isPlayer ? LINK_COLORS.confirmed : 'rgba(229,231,235,0.62)'}
                        strokeWidth={isPlayer ? 4 : 2.2}
                      />
                      <text x={node.x} y={node.y + 5} textAnchor="middle" fontSize={isPlayer ? 15 : 13} fontWeight={isPlayer ? 700 : 600} fill="rgba(243,244,246,0.98)">
                        {name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-200">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-6 rounded" style={{ backgroundColor: LINK_COLORS.confirmed }} />Confirmed</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-6 rounded" style={{ backgroundColor: LINK_COLORS.suspected }} />Suspected</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-6 rounded" style={{ backgroundColor: LINK_COLORS.broken }} />Broken</span>
              <span className="text-zinc-400">Hover or tap a line to highlight its relationship below.</span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {visibleLinks.map((link, idx) => {
                const border =
                  link.type === 'confirmed'
                    ? 'border-sky-300/50 bg-sky-900/15'
                    : link.type === 'broken'
                    ? 'border-fuchsia-300/45 bg-fuchsia-900/15'
                    : 'border-amber-300/55 bg-amber-900/15';
                return (
                  <div
                    key={`alliance-detail-${idx}`}
                    className={`rounded-lg border px-3 py-2 text-xs text-zinc-100 transition ${
                      activeLinkIndex === idx ? 'ring-2 ring-amber-300/70' : ''
                    } ${border}`}
                  >
                    <span className="font-semibold">{link.from}</span> ↔ <span className="font-semibold">{link.to}</span> · {link.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-amber-300/35 bg-amber-900/10 p-4 text-sm text-zinc-100">
        <div className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-200">Host Briefing</div>
        {allianceSummary || 'Tonight drew clear lines and exposed cracks. Round 2 starts with unfinished business and fresh pressure.'}
      </div>

      <button
        onClick={beginRound2}
        disabled={allianceBriefLoading}
        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Begin Round 2
      </button>
    </section>
  );
}
