export const INTERVALS = {
  p5: { name: 'perfect fifth', semitones: 7 },
  m3: { name: 'minor third', semitones: 3 },
  M3: { name: 'major third', semitones: 4 },
  tritone: { name: 'tritone', semitones: 6 },
  p8: { name: 'octave', semitones: 12 },
};

export const randomRoot = () => 48 + Math.floor(Math.random() * 24);
