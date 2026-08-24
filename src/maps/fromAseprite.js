import { TILE } from '../levels.js';

// Adapts the JSON emitted by tools/export-map.lua into the shapes the game
// already speaks: a `level` for render.js, and a `parsed` bundle identical to
// what parseMap() builds from the string maps.

const HALF = TILE / 2;

const byReadingOrder = (a, b) => a.y - b.y || a.x - b.x;

const splitList = (value) =>
  String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const solidIndices = (tiles) =>
  new Set(
    Object.entries(tiles ?? {})
      .filter(([, props]) => props.solid === true)
      .map(([index]) => Number(index)),
  );

// A cell blocks if any layer puts a solid tile on it.
const isSolidCell = (layers, cell) =>
  layers.some(({ cells, solids }) => solids.has(cells[cell]));

const terrainRows = (doc, layers) =>
  Array.from({ length: doc.rows }, (_, r) =>
    Array.from({ length: doc.cols }, (_, c) =>
      isSolidCell(layers, r * doc.cols + c) ? '#' : '.',
    ).join(''),
  );

const toDarkZone = ({ x, y, w, h }) => ({
  x0: Math.floor(x / TILE),
  y0: Math.floor(y / TILE),
  x1: Math.floor((x + w) / TILE) - 1,
  y1: Math.floor((y + h) / TILE) - 1,
});

const parseEntities = (entities) => {
  const ordered = [...entities].sort(byReadingOrder);
  const of = (kind) => ordered.filter((e) => e.kind === kind);

  const missing = ordered.filter((e) => e.kind === 'bell' && !e.props?.interval);
  if (missing.length) {
    throw new Error(`fromAseprite: ${missing.length} bell(s) without an "interval" property`);
  }

  const portals = of('portal').map(({ x, y, props }) => ({
    x, y, w: TILE, h: TILE,
    to: props.to, spawn: props.spawn, id: props.id ?? null,
  }));

  // A portal doubles as an arrival point when it carries an id, so a door can
  // be both the way out and the place you land coming back.
  const spawnPoints = Object.fromEntries([
    ...of('spawn').map(({ x, y, props }) => [props.id, { x: x + HALF, y: y + HALF }]),
    ...portals.filter((p) => p.id).map((p) => [p.id, { x: p.x + HALF, y: p.y + HALF }]),
  ]);

  return {
    portals,
    spawnPoints,
    bells: of('bell').map(({ x, y, props }) => ({
      x: x + HALF, y: y + HALF, key: props.interval, cooldown: 0,
    })),
    doors: of('door').map(({ x, y, props }) => ({
      x, y, w: TILE, h: TILE,
      open: false, cooldown: 0,
      pool: splitList(props.pool),
      interval: null, root: null,
    })),
    enemySpawns: of('enemy').map(({ x, y }) => ({ x: x + HALF, y: y + HALF })),
    playerSpawn: of('player').map(({ x, y }) => ({ x: x + HALF, y: y + HALF }))[0] ?? null,
    crystal: of('crystal').map(({ x, y }) => ({ x: x + HALF, y: y + HALF }))[0] ?? null,
    darkZones: of('dark').map(toDarkZone),
  };
};

export const fromAseprite = (doc, meta = {}) => {
  if (doc.tileWidth !== TILE || doc.tileHeight !== TILE) {
    throw new Error(
      `fromAseprite: map uses ${doc.tileWidth}x${doc.tileHeight} tiles, game uses ${TILE}`,
    );
  }

  const layers = (doc.layers ?? []).map((layer) => ({
    name: layer.name,
    cells: layer.cells,
    solids: solidIndices(layer.tiles),
    tilesetUrl: layer.tileset?.image ? `${meta.baseUrl ?? ''}${layer.tileset.image}` : null,
  }));
  if (!layers.length) throw new Error(`fromAseprite: ${doc.name} has no terrain layers`);

  const { bells, doors, enemySpawns, playerSpawn, crystal, darkZones, portals, spawnPoints } =
    parseEntities(doc.entities);

  // Where the player lands: an explicit arrival point wins over the map's own
  // "player" marker, so an interior needs no marker at all.
  const entry = meta.spawnAt ? spawnPoints[meta.spawnAt] : playerSpawn;
  if (meta.spawnAt && !entry) {
    const known = Object.keys(spawnPoints).join(', ') || 'none';
    throw new Error(`fromAseprite: no spawn point "${meta.spawnAt}" in ${doc.name} (have: ${known})`);
  }
  if (!entry) throw new Error(`fromAseprite: ${doc.name} has no entity of kind "player" and no spawnAt given`);

  const map = terrainRows(doc, layers);
  const wall = [];
  map.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === '#') wall.push({ x: c * TILE, y: r * TILE, w: TILE, h: TILE });
    }),
  );

  const level = {
    id: doc.name,
    title: meta.title ?? doc.name,
    intro: meta.intro ?? '',
    startHint: meta.startHint ?? '',
    winText: meta.winText ?? '',
    bellKeys: [...new Set(bells.map((b) => b.key))],
    doorPools: Object.fromEntries(doors.map((d, i) => [String(i), d.pool])),
    darkZones,
    map,
    cols: doc.cols,
    rows: doc.rows,
    layers,
  };

  return {
    level,
    parsed: {
      solids: wall, bells, doors, crystal, enemySpawns,
      playerSpawn: entry, portals, spawnPoints,
    },
  };
};

export const loadAsepriteMap = async (url, meta) =>
  fromAseprite(await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`loadAsepriteMap: ${url} -> ${r.status}`);
    return r.json();
  }), meta);
