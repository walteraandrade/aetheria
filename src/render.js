import { TILE } from './levels.js';
import { sprites, decoSprites, drawSprite, drawDeco } from './sprites.js';
import { drawTerrain } from './terrain.js';

let heroFlip = false;
let foeFlip = false;
let prevPX = 0;
let prevPY = 0;

export const draw = (ctx, world) => {
  const { game, level, solids, bells, doors } = world;
  const map = level.map;
  const cv = ctx.canvas;
  const mapW = map[0].length * TILE;
  const mapH = map.length * TILE;
  const camX = Math.max(0, Math.min(game.player.x - cv.width / 2, mapW - cv.width));
  const camY = Math.max(0, Math.min(game.player.y - cv.height / 2, mapH - cv.height));
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#0f0c18';
  ctx.fillRect(0, 0, cv.width, cv.height);

  ctx.save();
  ctx.translate(-camX, -camY);
  if (!drawTerrain(ctx, level)) {
    ctx.fillStyle = '#17131f';
    for (let r = 0; r < map.length; r++) {
      for (let c = 0; c < map[0].length; c++) {
        if ((r + c) % 2 === 0 && map[r][c] !== '#') ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
  }
  ctx.globalAlpha = 0.72;
  world.deco.forEach((d) => drawDeco(ctx, decoSprites[d.key], d.x, d.y, d.size));
  ctx.globalAlpha = 1;


  doors.forEach((door) => {
    if (door.open) return;
    ctx.fillStyle = '#d05a5a';
    for (let i = 0; i < 3; i++) ctx.fillRect(door.x + 4 + i * 10, door.y + 2, 5, TILE - 4);
    ctx.fillStyle = '#e8e3d6';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('♪', door.x + 16, door.y - 4);
  });

  bells.forEach((b) => {
    ctx.fillStyle = b.cooldown > 0.5 ? '#b3a6ef' : '#8f7fd4';
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 12);
    ctx.quadraticCurveTo(b.x + 12, b.y - 10, b.x + 10, b.y + 8);
    ctx.lineTo(b.x - 10, b.y + 8);
    ctx.quadraticCurveTo(b.x - 12, b.y - 10, b.x, b.y - 12);
    ctx.fill();
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(b.x - 2, b.y + 8, 4, 4);
  });

  game.enemies.forEach((e) => {
    if (e.dead) return;
    if (e.ring > 0) {
      const closing = e.state === 'sweep';
      ctx.save();
      ctx.strokeStyle = closing ? '#e0b45c' : '#d05a5a';
      ctx.lineWidth = 5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.ring, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const singing = e.state === 'sing';
    const now = performance.now() / 1000;
    if (e.state === 'dash') foeFlip = e.dx < 0;
    else foeFlip = game.player.x < e.x;
    const striking = e.state === 'ring' || e.state === 'sweep';
    const foeSheet = e.state === 'dash' || e.state === 'patrol' ? sprites.foeRun
      : striking ? sprites.foeAttack
      : sprites.foeIdle;
    const size = e.boss ? 132 : 92;
    const foeOpts = striking
      ? { t: 0.4 - e.t, fps: 10, once: true, flip: foeFlip, size }
      : { t: now, flip: foeFlip, size };
    const hitFlicker = e.flash > 0 && Math.floor(e.flash * 20) % 2 === 0;
    const foeDrawn = hitFlicker || drawSprite(ctx, foeSheet, e.x, e.y - 8, foeOpts);
    if (!foeDrawn) {
      ctx.fillStyle = e.flash > 0 ? '#e0b45c' : (singing && Math.floor(e.t * 8) % 2 === 0 ? '#f0908f' : '#d05a5a');
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
      ctx.restore();
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(e.x - 5, e.y - 3, 3, 3);
      ctx.fillRect(e.x + 2, e.y - 3, 3, 3);
    }
    const barY = e.y - (e.boss ? 52 : 34);
    if (e.boss) {
      const barW = 72;
      ctx.fillStyle = '#2a2440';
      ctx.fillRect(e.x - barW / 2, barY, barW, 5);
      ctx.fillStyle = '#d05a5a';
      ctx.fillRect(e.x - barW / 2, barY, (barW * e.hp) / e.hpMax, 5);
    } else {
      for (let i = 0; i < e.hp; i++) {
        ctx.fillStyle = '#d05a5a';
        ctx.fillRect(e.x - 12 + i * 9, barY, 6, 4);
      }
    }
    if (singing) {
      ctx.fillStyle = '#e8e3d6';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('♪♪', e.x, barY - 8);
    }
  });

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
    heroDrawn = drawSprite(ctx, heroSheet, p.x, p.y - 8, heroOpts);
    if (!heroDrawn) {
      ctx.fillStyle = '#e0b45c';
      ctx.fillRect(p.x - 9, p.y - 9, 18, 18);
      ctx.fillStyle = '#0f0c18';
      ctx.fillRect(p.x - 9 + (p.fx > 0 ? 10 : p.fx < 0 ? 2 : 6), p.y - 4, 6, 4);
    }
  }
  if (p.sword > 0 && !heroDrawn) {
    ctx.strokeStyle = '#e8e3d6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x + p.fx * 12, p.y + p.fy * 12);
    ctx.lineTo(p.x + p.fx * 30, p.y + p.fy * 30);
    ctx.stroke();
  }

  game.ripples.forEach((r) => {
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = Math.max(0, 1 - r.r / r.max);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  ctx.restore();

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
