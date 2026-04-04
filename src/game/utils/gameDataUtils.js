export function pickRandom(arr) {
  if (!arr?.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickRandomMany(arr, count) {
  const copy = [...arr];
  const out = [];
  while (copy.length && out.length < count) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export function normalizeArchetype(text) {
  const cleaned = String(text || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  return cleaned.split(' ').slice(0, 2).join(' ');
}

export function zoneById(zones, zoneId) {
  return zones.find((z) => z.id === zoneId) || zones[0];
}

export function extractPlayerVotePromises({ text, toName = '', playerName, castaways }) {
  const line = String(text || '').trim();
  if (!line) return [];
  const commitmentHint =
    /\b(i promise|you have my word|i swear|i'm with you|i got you|trust me)\b/i.test(line) ||
    /\bwe vote|i'll vote|i will vote|i am voting|write down\b/i.test(line);
  if (!commitmentHint) return [];
  const targets = [playerName, ...castaways.map((c) => c.name)];
  const matchedTargets = targets.filter((n) => new RegExp(`\\b${String(n).replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}\\b`, 'i').test(line));
  const target = matchedTargets.find((n) => n !== playerName && n !== toName) || matchedTargets.find((n) => n !== playerName) || 'unspecified';
  return [
    {
      speaker: playerName,
      to: toName || 'group',
      target,
      commitment: line,
      confidence: /\bpromise|word|swear\b/i.test(line) ? 'high' : 'medium'
    }
  ];
}
