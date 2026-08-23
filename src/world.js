import { singInterval, sfx } from './audio.js';
import { INTERVALS, BELL_KEYS, randomRoot } from './intervals.js';

export const TILE = 32;
export const MAP = [
  '####################',
  '#......#...........#',
  '#..1...#...........#',
  '#......#.....E.....#',
  '#......#...........#',
  '#..2...D...........#',
  '#......#...........#',
  '#......#........C..#',
  '#..3...#...........#',
  '#......#...........#',
  '####################',
];

const parseMap = () => {
  const solids = [];
  const bells = [];
  let door = null;
  let crystal = null;
  let enemySpawn = null;
  MAP.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') solids.push({ x, y, w: TILE, h: TILE });
      if (ch === 'D') door = { x, y, w: TILE, h: TILE, open: false, cooldown: 0 };
      if (ch === 'C') crystal = { x: x + 16, y: y + 16 };
      if (ch === 'E') enemySpawn = { x: x + 16, y: y + 16 };
      if ('123'.includes(ch)) bells.push({ x: x + 16, y: y + 16, key: BELL_KEYS[+ch - 1], cooldown: 0 });
    });
  });
  return { solids, bells, door, crystal, enemySpawn };
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const createGame = ({ setHint, onEnd }) => {
  const { solids, bells, door, crystal, enemySpawn } = parseMap();

  const game = {
    running: false,
    player: null,
    enemy: null,
    ripples: [],
    flash: 0,
    doorOpen: false,
    doorInterval: null,
    win: false,
    keys: {},
  };

  const ripple = (x, y, color, max = 90) => game.ripples.push({ x, y, r: 8, max, color });

  const isSolid = (px, py, pw, ph) => {
    const hits = (s) => px < s.x + s.w && px + pw > s.x && py < s.y + s.h && py + ph > s.y;
    if (solids.some(hits)) return true;
    return !door.open && hits(door);
  };

  const resetRun = (keepDoor) => {
    game.player = { x: 2.5 * TILE, y: 6.5 * TILE, w: 18, h: 18, hp: 3, inv: 0, fx: 1, fy: 0, sword: 0, swordCd: 0 };
    game.enemy = {
      x: enemySpawn.x, y: enemySpawn.y, w: 22, h: 22, hp: 3, dead: false,
      state: 'patrol', t: 0, dir: 1, attack: null, dx: 0, dy: 0, ring: 0, flash: 0,
    };
    game.ripples = [];
    game.win = false;
    if (!keepDoor || !game.doorOpen) {
      game.doorOpen = false;
      game.doorInterval = BELL_KEYS[Math.floor(Math.random() * BELL_KEYS.length)];
    }
    door.open = game.doorOpen;
    setHint('A porta canta quando você se aproxima. <strong>Espaço</strong> perto dela para ouvir.');
  };

  const nearestBell = () => {
    const best = bells.reduce((acc, b) => {
      const d = dist(game.player, b);
      return d < acc.d ? { d, bell: b } : acc;
    }, { d: Infinity, bell: null });
    return best.d < 34 ? best.bell : null;
  };

  const ringBell = (bell) => {
    if (bell.cooldown > 0) return;
    bell.cooldown = 0.9;
    singInterval(INTERVALS[bell.key].semitones, randomRoot(), 'triangle', 0.2);
    ripple(bell.x, bell.y, '#8f7fd4');
  };

  const doorSing = (force) => {
    if ((door.cooldown > 0 && !force) || door.open) return;
    door.cooldown = 1.3;
    singInterval(INTERVALS[game.doorInterval].semitones, randomRoot(), 'sine', 0.24);
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
    const p = game.player;
    const bell = nearestBell();
    if (bell) {
      ringBell(bell);
      setHint('O sino canta. Compare com a porta. <strong>X</strong> golpeia o sino se for ele.');
      return;
    }
    if (!door.open && dist(p, { x: door.x + 16, y: door.y + 16 }) < 44) {
      doorSing(false);
      setHint('A porta cantou. Ache o sino com o <strong>mesmo salto</strong> entre as duas notas.');
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
    if (bell && !door.open) {
      if (bell.key === game.doorInterval) {
        door.open = true;
        game.doorOpen = true;
        sfx.doorOpen();
        ripple(door.x + 16, door.y + 16, '#7cc48a', 140);
        setHint('<span class="good">O sino responde e a porta se desfaz.</span> Algo canta lá dentro. Ouça antes de lutar.');
      } else {
        hurtPlayer('O sino errado morde sua mão. A porta canta de novo — compare com calma.');
        setTimeout(() => doorSing(true), 600);
      }
      return;
    }

    const e = game.enemy;
    const tipX = p.x + p.fx * 24;
    const tipY = p.y + p.fy * 24;
    if (!e.dead && Math.hypot(tipX - e.x, tipY - e.y) < 26) {
      e.hp--;
      e.flash = 0.2;
      sfx.hitEnemy();
      if (e.hp <= 0) {
        e.dead = true;
        sfx.enemyDie();
        ripple(e.x, e.y, '#e0b45c', 130);
        setHint('<span class="good">A criatura se desfaz em névoa.</span> O cristal espera.');
      }
    }
  };

  const updateEnemy = (dt) => {
    const e = game.enemy;
    const p = game.player;
    if (e.dead) return;
    e.flash = Math.max(0, e.flash - dt);
    const d = dist(e, p);

    if (e.state === 'patrol') {
      e.y += e.dir * 40 * dt;
      if (e.y < 3 * TILE) e.dir = 1;
      if (e.y > 8 * TILE) e.dir = -1;
      if (door.open && d < 160) {
        e.state = 'sing';
        e.t = 1.5;
        e.attack = Math.random() < 0.5 ? 'dash' : 'ring';
        singInterval(e.attack === 'dash' ? 7 : 3, 55 + Math.floor(Math.random() * 12), 'sawtooth', 0.12);
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
    door.cooldown = Math.max(0, door.cooldown - dt);
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
      const nx = p.x + (mx / n) * 150 * dt;
      if (!isSolid(nx - p.w / 2, p.y - p.h / 2, p.w, p.h)) p.x = nx;
      const ny = p.y + (my / n) * 150 * dt;
      if (!isSolid(p.x - p.w / 2, ny - p.h / 2, p.w, p.h)) p.y = ny;
    }

    updateEnemy(dt);

    game.ripples.forEach((r) => { r.r += 130 * dt; });
    game.ripples = game.ripples.filter((r) => r.r < r.max);

    if (game.enemy.dead && dist(p, crystal) < 22) endRun(true);
  };

  return { game, solids, bells, door, crystal, update, interact, swing, resetRun };
};
