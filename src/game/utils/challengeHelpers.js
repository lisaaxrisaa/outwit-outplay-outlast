import { getRotatedPipeConnections } from '../../lib/gameUtils';

export function pickRandomJigsawImage(pool, excludeUrl = '') {
  const filtered = pool.filter((url) => url !== excludeUrl);
  const sourcePool = filtered.length ? filtered : pool;
  return sourcePool[Math.floor(Math.random() * sourcePool.length)];
}

function segmentsIntersect(a, b, c, d) {
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

export function countRopeCrossings(nodes, edges) {
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  let count = 0;
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const [a, b] = edges[i];
      const [c, d] = edges[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (segmentsIntersect(byId[a], byId[b], byId[c], byId[d])) count += 1;
    }
  }
  return count;
}

export function evaluateTorchGrid(torchChallenge) {
  const { grid, source, torches } = torchChallenge;
  const height = grid.length;
  const width = grid[0]?.length || 0;
  const dirs = {
    top: [0, -1],
    right: [1, 0],
    bottom: [0, 1],
    left: [-1, 0]
  };
  const opposite = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right'
  };
  const queue = [[source.x, source.y]];
  const lit = new Set([`${source.x},${source.y}`]);

  while (queue.length) {
    const [x, y] = queue.shift();
    const connections = getRotatedPipeConnections(grid[y][x].shape, grid[y][x].rotation);
    for (const dir of connections) {
      const [dx, dy] = dirs[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const neighborConnections = getRotatedPipeConnections(grid[ny][nx].shape, grid[ny][nx].rotation);
      if (!neighborConnections.includes(opposite[dir])) continue;
      const key = `${nx},${ny}`;
      if (lit.has(key)) continue;
      lit.add(key);
      queue.push([nx, ny]);
    }
  }

  const allTorchesLit = torches.every((torch) => lit.has(`${torch.x},${torch.y}`));
  const litTorchCount = torches.filter((torch) => lit.has(`${torch.x},${torch.y}`)).length;
  return { lit, allTorchesLit, litTorchCount };
}
