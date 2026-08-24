// Source of truth for the map documents we generate into assets/maps/.
// Each def is what tools/strings-to-aseprite.lua consumes.
//
//   node tools/map-defs.mjs <outDir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { WORLD, TILE } from '../src/levels.js';

const put = (rows, r, c, ch) =>
  rows.map((row, i) => (i === r ? row.slice(0, c) + ch + row.slice(c + 1) : row));

// Overworld: the shipped map plus a doorway into the house.
const overworld = {
  ...WORLD,
  name: 'overworld',
  tile: TILE,
  map: put(WORLD.map, 9, 30, 'T'),
  portals: {
    T: { to: 'house', spawn: 'front-door', id: 'house-exit' },
  },
};

// House: a placeholder interior. One bell, one way out.
const house = {
  name: 'house',
  tile: TILE,
  bellKeys: ['p8'],
  doorPools: {},
  darkZones: [],
  map: [
    '###############',
    '#.............#',
    '#.............#',
    '#.....1.......#',
    '#.............#',
    '#.............#',
    '#.............#',
    '#.............#',
    '#......T......#',
    '#.............#',
    '###############',
  ],
  portals: {
    T: { to: 'overworld', spawn: 'house-exit', id: 'front-door' },
  },
};

const outDir = process.argv[2];
if (!outDir) throw new Error('usage: node tools/map-defs.mjs <outDir>');
mkdirSync(outDir, { recursive: true });
for (const def of [overworld, house]) {
  const path = `${outDir}/${def.name}.json`;
  writeFileSync(path, JSON.stringify(def, null, 2));
  console.log(`map-defs: ${def.name} ${def.map[0].length}x${def.map.length} -> ${path}`);
}
