# Aetheria

Top-down action RPG where sound is world information. Doors sing intervals,
bells answer them, enemies telegraph attacks by singing. Ear training through
play: the answer is always spatial (move, dodge, strike), never "name the
interval".

Design rule: no quiz mechanics. If a mechanic asks the player to label a sound
instead of acting on it, it does not ship.

## Controls

- Arrows / WASD — move
- Space — listen / interact (door, bells)
- X — sword (strike bells to answer, hit enemies)

## Dev

```
npm install
npm run dev
```

Plain canvas + Web Audio, no engine. Sounds are synthesized at runtime with
random roots, so the player learns intervals, not absolute pitches.
