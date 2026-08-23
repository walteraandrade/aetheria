import { TILE, MAP } from './world.js';

const ROWS = MAP.length;
const COLS = MAP[0].length;

export const draw = (ctx, world) => {
  const { game, solids, bells, door, crystal } = world;
  const cv = ctx.canvas;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#0f0c18';
  ctx.fillRect(0, 0, cv.width, cv.height);

  ctx.fillStyle = '#17131f';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if ((r + c) % 2 === 0 && MAP[r][c] !== '#') ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
  ctx.fillStyle = '#241f38';
  solids.forEach((s) => ctx.fillRect(s.x, s.y, s.w, s.h));
  ctx.fillStyle = '#2f2949';
  solids.forEach((s) => ctx.fillRect(s.x, s.y, s.w, 6));

  if (!door.open) {
    ctx.fillStyle = '#d05a5a';
    for (let i = 0; i < 3; i++) ctx.fillRect(door.x + 4 + i * 10, door.y + 2, 5, TILE - 4);
    ctx.fillStyle = '#e8e3d6';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('♪', door.x + 16, door.y - 4);
  }

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

  const e = game.enemy;
  if (!e.dead) {
    if (e.state === 'ring' && e.ring > 0) {
      ctx.strokeStyle = 'rgba(208,90,90,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.min(e.ring, 85), 0, Math.PI * 2);
      ctx.stroke();
    }
    const singing = e.state === 'sing';
    ctx.fillStyle = e.flash > 0 ? '#e0b45c' : (singing && Math.floor(e.t * 8) % 2 === 0 ? '#f0908f' : '#d05a5a');
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-11, -11, 22, 22);
    ctx.restore();
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(e.x - 5, e.y - 3, 3, 3);
    ctx.fillRect(e.x + 2, e.y - 3, 3, 3);
    for (let i = 0; i < e.hp; i++) {
      ctx.fillStyle = '#d05a5a';
      ctx.fillRect(e.x - 12 + i * 9, e.y - 24, 6, 4);
    }
    if (singing) {
      ctx.fillStyle = '#e8e3d6';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('♪♪', e.x, e.y - 30);
    }
  }

  const pulse = 1 + 0.15 * Math.sin(performance.now() / 300);
  ctx.fillStyle = e.dead ? '#7cc48a' : '#3d4d42';
  ctx.save();
  ctx.translate(crystal.x, crystal.y);
  ctx.rotate(Math.PI / 4);
  const cs = 9 * pulse;
  ctx.fillRect(-cs, -cs, cs * 2, cs * 2);
  ctx.restore();

  const p = game.player;
  if (!(p.inv > 0 && Math.floor(p.inv * 10) % 2 === 0)) {
    ctx.fillStyle = '#e0b45c';
    ctx.fillRect(p.x - 9, p.y - 9, 18, 18);
    ctx.fillStyle = '#0f0c18';
    ctx.fillRect(p.x - 9 + (p.fx > 0 ? 10 : p.fx < 0 ? 2 : 6), p.y - 4, 6, 4);
  }
  if (p.sword > 0) {
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
