// Drives the session through overworld -> house -> overworld without rAF,
// so it works in a hidden tab. Asserts placement and carried-over state.
import { createSession } from '../src/maps/session.js';
import { draw } from '../src/render.js';
import { ensureAudio } from '../src/audio.js';
import { TILE } from '../src/levels.js';

ensureAudio(); // enemies sing while we walk; playNote needs a context

const ctx = document.getElementById('cv').getContext('2d');
const log = document.getElementById('log');
const lines = [];
let failed = 0;

const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed++;
  lines.push(`<span class="${ok ? 'ok' : 'bad'}">${ok ? 'ok  ' : 'FAIL'}</span>  ${name}` +
    (ok ? '' : `\n        got      ${JSON.stringify(actual)}\n        expected ${JSON.stringify(expected)}`));
  log.innerHTML = lines.join('\n');
};

const session = createSession({
  urlFor: (name) => `/maps/${name}.json`,
  setHint: () => {},
  onEnd: () => {},
});

// Step the world until a condition holds or we run out of patience.
const stepUntil = async (predicate, keys, maxFrames = 600) => {
  for (let i = 0; i < maxFrames; i++) {
    const world = session.state.world;
    Object.keys(world.game.keys).forEach((k) => { world.game.keys[k] = false; });
    keys.forEach((k) => { world.game.keys[k] = true; });
    world.update(1 / 60);
    await new Promise((r) => setTimeout(r, 0)); // let a pending map fetch land
    if (predicate()) return i;
  }
  return -1;
};

await session.enter('overworld');
check('starts in overworld', session.state.name, 'overworld');

const overworld = session.state.world;
const portal = overworld.portals[0];
check('overworld has one portal to house', { to: portal.to, spawn: portal.spawn }, { to: 'house', spawn: 'front-door' });

// Remember what the world sings, so we can prove it survives the round trip.
const bellRoots = overworld.bells.map((b) => b.root);
const doorIntervals = overworld.doors.map((d) => d.interval);
overworld.game.player.hp = 2;

// Park the player a tile below the portal and walk up into it.
const p = overworld.game.player;
p.x = portal.x + TILE / 2;
p.y = portal.y + TILE * 1.5;
const frames = await stepUntil(() => session.state.name === 'house', ['arrowup']);
check('walking into the portal enters the house', session.state.name, 'house');
lines.push(`      (took ${frames} frames)`);

const house = session.state.world;
const housePortal = house.portals[0];
check('lands on the house arrival point',
  { x: house.game.player.x, y: house.game.player.y },
  { x: housePortal.x + TILE / 2, y: housePortal.y + TILE / 2 });
check('health carries into the house', house.game.player.hp, 2);
check('house has its own bell', house.bells.map((b) => b.key), ['p8']);
check('arriving does not bounce straight back', session.state.name, 'house');

// Step off the portal, then back onto it. portalLock clears once the player's
// whole hitbox is clear of it, which is what re-arms the trigger.
const off = await stepUntil(() => !house.game.portalLock, ['arrowdown']);
check('can step off the portal without triggering it', session.state.name, 'house');
lines.push(`      (${off} frames to clear it)`);

await stepUntil(() => session.state.name === 'overworld', ['arrowup']);
check('walking back into it returns to the overworld', session.state.name, 'overworld');

const back = session.state.world;
check('lands on the overworld arrival point',
  { x: back.game.player.x, y: back.game.player.y },
  { x: portal.x + TILE / 2, y: portal.y + TILE / 2 });
check('health carries back', back.game.player.hp, 2);
check('bells still sing the same roots', back.bells.map((b) => b.root), bellRoots);
check('doors still sing the same intervals', back.doors.map((d) => d.interval), doorIntervals);

draw(ctx, session.state.world);
lines.push(failed === 0 ? '\n<span class="ok">all checks passed</span>' : `\n<span class="bad">${failed} failed</span>`);
log.innerHTML = lines.join('\n');
window.__portalFailed = failed;
