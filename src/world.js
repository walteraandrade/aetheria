import { singInterval, sfx } from './audio.js';
import { INTERVALS, randomRoot } from './intervals.js';
import { TILE, SCALE as S } from './levels.js';
import { t } from './strings.js';
import { buildDeco } from './deco.js';

const HALF = TILE / 2;

export const parseMap = (level) => {
  const solids = [];
  const bells = [];
  const doors = [];
  const enemySpawns = [];
  let crystal = null;
  let playerSpawn = null;
  level.map.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') solids.push({ x, y, w: TILE, h: TILE });
      if (level.doorPools && level.doorPools[ch]) {
        doors.push({ x, y, w: TILE, h: TILE, open: false, cooldown: 0, pool: level.doorPools[ch], interval: null, root: null });
      }
      if (ch === 'C') crystal = { x: x + HALF, y: y + HALF };
      if (ch === 'E') enemySpawns.push({ x: x + HALF, y: y + HALF, kind: 'grunt' });
      if (ch === 'B') enemySpawns.push({ x: x + HALF, y: y + HALF, kind: 'boss' });
      if (ch === 'P') playerSpawn = { x: x + HALF, y: y + HALF };
      if (ch >= '1' && ch <= '9') bells.push({ x: x + HALF, y: y + HALF, key: level.bellKeys[+ch - 1], cooldown: 0 });
    });
  });
  return { solids, bells, doors, crystal, enemySpawns, playerSpawn };
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Each attack is a sung interval and the move it announces. The interval is
// the only tell: nothing on screen names it.
//   dash  — a straight charge; step out of the line
//   ring  — a blast that expands; get far
//   sweep — a ring that closes in; press against the singer
//
// Sizes, speeds and ranges are written against a 32px tile and scaled by S at
// use, the same as every other distance in this file.
const KINDS = {
  grunt: {
    hp: 3, size: 22, speed: 40, aggro: 160, telegraph: 1.5, sprite: 92,
    attacks: [
      { move: 'dash', interval: 'p5' },
      { move: 'ring', interval: 'm3' },
    ],
  },
  boss: {
    hp: 8, size: 30, speed: 55, aggro: 230, telegraph: 1.7, sprite: 132,
    attacks: [
      { move: 'dash', interval: 'p5' },
      { move: 'ring', interval: 'm3' },
      { move: 'sweep', interval: 'tritone' },
    ],
  },
};

// Both area attacks land when their ring reaches the player, never before, and
// never outside the ring the player can see. The sung interval says which one
// is coming; the ring says it arrived.
const BLAST_TIME = 0.45;
const RING_RADIUS = 95 * S;
const SWEEP_RADIUS = 230 * S;
const SWEEP_SAFE = 62 * S;

const good = (text) => '<span class="good">' + text + '</span>';
const bad = (text) => '<span class="bad">' + text + '</span>';

export const createGame = ({ level, parsed, setHint, onEnd, onPortal }) => {
  const { solids, bells, doors, crystal, enemySpawns, playerSpawn, portals = [] } =
    parsed ?? parseMap(level);
  const deco = buildDeco(level, { bells, doors, crystal, enemySpawns, playerSpawn, portals });

  const game = {
    running: false,
    player: null,
    enemies: [],
    ripples: [],
    flash: 0,
    activeDoor: null,
    win: false,
    keys: {},
    portalLock: false,
  };

  const pan = (x) => Math.max(-1, Math.min(1, (x - game.player.x) / (320 * S)));

  const ripple = (x, y, color, max = 90 * S) => game.ripples.push({ x, y, r: 8 * S, max, color });

  const overlaps = (px, py, pw, ph, o) =>
    px < o.x + o.w && px + pw > o.x && py < o.y + o.h && py + ph > o.y;

  const portalUnder = (p) => portals.find((o) => overlaps(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, o));

  const isSolid = (px, py, pw, ph) => {
    const hits = (s) => overlaps(px, py, pw, ph, s);
    if (solids.some(hits)) return true;
    return doors.some((d) => !d.open && hits(d));
  };

  const spawnEnemy = (s) => {
    const kind = KINDS[s.kind] ?? KINDS.grunt;
    return {
      x: s.x, y: s.y, w: kind.size * S, h: kind.size * S, hp: kind.hp, hpMax: kind.hp,
      kind: s.kind ?? 'grunt', boss: s.kind === 'boss', dead: false,
      state: 'patrol', t: 0, dir: 1, attack: null, dx: 0, dy: 0, ring: 0, flash: 0,
    };
  };

  const resetRun = (keepDoors) => {
    game.player = { x: playerSpawn.x, y: playerSpawn.y, w: 18 * S, h: 18 * S, hp: 3, inv: 0, fx: 1, fy: 0, sword: 0, swordCd: 0 };
    game.enemies = enemySpawns.map(spawnEnemy);
    game.ripples = [];
    game.win = false;
    game.activeDoor = null;
    // Landing on a portal must not bounce the player straight back through it.
    game.portalLock = portalUnder(game.player) !== undefined;
    bells.forEach((b) => { b.root = randomRoot(); });
    doors.forEach((d) => {
      if (!keepDoors) d.open = false;
      if (!d.open) {
        d.interval = d.pool[Math.floor(Math.random() * d.pool.length)];
        d.root = randomRoot();
      }
    });
    setHint(level.startHint);
  };

  const nearestBell = () => {
    const best = bells.reduce((acc, b) => {
      const d = dist(game.player, b);
      return d < acc.d ? { d, bell: b } : acc;
    }, { d: Infinity, bell: null });
    return best.d < 34 * S ? best.bell : null;
  };

  const nearestClosedDoor = (maxD) => {
    const best = doors.reduce((acc, door) => {
      if (door.open) return acc;
      const d = dist(game.player, { x: door.x + HALF, y: door.y + HALF });
      return d < acc.d ? { d, door } : acc;
    }, { d: Infinity, door: null });
    return best.d < maxD ? best.door : null;
  };

  const ringBell = (bell) => {
    if (bell.cooldown > 0) return;
    bell.cooldown = 0.9;
    singInterval(INTERVALS[bell.key].semitones, bell.root, 'triangle', 0.2, pan(bell.x));
    ripple(bell.x, bell.y, '#8f7fd4');
  };

  const doorSing = (door, force) => {
    if ((door.cooldown > 0 && !force) || door.open) return;
    door.cooldown = 1.3;
    game.activeDoor = door;
    const d = dist(game.player, { x: door.x + HALF, y: door.y + HALF });
    const gain = Math.max(0.08, 0.26 - d / (1200 * S));
    singInterval(INTERVALS[door.interval].semitones, door.root, 'sine', gain, pan(door.x + HALF));
    ripple(door.x + HALF, door.y + HALF, '#d05a5a', 120 * S);
  };

  const hurtPlayer = (msg) => {
    const p = game.player;
    if (p.inv > 0) return;
    p.hp--;
    p.inv = 1;
    game.flash = 0.25;
    sfx.hurt();
    if (msg) setHint(bad(msg));
    if (p.hp <= 0) endRun(false);
  };

  const endRun = (won) => {
    game.running = false;
    game.win = won;
    if (won) sfx.victory();
    onEnd(won);
  };

  const interact = () => {
    if (!game.running) return;
    const bell = nearestBell();
    if (bell) {
      ringBell(bell);
      setHint(t('hint.bellRung'));
      return;
    }
    const door = nearestClosedDoor(44 * S);
    if (door) {
      doorSing(door, false);
      setHint(t('hint.doorSang'));
    }
  };

  const swing = () => {
    if (!game.running) return;
    const p = game.player;
    if (p.swordCd > 0) return;
    p.swordCd = 0.35;
    p.sword = 0.15;
    sfx.sword();

    const bell = nearestBell();
    if (bell) {
      const target = game.activeDoor && !game.activeDoor.open ? game.activeDoor : null;
      if (!target) {
        ringBell(bell);
        return;
      }
      if (bell.key === target.interval) {
        target.open = true;
        sfx.doorOpen(pan(target.x + HALF));
        ripple(target.x + HALF, target.y + HALF, '#7cc48a', 140 * S);
        setHint(good(t('hint.doorOpened')));
      } else {
        hurtPlayer(t('hint.wrongBell'));
        setTimeout(() => doorSing(target, true), 600);
      }
      return;
    }

    const tipX = p.x + p.fx * 24 * S;
    const tipY = p.y + p.fy * 24 * S;
    game.enemies.forEach((e) => {
      if (e.dead || Math.hypot(tipX - e.x, tipY - e.y) >= 26 * S) return;
      e.hp--;
      e.flash = 0.2;
      sfx.hitEnemy(pan(e.x));
      if (e.hp <= 0) {
        e.dead = true;
        sfx.enemyDie(pan(e.x));
        ripple(e.x, e.y, '#e0b45c', (e.boss ? 220 : 130) * S);
        setHint(good(t('hint.enemyDies')));
        if (e.boss) endRun(true);
      }
    });
  };

  const telegraph = (e, kind) => {
    e.attack = kind.attacks[Math.floor(Math.random() * kind.attacks.length)];
    e.state = 'sing';
    e.t = kind.telegraph;
    singInterval(INTERVALS[e.attack.interval].semitones, randomRoot(), 'sawtooth', 0.14, pan(e.x));
    ripple(e.x, e.y, '#d05a5a', (e.boss ? 160 : 110) * S);
    setHint(t(e.boss ? 'hint.bossSings' : 'hint.enemySings'));
  };

  const strike = (e, d) => {
    const p = game.player;
    if (e.attack.move === 'dash') {
      const dd = Math.max(1, d);
      e.dx = (p.x - e.x) / dd;
      e.dy = (p.y - e.y) / dd;
      e.state = 'dash';
      e.t = 0.55;
      return;
    }
    if (e.attack.move === 'ring') {
      e.state = 'ring';
      e.t = BLAST_TIME;
      e.ring = 0;
      return;
    }
    e.state = 'sweep';
    e.t = BLAST_TIME;
    e.ring = SWEEP_RADIUS;
  };

  const updateEnemy = (e, dt) => {
    const p = game.player;
    if (e.dead) return;
    const kind = KINDS[e.kind] ?? KINDS.grunt;
    e.flash = Math.max(0, e.flash - dt);
    const d = dist(e, p);

    if (e.state === 'patrol') {
      const ny = e.y + e.dir * kind.speed * S * dt;
      if (!isSolid(e.x - e.w / 2, ny - e.h / 2, e.w, e.h)) e.y = ny;
      else e.dir = -e.dir;
      if (d < kind.aggro * S) telegraph(e, kind);
    } else if (e.state === 'sing') {
      e.t -= dt;
      if (e.t <= 0) strike(e, d);
    } else if (e.state === 'dash') {
      e.t -= dt;
      const nx = e.x + e.dx * 300 * S * dt;
      const ny = e.y + e.dy * 300 * S * dt;
      if (!isSolid(nx - e.w / 2, ny - e.h / 2, e.w, e.h)) { e.x = nx; e.y = ny; } else e.t = 0;
      if (d < 24 * S) hurtPlayer(t('hint.hurtDash'));
      if (e.t <= 0) { e.state = 'recover'; e.t = 1.1; }
    } else if (e.state === 'ring') {
      e.t -= dt;
      e.ring = RING_RADIUS * (1 - e.t / BLAST_TIME);
      if (e.t <= 0) {
        if (d <= RING_RADIUS) hurtPlayer(t('hint.hurtRing'));
        e.state = 'recover';
        e.t = 1.1;
        e.ring = 0;
      }
    } else if (e.state === 'sweep') {
      e.t -= dt;
      e.ring = SWEEP_SAFE + (SWEEP_RADIUS - SWEEP_SAFE) * (e.t / BLAST_TIME);
      if (e.t <= 0) {
        if (d > SWEEP_SAFE && d <= SWEEP_RADIUS) hurtPlayer(t('hint.hurtSweep'));
        e.state = 'recover';
        e.t = 1.1;
        e.ring = 0;
      }
    } else if (e.state === 'recover') {
      e.t -= dt;
      if (e.t <= 0) e.state = 'patrol';
    }

    const idle = e.state === 'patrol' || e.state === 'recover';
    if (idle && d < 20 * S) hurtPlayer(t('hint.hurtTouch'));
  };

  const update = (dt) => {
    const p = game.player;
    const keys = game.keys;
    p.inv = Math.max(0, p.inv - dt);
    p.sword = Math.max(0, p.sword - dt);
    p.swordCd = Math.max(0, p.swordCd - dt);
    doors.forEach((d) => { d.cooldown = Math.max(0, d.cooldown - dt); });
    game.flash = Math.max(0, game.flash - dt);
    bells.forEach((b) => { b.cooldown = Math.max(0, b.cooldown - dt); });

    let mx = 0;
    let my = 0;
    if (keys['arrowleft'] || keys['a']) mx -= 1;
    if (keys['arrowright'] || keys['d']) mx += 1;
    if (keys['arrowup'] || keys['w']) my -= 1;
    if (keys['arrowdown'] || keys['s']) my += 1;
    if (mx || my) {
      const n = Math.hypot(mx, my);
      p.fx = mx / n;
      p.fy = my / n;
      const nx = p.x + (mx / n) * 150 * S * dt;
      if (!isSolid(nx - p.w / 2, p.y - p.h / 2, p.w, p.h)) p.x = nx;
      const ny = p.y + (my / n) * 150 * S * dt;
      if (!isSolid(p.x - p.w / 2, ny - p.h / 2, p.w, p.h)) p.y = ny;
    }

    game.enemies.forEach((e) => updateEnemy(e, dt));

    game.ripples.forEach((r) => { r.r += 130 * S * dt; });
    game.ripples = game.ripples.filter((r) => r.r < r.max);

    const portal = portalUnder(p);
    if (!portal) game.portalLock = false;
    else if (!game.portalLock && onPortal) {
      game.portalLock = true;
      onPortal(portal);
      return;
    }

    if (crystal && dist(p, crystal) < 22 * S) endRun(true);
  };

  return { game, level, solids, bells, doors, crystal, deco, portals, update, interact, swing, resetRun };
};
