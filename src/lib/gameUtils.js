export const MODEL = 'claude-sonnet-4-20250514';
export const API_ENDPOINT = '/api/anthropic';

export const CHALLENGE_TYPES = ['sliding', 'memory', 'cipher', 'maze', 'jigsaw'];
export const CHALLENGE_META = {
  sliding: { name: 'Sliding Tile', par: 90, intro: 'Nine tiles. One gap. Put order back together before your tribe does it for you.' },
  memory: { name: 'Memory Match', par: 60, intro: 'Read the symbols, trust your memory, and avoid showing panic.' },
  cipher: { name: 'Word Cipher', par: 75, intro: 'Decode the phrase fast. Hesitation costs safety.' },
  maze: { name: 'Maze Navigation', par: 60, intro: 'Find the exit while pressure closes in from every side.' },
  jigsaw: { name: 'Jigsaw Reassembly', par: 90, intro: 'Rebuild the pattern before the clock turns against you.' }
};

export function stripCodeFences(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.replace(/```json/gi, '').replace(/```/g, '').trim();
}

export function parseClaudeJson(raw) {
  const cleaned = stripCodeFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const startObj = cleaned.indexOf('{');
    const endObj = cleaned.lastIndexOf('}');
    const startArr = cleaned.indexOf('[');
    const endArr = cleaned.lastIndexOf(']');

    const candidates = [];
    if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
      candidates.push(cleaned.slice(startObj, endObj + 1));
    }
    if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
      candidates.push(cleaned.slice(startArr, endArr + 1));
    }

    for (const c of candidates) {
      try {
        return JSON.parse(c);
      } catch (_) {
        // noop
      }
    }
    throw err;
  }
}

export function getClaudeText(payload) {
  if (!payload || !Array.isArray(payload.content)) return '';
  return payload.content
    .filter((block) => block && block.type === 'text')
    .map((block) => block.text || '')
    .join('\n')
    .trim();
}

export async function callClaude({ apiKey, system, messages, maxTokens = 1000, temperature = 0.9 }) {
  const cleanKey = String(apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('Missing Anthropic API key.');
  }

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      apiKey: cleanKey,
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      system,
      messages
    })
  });

  const rawPayload = await response.text();
  let payload = null;
  try {
    payload = rawPayload ? JSON.parse(rawPayload) : {};
  } catch (_) {
    payload = { message: rawPayload || 'Unexpected non-JSON response from proxy.' };
  }

  if (!response.ok) {
    const message =
      (typeof payload?.error === 'string' && payload.error) ||
      payload?.error?.message ||
      payload?.message ||
      'Claude request failed.';
    throw new Error(message);
  }

  return getClaudeText(payload);
}

export function badgeColor(personality) {
  const text = (personality || '').toLowerCase();
  if (text.includes('charmer') || text.includes('social')) return 'bg-emerald-700/50 text-emerald-100';
  if (text.includes('mastermind') || text.includes('strateg')) return 'bg-amber-700/50 text-amber-100';
  if (text.includes('wild')) return 'bg-orange-700/50 text-orange-100';
  if (text.includes('loyal')) return 'bg-cyan-700/50 text-cyan-100';
  return 'bg-zinc-700/60 text-zinc-100';
}

export function randInt(max) {
  return Math.floor(Math.random() * max);
}

export function pickChallengeType() {
  return CHALLENGE_TYPES[randInt(CHALLENGE_TYPES.length)];
}

export function isSlidingSolvable(arr) {
  const nums = arr.filter((n) => n !== 0);
  let inv = 0;
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = i + 1; j < nums.length; j += 1) {
      if (nums[i] > nums[j]) inv += 1;
    }
  }
  return inv % 2 === 0;
}

export function createSlidingBoard() {
  const target = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let arr = [...target];
  do {
    arr = [...target];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } while (!isSlidingSolvable(arr) || arr.every((n, i) => n === target[i]));
  return arr;
}

export function createMemoryDeck() {
  const symbols = [
    { key: 'torch', icon: '🔥' },
    { key: 'island', icon: '🏝️' },
    { key: 'skull', icon: '💀' },
    { key: 'palm', icon: '🌴' },
    { key: 'wave', icon: '🌊' },
    { key: 'fire', icon: '🕯️' },
    { key: 'map', icon: '🗺️' },
    { key: 'mask', icon: '🎭' }
  ];
  return [...symbols, ...symbols]
    .map((symbol, idx) => ({ id: idx, key: symbol.key, icon: symbol.icon, matched: false, flipped: false }))
    .sort(() => Math.random() - 0.5);
}

export function encodeCaesar(text, shift) {
  const A = 'A'.charCodeAt(0);
  return text
    .toUpperCase()
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code < 65 || code > 90) return ch;
      return String.fromCharCode(((code - A + shift) % 26) + A);
    })
    .join('');
}

export function createCipherChallenge() {
  const phrases = [
    'THE TRIBE HAS SPOKEN',
    'TRUST IS A WEAPON',
    'OUTWIT OUTPLAY OUTLAST',
    'ALLIANCES SHIFT FAST',
    'KEEP YOUR NAME QUIET'
  ];
  const plain = phrases[randInt(phrases.length)];
  const shift = 1 + randInt(5);
  const encoded = encodeCaesar(plain, shift);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const revealed = alphabet
    .filter((_, idx) => idx % 2 === 0)
    .map((ch) => `${encodeCaesar(ch, shift)}→${ch}`);
  return { plain, encoded, shift, key: revealed.join('  ') };
}

export function createMaze(size = 8) {
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ top: true, right: true, bottom: true, left: true, visited: false }))
  );
  const stack = [[0, 0]];
  grid[0][0].visited = true;
  const dirs = [
    [0, -1, 'top', 'bottom'],
    [1, 0, 'right', 'left'],
    [0, 1, 'bottom', 'top'],
    [-1, 0, 'left', 'right']
  ];

  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const neighbors = dirs
      .map(([dx, dy, wall, opposite]) => ({ nx: x + dx, ny: y + dy, wall, opposite }))
      .filter(({ nx, ny }) => nx >= 0 && ny >= 0 && nx < size && ny < size && !grid[ny][nx].visited);

    if (!neighbors.length) {
      stack.pop();
      continue;
    }

    const next = neighbors[randInt(neighbors.length)];
    grid[y][x][next.wall] = false;
    grid[next.ny][next.nx][next.opposite] = false;
    grid[next.ny][next.nx].visited = true;
    stack.push([next.nx, next.ny]);
  }

  return grid.map((row) =>
    row.map((cell) => ({
      top: cell.top,
      right: cell.right,
      bottom: cell.bottom,
      left: cell.left
    }))
  );
}

export function createJigsawPieces() {
  return Array.from({ length: 9 }, (_, i) => i).sort(() => Math.random() - 0.5);
}
