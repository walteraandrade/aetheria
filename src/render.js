import { TILE, SCALE as S } from './levels.js';

const HALF = TILE / 2;
import { sprites, drawSprite } from './sprites.js';
import { tileset } from './tileset.js';

let darkCv = null;

const drawDarkness = (ctx, world, camX, camY) => {
  const { game, level } = world;
  const cv = ctx.canvas;
  if (!darkCv) darkCv = document.createElement('canvas');
  if (darkCv.width !== cv.width || darkCv.height !== cv.height) {
    darkCv.width = cv.width;
    darkCv.height = cv.height;
  }
  const dctx = darkCv.getContext('2d');
  dctx.globalCompositeOperation = 'source-over';
  dctx.clearRect(0, 0, cv.width, cv.height);
  dctx.fillStyle = 'rgba(4,3,10,0.97)';
  level.darkZones.forEach((z) => {
    dctx.fillRect(z.x0 * TILE - camX, z.y0 * TILE - camY, (z.x1 - z.x0 + 1) * TILE, (z.y1 - z.y0 + 1) * TILE);
  });
  dctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r, a) => {
    const grad = dctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(0,0,0,' + a + ')');
    grad.addColorStop(0.7, 'rgba(0,0,0,' + a * 0.7 + ')');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = grad;
    dctx.beginPath();
    dctx.arc(x, y, r, 0, Math.PI * 2);
    dctx.fill();
  };
  hole(game.player.x - camX, game.player.y - camY, 46 * S, 0.95);
  game.ripples.forEach((r) => hole(r.x - camX, r.y - camY, r.r, Math.max(0, 1 - r.r / r.max)));
  ctx.drawImage(darkCv, 0, 0);
};

// Only the tiles the camera can see get drawn. Without this the cost of a
// frame grows with the whole map instead of the window onto it.
const visibleRange = (camX, camY, cv, cols, rows) => ({
  c0: Math.max(0, Math.floor(camX / TILE)),
  c1: Math.min(cols - 1, Math.ceil((camX + cv.width) / TILE)),
  r0: Math.max(0, Math.floor(camY / TILE)),
  r1: Math.min(rows - 1, Math.ceil((camY + cv.height) / TILE)),
});

// Layers are drawn bottom-to-top: Tiny Swords tiles are transparent at their
// edges, so a cliff has to sit over ground rather than replace it.
const drawLayers = (ctx, level, camX, camY) => {
  const { c0, c1, r0, r1 } = visibleRange(camX, camY, ctx.canvas, level.cols, level.rows);
  let drewAny = false;
  for (const layer of level.layers) {
    const sheet = tileset(layer.tilesetUrl);
    if (!sheet) continue;
    drewAny = true;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const index = layer.cells[r * level.cols + c];
        if (index > 0) {
          ctx.drawImage(sheet, index * TILE, 0, TILE, TILE, c * TILE, r * TILE, TILE, TILE);
        }
      }
    }
  }
  return drewAny;
};

// Pre-tileset look: checkered floor, flat walls with a lit top edge. Walls come
// off the map rather than the solids array so this stays windowed too.
const drawFlat = (ctx, level, camX, camY) => {
  const map = level.map;
  const { c0, c1, r0, r1 } = visibleRange(camX, camY, ctx.canvas, map[0].length, map.length);
  for (let r = r0; r <= r1; r++) {
    const row = map[r];
    for (let c = c0; c <= c1; c++) {
      if (row[c] === '#') {
        ctx.fillStyle = '#241f38';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
        ctx.fillStyle = '#2f2949';
        ctx.fillRect(c * TILE, r * TILE, TILE, 6 * S);
      } else if ((r + c) % 2 === 0) {
        ctx.fillStyle = '#17131f';
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }
};

let heroFlip = false;
let foeFlip = false;
let prevPX = 0;
let prevPY = 0;

export const draw = (ctx, world) => {
  const { game, level, bells, doors, crystal } = world;
  const map = level.map;
  const cv = ctx.canvas;
  const mapW = map[0].length * TILE;
  const mapH = map.length * TILE;
  // Round the camera to whole pixels: at a fractional offset every tile lands
  // on a sub-pixel boundary and the canvas samples its neighbour in the strip,
  // which shows up as seams between tiles.
  const camX = Math.round(Math.max(0, Math.min(game.player.x - cv.width / 2, mapW - cv.width)));
  const camY = Math.round(Math.max(0, Math.min(game.player.y - cv.height / 2, mapH - cv.height)));
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#0f0c18';
  ctx.fillRect(0, 0, cv.width, cv.height);

  ctx.save();
  ctx.translate(-camX, -camY);
  const drewTiles = level.layers?.length ? drawLayers(ctx, level, camX, camY) : false;
  if (!drewTiles) drawFlat(ctx, level, camX, camY);

  doors.forEach((door) => {
    if (door.open) return;
    ctx.fillStyle = '#d05a5a';
    for (let i = 0; i < 3; i++) ctx.fillRect(door.x + (4 + i * 10) * S, door.y + 2 * S, 5 * S, TILE - 4 * S);
    ctx.fillStyle = '#e8e3d6';
    ctx.font = `${10 * S}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('♪', door.x + HALF, door.y - 4 * S);
  });

  bells.forEach((b) => {
    ctx.fillStyle = b.cooldown > 0.5 ? '#b3a6ef' : '#8f7fd4';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 12 * S);
    ctx.quadraticCurveTo(b.x + 12 * S, b.y - 10 * S, b.x + 10 * S, b.y + 8 * S);
    ctx.lineTo(b.x - 10 * S, b.y + 8 * S);
    ctx.quadraticCurveTo(b.x - 12 * S, b.y - 10 * S, b.x, b.y - 12 * S);
    ctx.fill();
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(b.x - 2 * S, b.y + 8 * S, 4 * S, 4 * S);
  });

  game.enemies.forEach((e) => {
    if (e.dead) return;
    if (e.state === 'ring' && e.ring > 0) {
      ctx.strokeStyle = 'rgba(208,90,90,0.8)';
      ctx.lineWidth = 3 * S;
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.min(e.ring, 85 * S), 0, Math.PI * 2);
      ctx.stroke();
    }
    const singing = e.state === 'sing';
    const now = performance.now() / 1000;
    if (e.state === 'dash') foeFlip = e.dx < 0;
    else foeFlip = game.player.x < e.x;
    const foeSheet = e.state === 'dash' || e.state === 'patrol' ? sprites.foeRun
      : e.state === 'ring' ? sprites.foeAttack
      : sprites.foeIdle;
    const foeOpts = e.state === 'ring'
      ? { t: 0.4 - e.t, fps: 10, once: true, flip: foeFlip, size: 92 * S }
      : { t: now, flip: foeFlip, size: 92 * S };
    const hitFlicker = e.flash > 0 && Math.floor(e.flash * 20) % 2 === 0;
    const foeDrawn = hitFlicker || drawSprite(ctx, foeSheet, e.x, e.y - 8 * S, foeOpts);
    if (!foeDrawn) {
      ctx.fillStyle = e.flash > 0 ? '#e0b45c' : (singing && Math.floor(e.t * 8) % 2 === 0 ? '#f0908f' : '#d05a5a');
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-11 * S, -11 * S, 22 * S, 22 * S);
      ctx.restore();
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(e.x - 5 * S, e.y - 3 * S, 3 * S, 3 * S);
      ctx.fillRect(e.x + 2 * S, e.y - 3 * S, 3 * S, 3 * S);
    }
    for (let i = 0; i < e.hp; i++) {
      ctx.fillStyle = '#d05a5a';
      ctx.fillRect(e.x - (12 - i * 9) * S, e.y - 34 * S, 6 * S, 4 * S);
    }
    if (singing) {
      ctx.fillStyle = '#e8e3d6';
      ctx.font = `${12 * S}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('♪♪', e.x, e.y - 40 * S);
    }
  });

  if (crystal) {
    const pulse = 1 + 0.15 * Math.sin(performance.now() / 300);
    ctx.fillStyle = '#7cc48a';
    ctx.save();
    ctx.translate(crystal.x, crystal.y);
    ctx.rotate(Math.PI / 4);
    const cs = 9 * S * pulse;
    ctx.fillRect(-cs, -cs, cs * 2, cs * 2);
    ctx.restore();
  }

  const p = game.player;
  const moving = Math.hypot(p.x - prevPX, p.y - prevPY) > 0.1;
  prevPX = p.x;
  prevPY = p.y;
  if (p.fx > 0.01) heroFlip = false;
  else if (p.fx < -0.01) heroFlip = true;
  const attacking = p.swordCd > 0;
  const heroSheet = attacking ? sprites.heroAttack : moving ? sprites.heroRun : sprites.heroIdle;
  const heroOpts = attacking
    ? { t: 0.35 - p.swordCd, fps: 4 / 0.35, once: true, flip: heroFlip }
    : { t: performance.now() / 1000, flip: heroFlip };
  let heroDrawn = false;
  if (!(p.inv > 0 && Math.floor(p.inv * 10) % 2 === 0)) {
    heroDrawn = drawSprite(ctx, heroSheet, p.x, p.y - 8 * S, heroOpts);
    if (!heroDrawn) {
      ctx.fillStyle = '#e0b45c';
      ctx.fillRect(p.x - 9 * S, p.y - 9 * S, 18 * S, 18 * S);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(p.x - 9 * S + (p.fx > 0 ? 10 : p.fx < 0 ? 2 : 6) * S, p.y - 4 * S, 6 * S, 4 * S);
    }
  }
  if (p.sword > 0 && !heroDrawn) {
    ctx.strokeStyle = '#e8e3d6';
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    ctx.moveTo(p.x + p.fx * 12 * S, p.y + p.fy * 12 * S);
    ctx.lineTo(p.x + p.fx * 30 * S, p.y + p.fy * 30 * S);
    ctx.stroke();
  }

  game.ripples.forEach((r) => {
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = Math.max(0, 1 - r.r / r.max);
    ctx.lineWidth = 2 * S;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  ctx.restore();

  if (level.darkZones && level.darkZones.length) drawDarkness(ctx, world, camX, camY);

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < p.hp ? '#d05a5a' : '#2a2440';
    const hx = 12 + i * 16;
    const hy = 12;
    ctx.beginPath();
    ctx.arc(hx - 3, hy, 4, 0, Math.PI * 2);
    ctx.arc(hx + 3, hy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 6, hy + 1);
    ctx.lineTo(hx, hy + 9);
    ctx.lineTo(hx + 6, hy + 1);
    ctx.fill();
  }

  if (game.flash > 0) {
    ctx.fillStyle = 'rgba(208,90,90,' + game.flash + ')';
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
};
