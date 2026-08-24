# World size benchmark

Measured on 2026-08-24, Linux desktop, headless Chrome 148 (software
rendering, no GPU), canvas 1024x704, TILE 64 — the configuration the bench
ships with. Bench lives in `bench/` — `npm run dev`, then open
`/bench/index.html` and press the three buttons.

The bench drives the real `createGame` (src/world.js) and `draw` (src/render.js)
over a procedurally generated map at ~22% wall density, same legend as
src/levels.js. Frame budget at 60fps is 16.67 ms.

## 1. Per-frame cost

Cost in ms. `draw()` is the shipped renderer, which already culls. `terrain
naive` and `terrain culled` are the same flat terrain pass over the whole map
and over the camera window, so the pair isolates what culling buys.

| scenario | tiles | solids | draw() | terrain naive | terrain culled | update() | isSolid naive | isSolid grid |
|---|---|---|---|---|---|---|---|---|
| 60x23 (shipped map) | 1 380 | 432 | 0.06 | 0.22 | 0.14 | 0.027 | 0.0019 | 0.0002 |
| 100x100 | 10 000 | 2 347 | 0.07 | 0.71 | 0.14 | 0.364 | 0.0089 | 0.0002 |
| 200x200 | 40 000 | 8 717 | 0.06 | 2.27 | 0.13 | 1.788 | 0.0365 | ~0 |
| 200x200 + dark zone | 40 000 | 8 717 | 0.27 | 2.34 | 0.13 | 1.802 | 0.0365 | ~0 |
| 200x200 + 200 enemies | 40 000 | 8 717 | 0.28 | 2.34 | 0.13 | **12.830** | 0.0364 | ~0 |
| 400x400 | 160 000 | 33 166 | 0.07 | 8.48 | 0.14 | 4.242 | 0.1101 | ~0 |

`draw()` and culled terrain are flat regardless of map size — they only ever
touch the ~17x12 tiles the camera shows. Naive terrain grows with the map.

## 2. Sustainable ceiling (update + paint, vsync off)

Each column is `update()` plus one paint, measured in the same run:

- **naive** — full-map terrain pass, what the renderer did before culling
- **culled** — same pass, camera window only
- **draw()** — the shipped renderer: culled terrain, entities, darkness, HUD

| scenario | naive ms | culled ms | draw() ms | fps ceiling (draw) | worst frame |
|---|---|---|---|---|---|
| 60x23 shipped | 0.23 | 0.15 | 0.05 | 21 696 | 0.8 ms |
| 200x200 | 4.02 | **1.66** | 1.78 | 560 | 3.4 ms |
| 400x400 | 14.53 | **5.36** | 5.32 | 188 | 15.6 ms |
| 400x400 + 200 enemies | 59.00 | 48.99 | 51.41 | **19** | 54.7 ms |
| 1000x1000 | 81.40 | **25.93** | 24.62 | 41 | 25.5 ms |

Culling flattens the drawing cost, so what is left in those numbers is
`update()`. The 200-enemy row barely improves: it was never a drawing problem.

200 enemies at 400x400 costs ~46 ms of the 51.4 ms frame: each enemy calls
`isSolid` (0.11 ms at that size) once or twice per tick. Collision x entity
count is the real ceiling, not the tile count.

## 3. With culling + Uint8Array collision grid

| scenario | tiles | solids | build ms | JS heap MB | terrain ms | isSolid ms |
|---|---|---|---|---|---|---|
| 200x200 | 40 000 | 8 717 | 2 | 7 | 0.11 | 0.00005 |
| 400x400 | 160 000 | 33 167 | 6 | 8 | 0.12 | 0.00005 |
| 1000x1000 | 1 000 000 | 201 087 | 45 | 22 | 0.15 | ~0 |
| 2000x2000 | 4 000 000 | 797 983 | 184 | 80 | 0.11 | 0.00005 |

Draw and collision go flat. What still scales is map load time and memory,
both from `parseMap` allocating one object per solid tile.

## Conclusions

- 200x200 (40 000 tiles, ~8x the whole Zelda 1 overworld) runs today at
  1.78 ms/frame, ~9x headroom.
- Culling is done. The remaining fix is `solids.some` (src/world.js:67) ->
  a Uint8Array tile lookup, which is what still caps large maps and enemy
  counts.
- Enemy count, not world size, is what actually breaks first. Cap active
  enemies near the camera.
- Numbers come from software rendering. A machine with GPU compositing draws
  faster; a phone is slower. Compare rows against each other, not against an
  absolute budget.
