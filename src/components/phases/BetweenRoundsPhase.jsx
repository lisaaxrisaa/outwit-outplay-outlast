import React from 'react';

function buildNodeLayout(names, width = 780, height = 380) {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36;
  return names.reduce((acc, name, idx) => {
    const angle = (-Math.PI / 2) + ((idx / Math.max(1, names.length)) * Math.PI * 2);
    acc[name] = {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius
    };
    return acc;
  }, {});
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
  const width = 780;
  const height = 380;
  const positions = buildNodeLayout(allianceNodeNames, width, height);

  return (
    <section className="animate-fadeIn space-y-5">
      <div className="rounded-2xl border border-red-300/35 bg-red-900/20 p-5 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-red-200">Tribe Update</div>
        <div className="mt-2 text-2xl font-bold text-red-100">
          {eliminatedName} has been voted out. {remainingCount} remain.
        </div>
      </div>

      <div className="rounded-2xl border border-amber-300/35 bg-black/40 p-4">
        <div className="mb-3 text-xs uppercase tracking-[0.2em] text-amber-200">Alliance Map</div>
        {allianceBriefLoading ? (
          <div className="rounded-xl border border-zinc-700/70 bg-black/35 p-4 text-sm text-zinc-300">Reading the social map heading into Round 2...</div>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-[380px] w-full min-w-[780px] rounded-xl border border-zinc-700/70 bg-zinc-950/65">
              {allianceLinks.map((link, idx) => {
                const from = positions[link.from];
                const to = positions[link.to];
                if (!from || !to) return null;
                const color =
                  link.type === 'broken'
                    ? 'rgba(248,113,113,0.95)'
                    : link.type === 'confirmed'
                    ? 'rgba(110,231,183,0.9)'
                    : 'rgba(250,204,21,0.95)';
                const dash = link.type === 'suspected' ? '8 6' : '';
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;
                return (
                  <g key={`alliance-link-${idx}`}>
                    <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={color} strokeWidth="2.3" strokeDasharray={dash} />
                    <text x={mx} y={my - 6} textAnchor="middle" fontSize="10" fill="rgba(244,244,245,0.95)">
                      {link.label}
                    </text>
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
                      r={isPlayer ? 28 : 22}
                      fill={isPlayer ? 'rgba(16,185,129,0.32)' : 'rgba(39,39,42,0.92)'}
                      stroke={isPlayer ? 'rgba(110,231,183,0.95)' : 'rgba(251,191,36,0.55)'}
                      strokeWidth={isPlayer ? 3 : 2}
                    />
                    <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize={isPlayer ? 12 : 11} fill="rgba(250,250,250,0.95)">
                      {name}
                    </text>
                  </g>
                );
              })}
            </svg>
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
