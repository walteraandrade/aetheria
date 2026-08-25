const FRAME = 192;

const SHEETS = {
  heroIdle: { src: '/assets/tiny-swords/blue-warrior/idle.png', frames: 8 },
  heroRun: { src: '/assets/tiny-swords/blue-warrior/run.png', frames: 6 },
  heroAttack: { src: '/assets/tiny-swords/blue-warrior/attack.png', frames: 4 },
  foeIdle: { src: '/assets/tiny-swords/red-warrior/idle.png', frames: 8 },
  foeRun: { src: '/assets/tiny-swords/red-warrior/run.png', frames: 6 },
  foeAttack: { src: '/assets/tiny-swords/red-warrior/attack.png', frames: 4 },
};

const DECO_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '10', '11', '13', '14', '15', '16', '17', '18'];

const load = ({ src, frames }) => {
  const img = new Image();
  img.src = src;
  return { img, frames };
};

export const sprites = Object.fromEntries(
  Object.entries(SHEETS).map(([key, sheet]) => [key, load(sheet)]),
);

export const decoSprites = Object.fromEntries(
  DECO_KEYS.map((key) => [key, load({ src: '/assets/tiny-swords/deco/' + key + '.png', frames: 1 })]),
);

export const drawDeco = (ctx, sheet, x, y, size) => {
  const { img } = sheet;
  if (!img.complete || !img.naturalWidth) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
};

export const drawSprite = (ctx, sheet, x, y, opts = {}) => {
  const { t = 0, flip = false, size = 84, fps = 10, once = false } = opts;
  const { img, frames } = sheet;
  if (!img.complete || !img.naturalWidth) return false;
  const idx = once
    ? Math.min(frames - 1, Math.floor(t * fps))
    : Math.floor(t * fps) % frames;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, idx * FRAME, 0, FRAME, FRAME, -size / 2, -size / 2, size, size);
  ctx.restore();
  return true;
};
