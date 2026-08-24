import { createGame } from '../src/world.js';
import { draw } from '../src/render.js';
import { TILE } from '../src/levels.js';
import { ensureAudio } from '../src/audio.js';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const out = document.getElementById('out');

const lcg = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

const buildLevel = ({ cols, rows, enemies, wallRatio = 0.22, dark = false }) => {
  const rnd = lcg(12345);
  const grid = Array.from({ length: rows }, () => new Array(cols).fill('.'));
  for (let c = 0; c < cols; c++) { grid[0][c] = '#'; grid[rows - 1][c] = '#'; }
  for (let r = 0; r < rows; r++) { grid[r][0] = '#'; grid[r][cols - 1] = '#'; }
  const blocks = Math.floor((cols * rows * wallRatio) / 4);
  for (let i = 0; i < blocks; i++) {
    const c = 2 + Math.floor(rnd() * (cols - 5));
    const r = 2 + Math.floor(rnd() * (rows - 5));
    grid[r][c] = '#'; grid[r][c + 1] = '#'; grid[r + 1][c] = '#'; grid[r + 1][c + 1] = '#';
  }
  const free = (r, c) => { grid[r][c] = '.'; grid[r][c + 1] = '.'; grid[r + 1][c] = '.'; grid[r + 1][c + 1] = '.'; };
  const pr = Math.floor(rows / 2);
  const pc = Math.floor(cols / 2);
  free(pr - 1, pc - 1); free(pr, pc);
  grid[pr][pc] = 'P';
  grid[pr][pc + 3] = 'C';
  for (let i = 0; i < enemies; i++) {
    const c = 2 + Math.floor(rnd() * (cols - 4));
    const r = 2 + Math.floor(rnd() * (rows - 4));
    if (grid[r][c] === '.') grid[r][c] = 'E';
  }
  for (let i = 1; i <= 4; i++) {
    const c = 2 + Math.floor(rnd() * (cols - 4));
    const r = 2 + Math.floor(rnd() * (rows - 4));
    grid[r][c] = String(i);
  }
  grid[pr][2] = 'D';
  grid[pr][cols - 3] = 'G';
  return {
    id: 'bench', title: 'bench', intro: '', startHint: '', winText: '',
    bellKeys: ['p5', 'm3', 'p8', 'M3'],
    doorPools: { D: ['p5', 'm3', 'p8'], G: ['M3'] },
    darkZones: dark ? [{ x0: 1, y0: 1, x1: Math.floor(cols / 3), y1: rows - 2 }] : [],
    map: grid.map((row) => row.join('')),
  };
};

const makeWorld = (cfg) => {
  const level = buildLevel(cfg);
  const world = createGame({ level, setHint: () => {}, onEnd: () => {} });
  world.resetRun(false);
  world.game.running = true;
  world.game.player.hp = 1e9;
  return world;
};

const camOf = (world) => {
  const { game, level } = world;
  const mapW = level.map[0].length * TILE;
  const mapH = level.map.length * TILE;
  return {
    camX: Math.max(0, Math.min(game.player.x - cv.width / 2, mapW - cv.width)),
    camY: Math.max(0, Math.min(game.player.y - cv.height / 2, mapH - cv.height)),
  };
};

// exact copy of the terrain block in render.js:56-65
const terrainNaive = (world, camX, camY) => {
  const { level, solids } = world;
  const map = level.map;
  ctx.save();
  ctx.translate(-camX, -camY);
  ctx.fillStyle = '#17131f';
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[0].length; c++) {
      if ((r + c) % 2 === 0 && map[r][c] !== '#') ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
  ctx.fillStyle = '#241f38';
  solids.forEach((s) => ctx.fillRect(s.x, s.y, s.w, s.h));
  ctx.fillStyle = '#2f2949';
  solids.forEach((s) => ctx.fillRect(s.x, s.y, s.w, 6));
  ctx.restore();
};

// same visual output, only the visible window
const terrainCulled = (world, camX, camY) => {
  const map = world.level.map;
  const c0 = Math.max(0, Math.floor(camX / TILE));
  const c1 = Math.min(map[0].length - 1, Math.ceil((camX + cv.width) / TILE));
  const r0 = Math.max(0, Math.floor(camY / TILE));
  const r1 = Math.min(map.length - 1, Math.ceil((camY + cv.height) / TILE));
  ctx.save();
  ctx.translate(-camX, -camY);
  for (let r = r0; r <= r1; r++) {
    const row = map[r];
    for (let c = c0; c <= c1; c++) {
      const solid = row[c] === '#';
      if (solid) {
        ctx.fillStyle = '#241f38';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        ctx.fillStyle = '#2f2949';
        ctx.fillRect(c * TILE, r * TILE, TILE, 6);
      } else if ((r + c) % 2 === 0) {
        ctx.fillStyle = '#17131f';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }
  ctx.restore();
};

const flush = () => ctx.getImageData(0, 0, 1, 1).data[0];

const timeIt = (fn, iters) => {
  for (let i = 0; i < 5; i++) fn();
  flush();
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  flush();
  return (performance.now() - t0) / iters;
};

const flushCost = () => {
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) flush();
  return (performance.now() - t0) / 50;
};

// naive collision = solids.some over every wall (world.js:58)
const collisionNaive = (solids, px, py, pw, ph) =>
  solids.some((s) => px < s.x + s.w && px + pw > s.x && py < s.y + s.h && py + ph > s.y);

const buildSolidGrid = (world) => {
  const map = world.level.map;
  const cols = map[0].length;
  const g = new Uint8Array(cols * map.length);
  world.solids.forEach((s) => { g[(s.y / TILE) * cols + s.x / TILE] = 1; });
  return { g, cols, rows: map.length };
};

const collisionGrid = ({ g, cols, rows }, px, py, pw, ph) => {
  const c0 = Math.max(0, Math.floor(px / TILE));
  const c1 = Math.min(cols - 1, Math.floor((px + pw) / TILE));
  const r0 = Math.max(0, Math.floor(py / TILE));
  const r1 = Math.min(rows - 1, Math.floor((py + ph) / TILE));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (g[r * cols + c]) return true;
  return false;
};

const SCENARIOS = [
  { label: '60x23 (mapa atual)', cols: 60, rows: 23, enemies: 1 },
  { label: '100x100', cols: 100, rows: 100, enemies: 20 },
  { label: '200x200', cols: 200, rows: 200, enemies: 20 },
  { label: '200x200 + escuridao', cols: 200, rows: 200, enemies: 20, dark: true },
  { label: '200x200 + 200 inimigos', cols: 200, rows: 200, enemies: 200 },
  { label: '400x400', cols: 400, rows: 400, enemies: 20 },
];

const run = async () => {
  ensureAudio();
  const fc = flushCost();
  const lines = [];
  lines.push('canvas ' + cv.width + 'x' + cv.height + '  tile ' + TILE + '  budget 16.67 ms/frame @60fps');
  lines.push('flush overhead (getImageData) = ' + fc.toFixed(3) + ' ms, ja descontado');
  lines.push('');
  lines.push('cenario                    tiles  solids  draw()  terrain  terrain  update()  isSolid  isSolid');
  lines.push('                                           naive    naive   culled              naive     grid');
  out.textContent = lines.join('\n');

  for (const sc of SCENARIOS) {
    const world = makeWorld(sc);
    const tiles = sc.cols * sc.rows;
    const nSolids = world.solids.length;
    const { camX, camY } = camOf(world);
    const grid = buildSolidGrid(world);
    const p = world.game.player;

    const dFull = timeIt(() => draw(ctx, world), 40) - fc / 40;
    const dNaive = timeIt(() => terrainNaive(world, camX, camY), 40) - fc / 40;
    const dCull = timeIt(() => terrainCulled(world, camX, camY), 40) - fc / 40;

    world.game.keys['arrowright'] = true;
    const uFull = timeIt(() => world.update(1 / 60), 200);
    world.game.keys['arrowright'] = false;

    const cN = timeIt(() => { for (let i = 0; i < 100; i++) collisionNaive(world.solids, p.x + i, p.y, 18, 18); }, 20) / 100;
    const cG = timeIt(() => { for (let i = 0; i < 100; i++) collisionGrid(grid, p.x + i, p.y, 18, 18); }, 20) / 100;

    const f = (n, w) => String(n).padStart(w);
    lines.push(
      sc.label.padEnd(24) + f(tiles, 7) + f(nSolids, 8) +
      f(dFull.toFixed(2), 8) + f(dNaive.toFixed(2), 9) + f(dCull.toFixed(2), 9) +
      f(uFull.toFixed(3), 10) + f(cN.toFixed(4), 9) + f(cG.toFixed(4), 9),
    );
    out.textContent = lines.join('\n');
    await new Promise((r) => setTimeout(r, 40));
  }
  lines.push('');
  lines.push('ms por chamada. draw()/terrain: por frame. isSolid: por chamada (update faz 2-3 por entidade/frame).');
  out.textContent = lines.join('\n');
  window.__benchDone = out.textContent;
};


const BIG = [
  { label: '200x200', cols: 200, rows: 200, enemies: 20 },
  { label: '400x400', cols: 400, rows: 400, enemies: 200 },
  { label: '1000x1000', cols: 1000, rows: 1000, enemies: 200 },
  { label: '2000x2000', cols: 2000, rows: 2000, enemies: 200 },
];

const runBig = async () => {
  const fc = flushCost();
  const lines = [out.textContent, '', '=== com culling + grid de colisao ==='];
  lines.push('cenario        tiles    solids   buildMs   heapMB  terrain  isSolid   1000 isSolid');
  out.textContent = lines.join('\n');
  for (const sc of BIG) {
    const t0 = performance.now();
    const world = makeWorld(sc);
    const buildMs = performance.now() - t0;
    const grid = buildSolidGrid(world);
    const { camX, camY } = camOf(world);
    const p = world.game.player;
    const heap = performance.memory ? (performance.memory.usedJSHeapSize / 1048576) : NaN;
    const dCull = timeIt(() => terrainCulled(world, camX, camY), 40) - fc / 40;
    const cG = timeIt(() => { for (let i = 0; i < 100; i++) collisionGrid(grid, p.x + i, p.y, 18, 18); }, 20) / 100;
    const f = (n, w) => String(n).padStart(w);
    lines.push(
      sc.label.padEnd(12) + f(sc.cols * sc.rows, 9) + f(world.solids.length, 9) +
      f(buildMs.toFixed(0), 9) + f(heap.toFixed(0), 9) + f(dCull.toFixed(2), 9) +
      f(cG.toFixed(5), 9) + f((cG * 1000).toFixed(2), 15),
    );
    out.textContent = lines.join('\n');
    await new Promise((r) => setTimeout(r, 80));
  }
  window.__bigDone = out.textContent;
};


const fpsTest = (world, mode, ms) => {
  // rAF is throttled when the tab is hidden, so measure the sustainable
  // ceiling: how many full update+draw frames fit in a wall-clock window.
  world.game.keys['arrowright'] = true;
  const { camX, camY } = camOf(world);
  let frames = 0;
  let worst = 0;
  for (let i = 0; i < 3; i++) { world.update(1 / 60); draw(ctx, world); }
  flush();
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    const f0 = performance.now();
    world.update(1 / 60);
    if (mode === 'naive') draw(ctx, world);
    else terrainCulled(world, camX, camY);
    worst = Math.max(worst, performance.now() - f0);
    frames++;
  }
  flush();
  const elapsed = performance.now() - t0;
  world.game.keys['arrowright'] = false;
  return { fps: frames / (elapsed / 1000), frameMs: elapsed / frames, worst };
};

const runFps = async () => {
  ensureAudio();
  const lines = [out.textContent, '', '=== teto de fps (update + draw, sem vsync) ==='];
  lines.push('cenario                       frame ms   teto fps   pior frame');
  out.textContent = lines.join('\n');
  for (const sc of [
    { label: '60x23 atual (naive)', cfg: { cols: 60, rows: 23, enemies: 1 }, mode: 'naive' },
    { label: '200x200 naive', cfg: { cols: 200, rows: 200, enemies: 20 }, mode: 'naive' },
    { label: '400x400 naive', cfg: { cols: 400, rows: 400, enemies: 20 }, mode: 'naive' },
    { label: '400x400 naive +200 foes', cfg: { cols: 400, rows: 400, enemies: 200 }, mode: 'naive' },
    { label: '1000x1000 naive', cfg: { cols: 1000, rows: 1000, enemies: 20 }, mode: 'naive' },
  ]) {
    const world = makeWorld(sc.cfg);
    const r = fpsTest(world, sc.mode, 700);
    lines.push(
      sc.label.padEnd(28) + r.frameMs.toFixed(2).padStart(9) +
      r.fps.toFixed(0).padStart(11) + (r.worst.toFixed(1) + ' ms').padStart(13),
    );
    out.textContent = lines.join('\n');
    await new Promise((r) => setTimeout(r, 60));
  }
  window.__fpsDone = out.textContent;
};

document.getElementById('run').addEventListener('click', run);
document.getElementById('runbig').addEventListener('click', runBig);
document.getElementById('runfps').addEventListener('click', runFps);

