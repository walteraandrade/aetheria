import { ensureAudio } from './audio.js';
import { draw } from './render.js';
import { WORLD } from './levels.js';
import { createSession } from './maps/session.js';

const START_MAP = 'overworld';
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hintEl = document.getElementById('hint');
const btnAgain = document.getElementById('btn-again');

const TEXTS = {
  overworld: {
    title: WORLD.title,
    intro: WORLD.intro,
    startHint: WORLD.startHint,
    winText: WORLD.winText,
  },
  house: {
    title: 'Uma casa',
    startHint: 'Um sino mora aqui. Saia pela porta por onde entrou.',
  },
};

const onEnd = (won) => {
  const level = session.state.world?.level;
  document.getElementById('end-title').textContent = won ? 'A névoa se abre' : 'A névoa te engole';
  document.getElementById('end-text').textContent = won
    ? (level?.winText || WORLD.winText)
    : 'Seu corpo caiu, mas o ouvido fica. As portas que você já abriu continuam abertas.';
  document.getElementById('ov-end').classList.remove('hidden');
};

const session = createSession({
  urlFor: (name) => `/maps/${name}.json`,
  texts: TEXTS,
  setHint: (html) => { hintEl.innerHTML = html; },
  onEnd,
});

document.getElementById('start-title').textContent = WORLD.title;
document.getElementById('start-text').innerHTML = WORLD.intro;

document.addEventListener('keydown', (e) => {
  const world = session.state.world;
  if (!world) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  world.game.keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') world.interact();
  if (e.key.toLowerCase() === 'x') world.swing();
});
document.addEventListener('keyup', (e) => {
  const world = session.state.world;
  if (world) world.game.keys[e.key.toLowerCase()] = false;
});

let last = 0;
const loop = (ts) => {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  const world = session.state.world;
  if (world) {
    if (world.game.running) world.update(dt);
    draw(ctx, world);
  }
  requestAnimationFrame(loop);
};

const start = async (keepProgress) => {
  ensureAudio();
  document.getElementById('ov-start').classList.add('hidden');
  document.getElementById('ov-end').classList.add('hidden');
  await session.restart(START_MAP, undefined, { keepProgress });
};

document.getElementById('btn-start').addEventListener('click', () => { void start(false); });
btnAgain.addEventListener('click', () => { void start(!session.state.world?.game.win); });

requestAnimationFrame(loop);
