export const INTERVALS = {
  p5: { name: 'quinta justa', semitones: 7 },
  m3: { name: 'terça menor', semitones: 3 },
  p8: { name: 'oitava', semitones: 12 },
};

export const BELL_KEYS = ['p5', 'm3', 'p8'];

export const randomRoot = () => 48 + Math.floor(Math.random() * 24);
