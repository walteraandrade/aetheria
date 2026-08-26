import { ensureAudio } from './audio.js';
import { draw } from './render.js';
import { createSession } from './maps/session.js';
import { LOCALES, getLocale, setLocale, t } from './strings.js';

const START_MAP = 'overworld';
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const hintEl = document.getElementById('hint');
const btnAgain = document.getElementById('btn-again');
const langSelect = document.getElementById('lang-select');

// Read at map-load time rather than captured once, so switching language and
// walking into a house gets the house's copy in the new language.
const textsFor = (name) => (name === START_MAP
  ? {
    title: t('world.title'),
    intro: t('world.intro'),
    startHint: t('world.startHint'),
    winText: t('world.winText'),
  }
  : {
    title: t(name + '.title'),
    startHint: t(name + '.startHint'),
  });

const onEnd = (won) => {
  document.getElementById('end-title').textContent = won ? t('end.win') : t('end.lose');
  document.getElementById('end-text').textContent = won ? t('world.winText') : t('end.loseText');
  const end = document.getElementById('ov-end');
  end.classList.toggle('lost', !won);
  end.classList.remove('hidden');
};

const session = createSession({
  urlFor: (name) => `/maps/${name}.json`,
  textsFor,
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
  if (!session.state.world?.game.running) hintEl.innerHTML = t('world.startHint');
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

applyLocale();

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
