import { ensureAudio } from './audio.js';
import { createGame } from './world.js';
import { draw } from './render.js';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hintEl = document.getElementById('hint');

const setHint = (html) => { hintEl.innerHTML = html; };

const onEnd = (won) => {
  document.getElementById('end-title').textContent = won ? 'A névoa se abre' : 'A névoa te engole';
  document.getElementById('end-text').textContent = won
    ? 'Você abriu a porta pelo ouvido e leu os cantos da criatura. É assim que Aetheria fala.'
    : 'Seu corpo caiu, mas o ouvido fica. A porta que você já abriu continua aberta.';
  document.getElementById('ov-end').classList.remove('hidden');
};

const world = createGame({ setHint, onEnd });
const { game } = world;
window.game = game;
game.step = (dt) => { if (game.running) world.update(dt); };

document.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  game.keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') world.interact();
  if (e.key.toLowerCase() === 'x') world.swing();
});
document.addEventListener('keyup', (e) => { game.keys[e.key.toLowerCase()] = false; });

let last = 0;
const loop = (ts) => {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  if (game.running) world.update(dt);
  draw(ctx, world);
  requestAnimationFrame(loop);
};

const start = (keepDoor) => {
  ensureAudio();
  document.getElementById('ov-start').classList.add('hidden');
  document.getElementById('ov-end').classList.add('hidden');
  world.resetRun(keepDoor);
  game.running = true;
};

document.getElementById('btn-start').addEventListener('click', () => start(false));
document.getElementById('btn-again').addEventListener('click', () => start(!game.win));

world.resetRun(false);
requestAnimationFrame(loop);
