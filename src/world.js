import { singInterval, sfx } from './audio.js';
import { INTERVALS, randomRoot } from './intervals.js';
import { TILE } from './levels.js';

const parseMap = (level) => {
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
      if (ch === 'C') crystal = { x: x + 16, y: y + 16 };
      if (ch === 'E') enemySpawns.push({ x: x + 16, y: y + 16 });
      if (ch === 'P') playerSpawn = { x: x + 16, y: y + 16 };
      if (ch >= '1' && ch <= '9') bells.push({ x: x + 16, y: y + 16, key: level.bellKeys[+ch - 1], cooldown: 0 });
    });
  });
  return { solids, bells, doors, crystal, enemySpawns, playerSpawn };
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const createGame = ({ level, setHint, onEnd }) => {
  const { solids, bells, doors, crystal, enemySpawns, playerSpawn } = parseMap(level);

  const game = {
    running: false,
    player: null,
    enemies: [],
    ripples: [],
    flash: 0,
    activeDoor: null,
    win: false,
    keys: {},
    pulseCd: 0,
  };

  const pan = (x) => Math.max(-1, Math.min(1, (x - game.player.x) / 320));

  const inDark = (x, y) => {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return (level.darkZones || []).some((z) => tx >= z.x0 && tx <= z.x1 && ty >= z.y0 && ty <= z.y1);
  };

  const ripple = (x, y, color, max = 90) => game.ripples.push({ x, y, r: 8, max, color });

  const isSolid = (px, py, pw, ph) => {
    const hits = (s) => px < s.x + s.w && px + pw > s.x && py < s.y + s.h && py + ph > s.y;
    if (solids.some(hits)) return true;
    return doors.some((d) => !d.open && hits(d));
  };

  const spawnEnemy = (s) => ({
    x: s.x, y: s.y, w: 22, h: 22, hp: 3, dead: false,
    state: 'patrol', t: 0, dir: 1, attack: null, dx: 0, dy: 0, ring: 0, flash: 0,
  });

  const resetRun = (keepDoors) => {
    game.player = { x: playerSpawn.x, y: playerSpawn.y, w: 18, h: 18, hp: 3, inv: 0, fx: 1, fy: 0, sword: 0, swordCd: 0, stepT: 0 };
    game.enemies = enemySpawns.map(spawnEnemy);
    game.ripples = [];
    game.win = false;
    game.activeDoor = null;
    game.pulseCd = 0;
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
    return best.d < 34 ? best.bell : null;
  };

  const nearestClosedDoor = (maxD) => {
    const best = doors.reduce((acc, door) => {
      if (door.open) return acc;
      const d = dist(game.player, { x: door.x + 16, y: door.y + 16 });
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
    const d = dist(game.player, { x: door.x + 16, y: door.y + 16 });
    const gain = Math.max(0.08, 0.26 - d / 1200);
    singInterval(INTERVALS[door.interval].semitones, door.root, 'sine', gain, pan(door.x + 16));
    ripple(door.x + 16, door.y + 16, '#d05a5a', 120);
  };

  const hurtPlayer = (msg) => {
    const p = game.player;
    if (p.inv > 0) return;
    p.hp--;
    p.inv = 1;
    game.flash = 0.25;
    sfx.hurt();
    if (msg) setHint('<span class="bad">' + msg + '</span>');
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
      setHint('O sino canta e o mundo inteiro escuta. <strong>X</strong> golpeia, se ele responde a alguma porta.');
      return;
    }
    const door = nearestClosedDoor(44);
    if (door) {
      doorSing(door, false);
      setHint('A porta cantou. Guarde o salto no ouvido: o sino que responde pode estar longe.');
      return;
    }
    if (inDark(game.player.x, game.player.y) && game.pulseCd <= 0) {
      game.pulseCd = 1.2;
      sfx.pulse();
      ripple(game.player.x, game.player.y, '#e8e3d6', 170);
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
        sfx.doorOpen(pan(target.x + 16));
        ripple(target.x + 16, target.y + 16, '#7cc48a', 140);
        setHint('<span class="good">O sino responde e uma porta se desfaz, onde quer que ela cante.</span>');
      } else {
        hurtPlayer('O sino errado morde sua mão. A porta canta de novo — compare com calma.');
        setTimeout(() => doorSing(target, true), 600);
      }
      return;
    }

    const tipX = p.x + p.fx * 24;
    const tipY = p.y + p.fy * 24;
    game.enemies.forEach((e) => {
      if (e.dead || Math.hypot(tipX - e.x, tipY - e.y) >= 26) return;
      e.hp--;
      e.flash = 0.2;
      sfx.hitEnemy(pan(e.x));
      if (e.hp <= 0) {
        e.dead = true;
        sfx.enemyDie(pan(e.x));
        ripple(e.x, e.y, '#e0b45c', 130);
        setHint('<span class="good">A criatura se desfaz em névoa.</span>');
      }
    });
  };

  const updateEnemy = (e, dt) => {
    const p = game.player;
    if (e.dead) return;
    e.flash = Math.max(0, e.flash - dt);
    const d = dist(e, p);

    if (e.state === 'patrol') {
      const ny = e.y + e.dir * 40 * dt;
      if (!isSolid(e.x - e.w / 2, ny - e.h / 2, e.w, e.h)) e.y = ny;
      else e.dir = -e.dir;
      if (d < 160) {
        e.state = 'sing';
        e.t = 1.5;
        e.attack = Math.random() < 0.5 ? 'dash' : 'ring';
        singInterval(e.attack === 'dash' ? 7 : 3, 55 + Math.floor(Math.random() * 12), 'sawtooth', 0.12, pan(e.x));
        ripple(e.x, e.y, '#d05a5a', 110);
        setHint('Ela canta. <strong>Quinta justa</strong>: investida — saia da linha. <strong>Terça menor</strong>: explosão — afaste-se.');
      }
    } else if (e.state === 'sing') {
      e.t -= dt;
      if (e.t <= 0) {
        if (e.attack === 'dash') {
          const dd = Math.max(1, d);
          e.dx = (p.x - e.x) / dd;
          e.dy = (p.y - e.y) / dd;
          e.state = 'dash';
          e.t = 0.55;
        } else {
          e.state = 'ring';
          e.t = 0.4;
          e.ring = 0;
          if (d < 85) hurtPlayer('A explosão te alcança. Terça menor manda correr para longe.');
        }
      }
    } else if (e.state === 'dash') {
      e.t -= dt;
      const nx = e.x + e.dx * 300 * dt;
      const ny = e.y + e.dy * 300 * dt;
      if (!isSolid(nx - e.w / 2, ny - e.h / 2, e.w, e.h)) { e.x = nx; e.y = ny; } else e.t = 0;
      if (d < 24) hurtPlayer('A investida te acerta. Quinta justa manda sair da linha.');
      if (e.t <= 0) { e.state = 'recover'; e.t = 1.1; }
    } else if (e.state === 'ring') {
      e.t -= dt;
      e.ring += 260 * dt;
      if (e.t <= 0) { e.state = 'recover'; e.t = 1.1; e.ring = 0; }
    } else if (e.state === 'recover') {
      e.t -= dt;
      if (e.t <= 0) e.state = 'patrol';
    }

    if (e.state !== 'ring' && e.state !== 'sing' && !e.dead && d < 20) hurtPlayer('Encostar nela queima.');
  };

  const update = (dt) => {
    const p = game.player;
    const keys = game.keys;
    p.inv = Math.max(0, p.inv - dt);
    p.sword = Math.max(0, p.sword - dt);
    p.swordCd = Math.max(0, p.swordCd - dt);
    doors.forEach((d) => { d.cooldown = Math.max(0, d.cooldown - dt); });
    game.flash = Math.max(0, game.flash - dt);
    game.pulseCd = Math.max(0, game.pulseCd - dt);
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
      const nx = p.x + (mx / n) * 150 * dt;
      if (!isSolid(nx - p.w / 2, p.y - p.h / 2, p.w, p.h)) p.x = nx;
      const ny = p.y + (my / n) * 150 * dt;
      if (!isSolid(p.x - p.w / 2, ny - p.h / 2, p.w, p.h)) p.y = ny;
      if (inDark(p.x, p.y)) {
        p.stepT -= dt;
        if (p.stepT <= 0) {
          p.stepT = 0.35;
          sfx.step();
          ripple(p.x, p.y, '#5a7fd0', 70);
        }
      }
    }

    game.enemies.forEach((e) => updateEnemy(e, dt));

    game.ripples.forEach((r) => { r.r += 130 * dt; });
    game.ripples = game.ripples.filter((r) => r.r < r.max);

    if (crystal && dist(p, crystal) < 22) endRun(true);
  };

  return { game, level, solids, bells, doors, crystal, update, interact, swing, resetRun };
};
