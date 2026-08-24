# Map pipeline

Maps are authored in Aseprite and consumed by the game as JSON.

```
assets/maps/<name>.aseprite  ──(tools/export-map.lua)──▶  public/maps/<name>.json
                                                                 │
                                              (src/maps/fromAseprite.js)
                                                                 ▼
                                                { level, parsed } ──▶ createGame
```

`fromAseprite` returns the exact shapes `parseMap` builds from the old string
maps, so nothing downstream had to change. `tools/verify-roundtrip.mjs` proves
it: the Aseprite overworld and the strings in `src/levels.js` parse identically.

## Document layout

Two tilemap layers and, optionally, slices.

| where | name | meaning |
|---|---|---|
| tilemap layer | anything but `entities` | terrain, exported bottom-to-top in document order; a tile with property `solid=true` collides |
| tilemap layer | `entities` | one marker tile per entity; the tile's `kind` property says what it is |
| slice | any | an entity too, when it carries a `kind` property; keeps its rectangle |

Terrain is **layered**, and it has to be: Tiny Swords tiles are transparent at
their edges, so a cliff drawn alone leaves the page background showing through
its cut-out base. The generated maps use two — `ground` (grass everywhere) and
`terrain` (cliffs over it) — matching the layer stack the Pixel Frog tilemap
guide describes. A cell blocks movement if *any* layer puts a solid tile on it.

Entity data lives on the **tileset tile**, not on the cell. Paint the same
marker tile twenty times and you get twenty entities sharing its properties.
For a one-off — a single door that sings something no other door sings — use a
slice instead.

## Entity kinds

| kind | properties | notes |
|---|---|---|
| `player` | — | starting position; interiors don't need one |
| `crystal` | — | the goal |
| `enemy` | — | spawn point |
| `bell` | `interval` | key into `INTERVALS` (`p5`, `m3`, `p8`, `M3`, …) |
| `door` | `pool` | comma-separated intervals the door may sing, e.g. `p5,m3,p8` |
| `portal` | `to`, `spawn`, `id` | `to` = map name, `spawn` = arrival point there, `id` = names *this* spot as an arrival point |
| `spawn` | `id` | a bare arrival point |
| `dark` | — | slice only; its rectangle becomes a dark zone |

A portal carrying an `id` is both an exit and an arrival point, so one tile can
be the door you leave by and the spot you land on coming back.

## Crossing between maps

`src/maps/session.js` owns the player across maps. On a portal it snapshots the
map being left — which doors are open, what each door and bell sings, current
health — and restores that snapshot on return. Without it, stepping into a house
and back out would reshuffle every interval the player just memorised.

Arriving on a portal does not immediately fire it: `game.portalLock` holds until
the player's hitbox clears the tile.

## Commands

```bash
npm run map:build     # regenerate .aseprite files from tools/map-defs.mjs, then export
npm run map:export    # export overworld.aseprite only (use once editing by hand)
npm run map:verify    # prove the Aseprite overworld still matches src/levels.js
```

`tools/map-defs.mjs` and `tools/strings-to-aseprite.lua` exist only to bootstrap
the `.aseprite` files from the original string maps. Once you start editing maps
in Aseprite, they become dead weight — delete them and keep `export-map.lua`.

## Tile size

`TILE` lives in `src/levels.js` and is currently **64**, matching the Tiny
Swords tilemap grid. Alongside it, `SCALE = TILE / 32` — every distance, speed
and hitbox in the game was authored against a 32px tile, so they are written as
`40 * S` rather than as bare numbers. Changing tile size is a one-line edit
plus a `npm run map:build`; `tools/map-defs.mjs` passes `TILE` down to the
Aseprite generator so the documents follow.

The canvas is 1024x704 — 16x11 tiles, the same field of view as Zelda 1. CSS
never upscales it, because a non-integer stretch ruins pixel art.

## Tilesets

`tools/export-map.lua` writes one strip per layer next to the JSON, named
`<map>-<layer>.png`. Tile index N in a layer's `cells` array is the Nth cell of
that layer's strip, tile 0 (empty) included, so the renderer needs no offset
maths.

`src/render.js` blits the layers bottom-to-top, culled to the camera window,
and falls back to flat rectangles while the images load. `src/tileset.js`
caches them by URL.

Tiles are cut from the real Tiny Swords sheets by `tools/slice-tiles.lua`,
which documents the 9x6 layout both sheets share. `CUTS` there maps a name to
a grid position — the only place to edit when picking different tiles.

Caveat: `app.open` switches Aseprite's active sprite, so the slicer restores it
afterwards. Without that, the next `app.command.*` lands on the sheet instead
of the document being built.

### What is not done

Every wall is the plain cliff body. The sheets carry proper edge and corner
pieces, but choosing between them needs real auto-tiling — nine variants
selected by neighbour mask. A single-rule guess leaves floating strips where a
wall is one tile tall, which is why it was backed out. `cliff-top` sits unused
in the tileset waiting for that.

Nothing in the pack is auto-tiled for you: the Pixel Frog tilemap guide
describes manual placement with per-piece examples, not a bitmask scheme.
