import { createGame } from '../world.js';
import { fromAseprite } from './fromAseprite.js';

// Holds the player across maps: which doors are open, what each door and bell
// sings, and how much health is left. Without this, walking into a house and
// back out would reshuffle every interval the player just memorised.

const at = ({ x, y }) => `${x},${y}`;

const snapshot = (world) => ({
  doors: world.doors.map((d) => [at(d), { open: d.open, interval: d.interval, root: d.root }]),
  bells: world.bells.map((b) => [at(b), b.root]),
  hp: world.game.player.hp,
});

const restore = (world, memory) => {
  if (!memory) return;
  const doors = new Map(memory.doors);
  const bells = new Map(memory.bells);
  world.doors.forEach((d) => {
    const saved = doors.get(at(d));
    if (saved) Object.assign(d, saved);
  });
  world.bells.forEach((b) => {
    const saved = bells.get(at(b));
    if (saved !== undefined) b.root = saved;
  });
};

export const createSession = ({ urlFor, texts = {}, setHint, onEnd, onEnterMap }) => {
  const docs = new Map();
  const memories = new Map();
  const state = { world: null, name: null, hp: 3 };

  const loadDoc = async (name) => {
    if (!docs.has(name)) {
      const url = urlFor(name);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`session: ${url} -> ${res.status}`);
      // The tileset strip sits next to the JSON, so resolve it against that.
      docs.set(name, { doc: await res.json(), baseUrl: url.replace(/[^/]*$/, '') });
    }
    return docs.get(name);
  };

  const remember = () => {
    if (!state.world) return;
    const memory = snapshot(state.world);
    memories.set(state.name, memory);
    state.hp = memory.hp;
  };

  const enter = async (name, spawnAt) => {
    // The main loop keeps updating the map being left while the next one
    // loads. Freeze it first and snapshot it after the load, so damage taken
    // or doors opened during the wait are not thrown away.
    if (state.world) state.world.game.running = false;
    const { doc, baseUrl } = await loadDoc(name);
    remember();
    const { level, parsed } = fromAseprite(doc, { ...(texts[name] ?? {}), spawnAt, baseUrl });

    const world = createGame({
      level,
      parsed,
      setHint,
      onEnd,
      onPortal: (portal) => { void enter(portal.to, portal.spawn); },
    });
    world.resetRun(false);
    restore(world, memories.get(name));
    world.game.player.hp = state.hp;
    world.game.running = true;

    state.world = world;
    state.name = name;
    onEnterMap?.(name, world);
    return world;
  };

  const restart = async (name, spawnAt, { keepProgress }) => {
    // Snapshot before dropping the world: the map being restarted may hold
    // doors opened since the last time it was left.
    if (keepProgress) remember();
    else memories.clear();
    state.world = null;
    state.name = null;
    state.hp = 3;
    return enter(name, spawnAt);
  };

  return { enter, restart, state };
};
