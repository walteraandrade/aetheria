// Runs the real game loop against a map imported from Aseprite, side by side
// with the same map built from the strings in levels.js.
import { createGame, parseMap } from '../src/world.js';
import { draw } from '../src/render.js';
import { WORLD } from '../src/levels.js';
import { loadAsepriteMap } from '../src/maps/fromAseprite.js';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const log = document.getElementById('log');

// ?map=house to inspect a different document
const name = new URLSearchParams(location.search).get('map') ?? 'overworld';

const { level, parsed } = await loadAsepriteMap(`/maps/${name}.json`, {
  baseUrl: '/maps/',
  spawnAt: name === 'overworld' ? undefined : 'front-door',
  title: WORLD.title, intro: WORLD.intro, startHint: WORLD.startHint, winText: WORLD.winText,
});

// Wait for every terrain strip so the first frame is not the flat fallback.
await Promise.all(level.layers.map((layer) => new Promise((resolve) => {
  const img = new Image();
  img.onload = img.onerror = resolve;
  img.src = layer.tilesetUrl;
})));

const world = createGame({ level, parsed, setHint: () => {}, onEnd: () => {} });
world.resetRun(false);
world.game.running = true;
world.game.player.hp = 1e9;

const reference = parseMap(WORLD);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

log.textContent = [
  `map      ${name} — ${level.map[0].length}x${level.map.length} tiles`,
  name === 'overworld'
    ? `solids   ${parsed.solids.length} (strings: ${reference.solids.length}) ${same(parsed.solids, reference.solids) ? 'identical' : 'DIFFERENT'}`
    : `solids   ${parsed.solids.length}`,
  `bells    ${parsed.bells.length} keys=${parsed.bells.map((b) => b.key).join(',')}`,
  `doors    ${parsed.doors.length} pools=${parsed.doors.map((d) => d.pool.join('/')).join(' ')}`,
  `dark     ${level.darkZones.length} zone(s)`,
  `layers   ${level.layers.map((l) => l.name).join(' -> ')}`,
  `spawn    player ${parsed.playerSpawn.x},${parsed.playerSpawn.y} · enemies ${parsed.enemySpawns.length}`,
  'running the real game loop below',
].join('\n');

draw(ctx, world); // one synchronous frame, so the canvas has content even when rAF is throttled

let last = 0;
const loop = (ts) => {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  world.update(dt);
  draw(ctx, world);
  requestAnimationFrame(loop);
};
requestAnimationFrame(loop);
