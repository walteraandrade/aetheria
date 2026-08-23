import { ensureAudio } from './audio.js';
import { createGame } from './world.js';
import { draw } from './render.js';
import { WORLD } from './levels.js';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hintEl = document.getElementById('hint');
const btnAgain = document.getElementById('btn-again');

const onEnd = (won) => {
  document.getElementById('end-title').textContent = won ? 'A névoa se abre' : 'A névoa te engole';
  document.getElementById('end-text').textContent = won
    ? WORLD.winText
    : 'Seu corpo caiu, mas o ouvido fica. As portas que você já abriu continuam abertas.';
  document.getElementById('ov-end').classList.remove('hidden');
};

const world = createGame({
  level: WORLD,
  setHint: (html) => { hintEl.innerHTML = html; },
  onEnd,
});
world.resetRun(false);

document.getElementById('start-title').textContent = WORLD.title;
document.getElementById('start-text').innerHTML = WORLD.intro;

document.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  world.game.keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') world.interact();
  if (e.key.toLowerCase() === 'x') world.swing();
});
document.addEventListener('keyup', (e) => { world.game.keys[e.key.toLowerCase()] = false; });

let last = 0;
const loop = (ts) => {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  if (world.game.running) world.update(dt);
  draw(ctx, world);
  requestAnimationFrame(loop);
};

const start = (keepDoors) => {
  ensureAudio();
  document.getElementById('ov-start').classList.add('hidden');
  document.getElementById('ov-end').classList.add('hidden');
  world.resetRun(keepDoors);
  world.game.running = true;
};

document.getElementById('btn-start').addEventListener('click', () => start(false));
btnAgain.addEventListener('click', () => start(!world.game.win));

requestAnimationFrame(loop);
