import { TILE } from './levels.js';

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
  hole(game.player.x - camX, game.player.y - camY, 46, 0.95);
  game.ripples.forEach((r) => hole(r.x - camX, r.y - camY, r.r, Math.max(0, 1 - r.r / r.max)));
  ctx.drawImage(darkCv, 0, 0);
};

export const draw = (ctx, world) => {
  const { game, level, solids, bells, doors, crystal } = world;
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
  });

  if (crystal) {
    const pulse = 1 + 0.15 * Math.sin(performance.now() / 300);
    ctx.fillStyle = '#7cc48a';
    ctx.save();
    ctx.translate(crystal.x, crystal.y);
    ctx.rotate(Math.PI / 4);
    const cs = 9 * pulse;
    ctx.fillRect(-cs, -cs, cs * 2, cs * 2);
    ctx.restore();
  }

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
