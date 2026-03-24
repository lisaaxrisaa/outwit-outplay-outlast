export const MODEL = 'claude-sonnet-4-20250514';
export const API_ENDPOINT = '/api/anthropic';

export const CHALLENGE_TYPES = ['sliding', 'memory', 'cipher', 'maze', 'jigsaw', 'rope', 'sequence', 'water', 'torch'];
export const CHALLENGE_META = {
  sliding: { name: 'Sliding Tile', par: 90, intro: 'Slide the tiles into the correct order by clicking any tile adjacent to the empty space. Arrange them left to right, top to bottom. The empty space is your only move.' },
  memory: { name: 'Memory Match', par: 60, intro: "Flip two cards at a time to find matching pairs. Matched pairs stay face up. Remember what you've seen — every flip counts." },
  cipher: { name: 'Word Cipher', par: 75, intro: 'Decode the encrypted phrase using the partial key provided. Type your answer in the decode field and hit Decode when ready. Every letter matters.' },
  maze: { name: 'Maze Navigation', par: 60, intro: 'Navigate from the top left to the bottom right using arrow keys or WASD. Every wrong turn costs you time.' },
  jigsaw: { name: 'Jigsaw Reassembly', par: 90, intro: 'Click any two pieces to swap them. Use the thumbnail in the corner as your guide. Reconstruct the image completely to win.' },
  rope: {
    name: 'Rope Untangle',
    par: 90,
    intro: 'Drag the nodes to untangle the web. Every line must have clear space — no crossings allowed. The crossings counter shows your progress.'
  },
  sequence: {
    name: 'Symbol Sequence Memory',
    par: 75,
    intro: 'Watch the sequence carefully. Repeat it back in the exact same order by clicking the symbols. The sequence grows longer each round. Survive all rounds to win.'
  },
  water: {
    name: 'Water Pouring Puzzle',
    par: 90,
    intro: 'Pour water between the containers to measure the exact target amount shown. Click the container to pour from, then the container to pour into. Logic is your only tool.'
  },
  torch: {
    name: 'Torch Lighting Path',
    par: 90,
    intro: 'Rotate the path pieces by clicking them to connect the flame to every torch on the grid. Every torch must be lit. An unbroken path is the only way through.'
  }
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

  const requestPayload = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages
  };
  if (cleanKey) requestPayload.apiKey = cleanKey;

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(requestPayload)
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

export const SEQUENCE_SYMBOLS = [
  { key: 'torch', icon: '🔥', label: 'Torch' },
  { key: 'skull', icon: '💀', label: 'Skull' },
  { key: 'palm', icon: '🌴', label: 'Palm Tree' },
  { key: 'mask', icon: '🎭', label: 'Tribal Mask' },
  { key: 'necklace', icon: '📿', label: 'Immunity Necklace' },
  { key: 'serpent', icon: '🐍', label: 'Serpent' },
  { key: 'fire', icon: '🕯️', label: 'Fire' },
  { key: 'compass', icon: '🧭', label: 'Compass' }
];

function createRopeEdges(nodeCount) {
  const edgeSet = new Set();
  const edges = [];
  const addEdge = (a, b) => {
    if (a === b) return;
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    const key = `${low}-${high}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push([low, high]);
  };

  for (let i = 0; i < nodeCount; i += 1) {
    addEdge(i, (i + 1) % nodeCount);
  }

  for (let i = 2; i < nodeCount - 1; i += 1) {
    addEdge(0, i);
  }

  return edges;
}

function ropeSegmentsIntersect(a, b, c, d) {
  const cross = (p1, p2, p3) => (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  const onSegment = (p1, p2, p3) =>
    Math.min(p1.x, p2.x) <= p3.x && p3.x <= Math.max(p1.x, p2.x) && Math.min(p1.y, p2.y) <= p3.y && p3.y <= Math.max(p1.y, p2.y);

  const d1 = cross(a, b, c);
  const d2 = cross(a, b, d);
  const d3 = cross(c, d, a);
  const d4 = cross(c, d, b);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  if (d1 === 0 && onSegment(a, b, c)) return true;
  if (d2 === 0 && onSegment(a, b, d)) return true;
  if (d3 === 0 && onSegment(c, d, a)) return true;
  if (d4 === 0 && onSegment(c, d, b)) return true;
  return false;
}

function countGeneratedRopeCrossings(nodes, edges) {
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  let count = 0;
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const [a, b] = edges[i];
      const [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (ropeSegmentsIntersect(byId[a], byId[b], byId[c], byId[d])) count += 1;
    }
  }
  return count;
}

export function createRopeUntangleChallenge() {
  const nodeCount = 8 + randInt(3);
  const center = 50;
  const radius = 34;
  const solvedNodes = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (-Math.PI / 2) + (i / nodeCount) * Math.PI * 2;
    return {
      id: i,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius
    };
  });
  const edges = createRopeEdges(nodeCount);
  let shuffled = solvedNodes;
  let attempts = 0;
  do {
    shuffled = [...solvedNodes]
      .sort(() => Math.random() - 0.5)
      .map((node, idx) => {
        const angle = (-Math.PI / 2) + (idx / nodeCount) * Math.PI * 2;
        const jitter = () => (Math.random() * 10) - 5;
        return {
          id: node.id,
          x: center + Math.cos(angle) * radius + jitter(),
          y: center + Math.sin(angle) * radius + jitter()
        };
      });
    attempts += 1;
  } while (countGeneratedRopeCrossings(shuffled, edges) === 0 && attempts < 12);

  return {
    nodes: shuffled,
    solvedNodes,
    edges
  };
}

export function createSequenceChallenge() {
  const symbols = [...SEQUENCE_SYMBOLS];
  const sequence = Array.from({ length: 7 }, () => symbols[randInt(symbols.length)].key);
  return {
    sequence,
    currentLength: 4,
    inputIndex: 0,
    flashStep: 0,
    phase: 'show',
    selectedKeys: [],
    feedback: ''
  };
}

export function createWaterPouringChallenge() {
  const targets = [4, 6, 1];
  return {
    capacities: [8, 5, 3],
    amounts: [8, 0, 0],
    target: targets[randInt(targets.length)],
    selectedFrom: null
  };
}

const PIPE_SHAPES = {
  empty: [],
  end: ['top'],
  straight: ['top', 'bottom'],
  corner: ['top', 'right'],
  tee: ['top', 'left', 'right'],
  cross: ['top', 'right', 'bottom', 'left']
};

function dirFromStep(dx, dy) {
  if (dx === 1) return 'right';
  if (dx === -1) return 'left';
  if (dy === 1) return 'bottom';
  return 'top';
}

function oppositeDir(dir) {
  return {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right'
  }[dir];
}

function rotateDir(dir, turns) {
  const dirs = ['top', 'right', 'bottom', 'left'];
  const idx = dirs.indexOf(dir);
  return dirs[(idx + turns) % 4];
}

export function getRotatedPipeConnections(shape, rotation = 0) {
  const base = PIPE_SHAPES[shape] || [];
  return base.map((dir) => rotateDir(dir, rotation));
}

function shapeFromConnections(connectionSet) {
  const list = ['top', 'right', 'bottom', 'left'].filter((dir) => connectionSet.has(dir));
  if (list.length === 4) return { shape: 'cross', rotation: 0 };
  if (list.length === 3) {
    for (let rotation = 0; rotation < 4; rotation += 1) {
      const candidate = getRotatedPipeConnections('tee', rotation);
      if (candidate.every((dir) => connectionSet.has(dir)) && list.every((dir) => candidate.includes(dir))) {
        return { shape: 'tee', rotation };
      }
    }
  }
  if (list.length === 2) {
    for (const shape of ['straight', 'corner']) {
      for (let rotation = 0; rotation < 4; rotation += 1) {
        const candidate = getRotatedPipeConnections(shape, rotation);
        if (candidate.every((dir) => connectionSet.has(dir)) && list.every((dir) => candidate.includes(dir))) {
          return { shape, rotation };
        }
      }
    }
  }
  if (list.length === 1) {
    for (let rotation = 0; rotation < 4; rotation += 1) {
      const candidate = getRotatedPipeConnections('end', rotation);
      if (candidate[0] === list[0]) {
        return { shape: 'end', rotation };
      }
    }
  }
  return { shape: 'empty', rotation: 0 };
}

function carvePath(cells, start, end) {
  let x = start.x;
  let y = start.y;
  while (x !== end.x || y !== end.y) {
    const choices = [];
    if (x < end.x) choices.push([1, 0]);
    if (x > end.x) choices.push([-1, 0]);
    if (y < end.y) choices.push([0, 1]);
    if (y > end.y) choices.push([0, -1]);
    const [dx, dy] = choices[randInt(choices.length)];
    const nx = x + dx;
    const ny = y + dy;
    const dir = dirFromStep(dx, dy);
    cells[y][x].add(dir);
    cells[ny][nx].add(oppositeDir(dir));
    x = nx;
    y = ny;
  }
}

export function createTorchLightingChallenge(size = 5) {
  const cells = Array.from({ length: size }, () => Array.from({ length: size }, () => new Set()));
  const source = { x: Math.max(1, randInt(size - 1)), y: 0, edge: 'top' };
  cells[source.y][source.x].add('top');

  const torchCount = 2 + randInt(2);
  const torchPositions = [];
  while (torchPositions.length < torchCount) {
    const candidate = { x: randInt(size), y: 2 + randInt(Math.max(1, size - 2)) };
    if (candidate.x === source.x && candidate.y === source.y) continue;
    if (torchPositions.some((torch) => torch.x === candidate.x && torch.y === candidate.y)) continue;
    torchPositions.push(candidate);
  }

  for (const torch of torchPositions) {
    carvePath(cells, source, torch);
  }

  const grid = cells.map((row) =>
    row.map((connectionSet) => {
      const { shape, rotation } = shapeFromConnections(connectionSet);
      return {
        shape,
        solvedRotation: rotation,
        rotation: (rotation + 1 + randInt(3)) % 4
      };
    })
  );

  return {
    size,
    source,
    torches: torchPositions,
    grid
  };
}
