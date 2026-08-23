let ctx = null;

export const ensureAudio = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
};

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

const playNote = (midi, delay, dur, type, gain, pan = 0) => {
  const when = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = midiToFreq(midi);
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(g);
  if (ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(ctx.destination);
  } else {
    g.connect(ctx.destination);
  }
  osc.start(when);
  osc.stop(when + dur + 0.05);
};

export const singInterval = (semitones, root, type, gain, pan = 0, delay = 0) => {
  playNote(root, delay + 0.03, 0.45, type, gain, pan);
  playNote(root + semitones, delay + 0.53, 0.45, type, gain, pan);
};

export const sfx = {
  sword: () => playNote(70, 0, 0.08, 'square', 0.05),
  step: () => playNote(45, 0, 0.06, 'triangle', 0.05),
  pulse: () => playNote(64, 0, 0.18, 'triangle', 0.12),
  thud: () => playNote(31, 0.3, 0.12, 'square', 0.1),
  hitEnemy: (pan = 0) => { playNote(76, 0, 0.1, 'square', 0.07, pan); playNote(83, 0.07, 0.12, 'square', 0.07, pan); },
  hurt: () => playNote(38, 0, 0.35, 'sawtooth', 0.16),
  doorOpen: (pan = 0) => [0, 4, 7, 12].forEach((s, i) => playNote(72 + s, i * 0.09, 0.3, 'triangle', 0.14, pan)),
  victory: () => [0, 7, 12, 16, 19].forEach((s, i) => playNote(72 + s, i * 0.12, 0.4, 'triangle', 0.14)),
  enemyDie: (pan = 0) => [12, 7, 3, 0].forEach((s, i) => playNote(60 + s, i * 0.08, 0.2, 'sawtooth', 0.08, pan)),
};
