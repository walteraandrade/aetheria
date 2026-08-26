import { TILE, SCALE as S } from './levels.js';

// Purely cosmetic props scattered over free floor tiles. Nothing here is
// solid, nothing here is read by the game — only by the renderer.
// Regions are column ranges of the map: temple, field, arena.
const REGIONS = [
  { from: 0, to: 19, props: ['04', '05', '06', '14', '15'], every: 11 },
  { from: 20, to: 40, props: ['01', '02', '07', '08', '10', '11'], every: 9 },
  { from: 41, to: 59, props: ['03', '13', '16', '17', '18'], every: 13 },
];

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const regionOf = (col) => REGIONS.find((r) => col >= r.from && col <= r.to);

const cell = ({ x, y }) => Math.floor(y / TILE) + ':' + Math.floor(x / TILE);

// An exported map's `level.map` is only '#' and '.' — bells, doors and spawns
// live in the parsed bundle, not in the characters. So keep props off entities
// by their real positions rather than by reading the map legend.
const occupiedCells = (parsed) => {
  const { bells = [], doors = [], enemySpawns = [], portals = [], playerSpawn, crystal } = parsed;
  return new Set([
    ...bells.map(cell),
    ...doors.map(cell),
    ...enemySpawns.map(cell),
    ...portals.map(cell),
    ...(playerSpawn ? [cell(playerSpawn)] : []),
    ...(crystal ? [cell(crystal)] : []),
  ]);
};

export const buildDeco = (level, parsed = {}) => {
  const rand = mulberry32(7);
  const occupied = occupiedCells(parsed);
  const out = [];
  level.map.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === '#' || occupied.has(r + ':' + c)) return;
      const region = regionOf(c);
      if (!region || (r * 60 + c) % region.every !== 3) return;
      if (rand() > 0.55) return;
      out.push({
        key: region.props[Math.floor(rand() * region.props.length)],
        x: c * TILE + TILE / 2,
        y: r * TILE + TILE / 2,
        size: (26 + Math.floor(rand() * 14)) * S,
      });
    });
  });
  return out;
};
