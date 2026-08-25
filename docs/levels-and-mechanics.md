# Aetheria — Level & Mechanic Design Exploration

> **Pivot (2026-08-23):** levels are dead; Aetheria is one contiguous world
> (Zelda-1 style). §4's curriculum survives as *regions and gates* in that
> world, not as a level sequence. Current skeleton: bell temple (west), open
> field with a roaming singer (center), boss room (east) behind a gate that
> sings M3 — whose only matching bell sits inside the temple sanctum.
> Progression = ear vocabulary: a door is passable when you have *found and
> heard* the bell that answers it, wherever it stands. Answering works at any
> distance (strike the bell after hearing the door), so held interval memory
> is the traversal skill. The Echo Maze probe mechanic was cut: it was an
> oracle (ask → answer), which breaks the game's grammar — the world sings on
> its own and the player acts; it never answers queries.

> **Cut for v1.0 (2026-08-25):** **ripple-reveal darkness (mechanic #6) is out.**
> The dark grove that used it is gone; the east biome behind the M3 gate is now
> a lit **boss room**. The boss is the enemy FSM with 8 HP and three attacks,
> each announced by a different sung interval and answered spatially:
> p5 → charge (leave the line), m3 → expanding blast (get far),
> tritone → closing ring (press in against the singer). Killing it wins the run.
> Footstep and shout ripples went out with the darkness — they only existed to
> light it. L3 (Echo Maze) and L5 (Tritone Tower) below are historical design
> notes, not the shipped v1.0.

Research + codebase inventory synthesis. Goal: design new levels and mechanics
using tools we already have (or can build cheaply), keeping the core rule:
**the player always acts on sound spatially, never labels it.**

## 1. What the research found

### The niche is empty (good news)

- Every dedicated ear-training product (ToneGym, EarMaster, tonedear, Theta
  Music) is quiz-shaped: the player names or selects the interval.
- Every sound-mechanic action game (Dark Echo, Perception, The Vale, A Blind
  Legend, NecroDancer, Hi-Fi Rush) uses sound as input/feedback, never as a
  pitch-relationship curriculum.
- **No game found where enemies telegraph attacks by singing intervals.** That
  pairing — interval semantics + spatial combat reaction — is our clearest
  differentiation. No direct precedent.

### Patterns worth stealing

| Pattern | Source | Maps to Aetheria as |
|---|---|---|
| Fading reveal: sound paints the world, then decays | Dark Echo, Perception | Rooms visible only inside expanding ripples |
| Cue stacking: direction says *where*, quality says *what* | The Vale, A Blind Legend | Stereo pan = enemy origin; interval = attack type |
| Keynote vs signal: each area has a tonal "home", deviations demand action | Papa Sangre | Per-room drone root; door/enemy sings against it |
| Near-miss forgiveness / auto-calibration | Crypt of the NecroDancer | Generous dodge windows; wrong bell re-sings instead of only punishing |
| Aimed sound chains (propagation you direct, not answer) | Genshin Melodic Blooms, Fract OSC | Bell chains: struck bell passes its note to the next |
| Interval-shape-as-identity | Ocarina of Time (Saria's tritone) | Each enemy/door type owns a signature interval, learned by feel |
| Mix-layering as feedback | Metal: Hellsinger, Hi-Fi Rush | Correct reads unmute music layers — competence is audible, no HUD |
| Confound the signal late-game | Blind Drive | Decoy near-intervals, reverb rooms that blur clarity |

## 2. What we already have (codebase inventory)

- `playNote` / `singInterval` in `src/audio.js` — MIDI-based, timbre per call,
  random roots (players learn intervals, not pitches).
- `INTERVALS` / `BELL_KEYS` in `src/intervals.js` — 3 intervals (p5, m3, p8);
  adding more is one line each.
- Enemy FSM template: `patrol → sing (telegraph) → dash|ring → recover` —
  hardcoded to one instance but a clean mold for new enemy types.
- `bells` is already an array; `ripple()`, `hurtPlayer`, `endRun` are reusable.

### Gaps (build order matters)

1. **No level abstraction** — `MAP` is a single hardcoded const in
   `src/world.js`; door/enemy/crystal are singular objects. Biggest blocker.
2. **No stereo panning** — trivial to add (`StereoPannerNode`, pan by
   `dx / half-screen`), unlocks the whole "direction as information" axis.
3. No master gain bus, no scheduler, no camera (map must fit 640×352 for now).

## 3. Proposed mechanics (cheapest first)

1. **Stereo pan on every world sound** — pan by source x relative to player.
   ~15 lines. Prerequisite for M3 (Echo Maze) and directional combat.
2. **More intervals** — add `M3`, `p4`, `M2`/`m2`, `tritone` to `INTERVALS`.
   Introduce as contrast pairs: easy pairs first (p8 vs m3), close pairs later
   (p5 vs p4, M3 vs m3).
3. **Interval-signature enemies** — clone the FSM: e.g. a tritone enemy whose
   telegraph is *rising* (attack toward you) vs *falling* (retreat/safe window).
   Direction of the interval becomes information, not just its size.
4. **Bell chains** — door sings a 2-interval melody; player must strike bells
   in order. Uses existing `bells` array + a small sequence check.
5. **Keynote drone per room** — a quiet looping root note. Consonance against
   the drone = safe, dissonance = danger. One oscillator + master gain.
6. ~~**Ripple-reveal darkness**~~ — **cut from v1.0.** A dark room where
   geometry is drawn only inside active ripples. Sound as sight, but it made
   the east biome a navigation puzzle instead of a combat space, and it
   competed with the interval reading for the player's attention.
7. **Music layers as progress feedback** — each solved door / correct dodge
   unmutes a layer. Needs a master bus + simple loop scheduler.
8. **Decoy intervals (late game)** — enemy sings a near-interval fake
   (p4 pretending to be p5). Only after the player is fluent.

## 4. Proposed level curriculum

- **L1 — Bell Hall** (exists): p5 / m3 / p8, one door, one enemy. Teaches the
  full loop: listen → compare → strike → fight.
- **L2 — Twin Doors**: two doors, adds `p4`. First close pair (p5 vs p4).
  Enemy gains a third attack telegraphed by p4. Mechanic: nothing new, just a
  harder ear.
- **L3 — Echo Maze** (built, iterated): dark ripple-reveal maze, **no combat**.
  Space probes the corridor the player faces: it answers consonant (M3/p5/p8,
  varied) if it leads closer to the exit, dissonant (m2/tritone) if away, a
  dull thud if wall. Every junction is a consonance-categorization decision.
  A periodic mono hum encodes remaining path distance on a tension ladder
  (m2 → tritone → M3 → p5 → p8) as passive progress feedback. Design lesson
  learned: panning the answers toward the goal kills the mechanic — direction
  is strictly stronger information, so pitch never gets to decide. Sound
  direction must never answer the same question pitch is asking.
- **L4 — The Choir**: bell chains (2-interval melodies), two enemies with
  distinct interval signatures active at once. First time the player must
  track *whose* voice is whose (timbre + pan).
- **L5 — Tritone Tower (boss)**: keynote drone; boss cycles 3–4 attacks, each
  telegraphed by a different interval against the drone; decoy near-intervals
  in phase 2; music layers unmute as the player lands correct reads. Final
  exam, still zero labels on screen.

## 5. Engineering prerequisite

Before L2: extract `MAP` into level definitions (array of `{map, bellKeys,
enemies, doors}`), make `parseMap`/`createGame` take a level def, and
generalize `door`/`enemy` singulars into arrays. Small refactor, unblocks
everything above.

## 6. v2 — parked, not shipped

Ideas that came up during v1.0 and were deliberately left out. None of them
are in the code.

- **Ripple-reveal darkness**, revisited: as a short *corridor* between regions
  rather than a whole biome, so it never competes with combat reading.
- **Keynote drone per room** (#5) and **music layers as progress** (#7): both
  need a master gain bus and a scheduler, which v1.0 does not have.
- **Decoy near-intervals** (#8) for a boss phase 2 — p4 pretending to be p5.
  Only worth it once the player is fluent; v1.0's boss has no phases.
- **Bell chains** (#4): a door sings a two-interval melody, bells struck in
  order. Wants a sequence check on the existing `bells` array.
- **A second enemy kind active at once** (L4, "The Choir"): tracking *whose*
  voice is whose, by timbre and pan.
- **Healing or checkpoints.** v1.0 gives 3 HP, no recovery, and contact damage
  drains 1 HP per second — reaching the boss with full health is the hard part,
  not the boss.
- **Camera or map fit for the gate corridor.** The M3 gate is a one-tile gap in
  a two-tile-thick wall; lining up with it is fiddlier than it should be.

## 7. Next session — found while playing v1.0

Ordered by how much they block a first-time player. Found on 2026-08-25 by
playing the build start to finish; none of them are code defects.

1. **Contact damage is the real killer.** Standing next to an enemy costs 1 HP
   per second (`patrol`/`recover` states), the sword reaches ~50px, and there
   is no healing. Any hesitation inside sword range is a death. Nine deaths in
   one session came from this, not from misreading an interval.
2. **The M3 gate corridor is a one-tile gap** in a two-tile-thick wall. The
   player hitbox is 18px in a 32px opening, so a run down the field arrives
   misaligned and bumps the wall with no feedback about why.
3. **The bell↔gate round trip is long.** Hearing the east gate and answering it
   means crossing the whole field twice, past the roaming enemy, on 3 HP.
4. **Enemies respawn on retry but doors stay open.** Correct as designed, but it
   means the grunt must be re-cleared on every attempt at the boss.
