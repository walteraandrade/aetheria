import { TILE } from './levels.js';

// The ground tilemap holds two autotile blocks of 64px cells: grass at column
// 0, sand at column 5. Within a block, index 0 is the leading edge, 1 the
// fill, 2 the trailing edge and 3 the one-cell-wide strip (both edges at
// once) — on each axis. So a cell picks its tile from which of its four
// neighbours are floor. Walls are simply absent ground, which is what gives
// the world its torn island edges.
const SRC = '/assets/tiny-swords/terrain-flat.png';
const CELL = 64;
const BLOCKS = { grass: 0, sand: 5 };
const SAND_FROM_COL = 41;
const DIM = 'rgba(26, 18, 48, 0.42)';

const image = new Image();
image.src = SRC;

let cache = null;

const build = (level) => {
  const map = level.map;
  const cols = map[0].length;
  const rows = map.length;
  const cv = document.createElement('canvas');
  cv.width = cols * TILE;
  cv.height = rows * TILE;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const isFloor = (r, c) => !!map[r] && !!map[r][c] && map[r][c] !== '#';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isFloor(r, c)) continue;
      const edge = (before, after) => (before && after ? 3 : before ? 0 : after ? 2 : 1);
      const col = edge(!isFloor(r, c - 1), !isFloor(r, c + 1));
      const row = edge(!isFloor(r - 1, c), !isFloor(r + 1, c));
      const block = c >= SAND_FROM_COL ? BLOCKS.sand : BLOCKS.grass;
      ctx.drawImage(
        image,
        (block + col) * CELL, row * CELL, CELL, CELL,
        c * TILE, r * TILE, TILE, TILE,
      );
    }
  }

  ctx.fillStyle = DIM;
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
};

export const drawTerrain = (ctx, level) => {
  if (!image.complete || !image.naturalWidth) return false;
  if (!cache) cache = build(level);
  ctx.drawImage(cache, 0, 0);
  return true;
};
