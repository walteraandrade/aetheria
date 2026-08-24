# World size benchmark

Measured on 2026-08-24, Linux desktop, Chrome, canvas 640x352, TILE 32.
Bench lives in `bench/` — `npm run dev`, then open `/bench/index.html`.

The bench drives the real `createGame` (src/world.js) and `draw` (src/render.js)
over a procedurally generated map at ~22% wall density, same legend as
src/levels.js. Frame budget at 60fps is 16.67 ms.

## 1. Current code (no culling, `solids.some` collision)

Per-frame cost in ms.

| scenario | tiles | solids | draw() | terrain naive | terrain culled | update() | isSolid naive | isSolid grid |
|---|---|---|---|---|---|---|---|---|
| 60x23 (shipped map) | 1 380 | 432 | 0.11 | 0.15 | 0.08 | 0.038 | 0.0013 | 0.0001 |
| 100x100 | 10 000 | 2 347 | 0.54 | 0.50 | 0.07 | 0.280 | 0.0102 | 0.0002 |
| 200x200 | 40 000 | 8 717 | 1.77 | 1.77 | 0.07 | 1.323 | 0.0437 | ~0 |
| 200x200 + dark zone | 40 000 | 8 717 | 1.93 | 1.71 | 0.06 | 1.333 | 0.0440 | ~0 |
| 200x200 + 200 enemies | 40 000 | 8 717 | 2.03 | 1.64 | 0.06 | **9.672** | 0.0465 | 0.0001 |
| 400x400 | 160 000 | 33 166 | 6.78 | 6.61 | 0.08 | 3.355 | 0.0979 | ~0 |

Culled terrain is flat at ~0.07 ms regardless of map size — it only ever
touches the ~20x11 tiles the camera shows.

## 2. Sustainable ceiling (update + draw, vsync off)

Measured before and after `src/render.js` gained culling (both terrain paths
now only touch the tiles the camera can see).

| scenario | frame ms before | after | fps ceiling after |
|---|---|---|---|
| 60x23 shipped | 0.09 | 0.05 | 20 497 |
| 200x200 | 2.83 | **1.66** | 603 |
| 400x400 | 9.91 | **4.77** | 210 |
| 400x400 + 200 enemies | 41.81 | 44.41 | **23** |
| 1000x1000 | 63.44 | **26.05** | 38 |

Culling flattens the draw cost, so what is left in those numbers is `update()`.
The 200-enemy row does not improve at all: it was never a drawing problem.

200 enemies at 400x400 costs ~32 ms of the 41.8 ms frame: each enemy calls
`isSolid` (0.098 ms at that size) once or twice per tick. Collision x entity
count is the real ceiling, not the tile count.

## 3. With culling + Uint8Array collision grid

| scenario | tiles | solids | build ms | JS heap MB | terrain ms | isSolid ms |
|---|---|---|---|---|---|---|
| 200x200 | 40 000 | 8 717 | 6 | 4 | 0.07 | 0.0001 |
| 400x400 | 160 000 | 33 167 | 9 | 6 | 0.07 | 0.00015 |
| 1000x1000 | 1 000 000 | 201 087 | 46 | 23 | 0.07 | ~0 |
| 2000x2000 | 4 000 000 | 797 983 | 176 | 43 | 0.06 | 0.00005 |

Draw and collision go flat. What still scales is map load time and memory,
both from `parseMap` allocating one object per solid tile.

## Conclusions

- 200x200 (40 000 tiles, ~8x the whole Zelda 1 overworld) runs today with no
  changes at all: 2.83 ms/frame, ~6x headroom.
- Culling is done. The remaining fix is `solids.some` (src/world.js:58) ->
  a Uint8Array tile lookup, which is what still caps large maps and enemy
  counts.
- Enemy count, not world size, is what actually breaks first. Cap active
  enemies near the camera.
- Numbers are from a desktop. Divide by ~4 for a weak laptop or phone.
