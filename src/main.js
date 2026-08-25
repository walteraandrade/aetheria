import { ensureAudio } from './audio.js';
import { createGame } from './world.js';
import { draw } from './render.js';
import { WORLD } from './levels.js';
import { LOCALES, getLocale, setLocale, t } from './strings.js';

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hintEl = document.getElementById('hint');
const btnAgain = document.getElementById('btn-again');
const langSelect = document.getElementById('lang-select');

const onEnd = (won) => {
  document.getElementById('end-title').textContent = won ? t('end.win') : t('end.lose');
  document.getElementById('end-text').textContent = won ? t('world.winText') : t('end.loseText');
  document.getElementById('ov-end').classList.remove('hidden');
};

const world = createGame({
  level: WORLD,
  setHint: (html) => { hintEl.innerHTML = html; },
  onEnd,
});

const applyLocale = () => {
  document.documentElement.lang = t('lang.tag');
  document.title = t('ui.title');
  document.getElementById('subtitle').textContent = t('ui.subtitle');
  document.getElementById('controls').innerHTML = t('ui.controls');
  document.getElementById('lang-label').textContent = t('ui.language');
  document.getElementById('btn-start').textContent = t('ui.start');
  btnAgain.textContent = t('ui.again');
  document.getElementById('start-title').textContent = t('world.title');
  document.getElementById('start-text').innerHTML = t('world.intro');
  if (!world.game.running) hintEl.innerHTML = t('world.startHint');
};

LOCALES.forEach((locale) => {
  const opt = document.createElement('option');
  opt.value = locale;
  opt.textContent = locale;
  langSelect.appendChild(opt);
});
langSelect.value = getLocale();
langSelect.addEventListener('change', () => {
  setLocale(langSelect.value);
  applyLocale();
});

world.resetRun(false);
applyLocale();

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
