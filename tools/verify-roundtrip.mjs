// Proof that the Aseprite pipeline reproduces the string map exactly.
//   node tools/verify-roundtrip.mjs public/maps/overworld.json
import { readFileSync } from 'node:fs';
import { WORLD } from '../src/levels.js';
import { parseMap } from '../src/world.js';
import { fromAseprite } from '../src/maps/fromAseprite.js';

const path = process.argv[2] ?? 'public/maps/overworld.json';
const doc = JSON.parse(readFileSync(path, 'utf8'));

const expected = parseMap(WORLD);
const { level, parsed } = fromAseprite(doc);

const sortKey = (o) => `${o.y},${o.x}`;
const norm = (v) =>
  Array.isArray(v) ? [...v].sort((a, b) => sortKey(a).localeCompare(sortKey(b))) : v;

const checks = [
  ['solids', norm(expected.solids), norm(parsed.solids)],
  ['bells', norm(expected.bells), norm(parsed.bells)],
  ['doors', norm(expected.doors), norm(parsed.doors)],
  ['crystal', expected.crystal, parsed.crystal],
  ['enemySpawns', norm(expected.enemySpawns), norm(parsed.enemySpawns)],
  ['playerSpawn', expected.playerSpawn, parsed.playerSpawn],
  ['darkZones', WORLD.darkZones, level.darkZones],
  ['map dimensions', [WORLD.map.length, WORLD.map[0].length], [level.map.length, level.map[0].length]],
];

let failed = 0;
for (const [name, a, b] of checks) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  const ok = sa === sb;
  const count = Array.isArray(a) ? ` (${a.length})` : '';
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${count}`);
  if (!ok) {
    failed++;
    console.log(`      strings : ${sa.slice(0, 220)}`);
    console.log(`      aseprite: ${sb.slice(0, 220)}`);
  }
}

// The terrain layer must agree with the original map wherever it says wall.
const wallMismatch = WORLD.map.reduce((acc, row, r) => {
  const diff = [...row].filter((ch, c) => (ch === '#') !== (level.map[r][c] === '#')).length;
  return acc + diff;
}, 0);
console.log(`${wallMismatch === 0 ? 'ok  ' : 'FAIL'}  wall tiles match (${wallMismatch} mismatches)`);
if (wallMismatch) failed++;

console.log(failed === 0 ? '\nround-trip identical' : `\n${failed} check(s) failed`);
process.exit(failed === 0 ? 0 : 1);
