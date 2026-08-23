export const INTERVALS = {
  p5: { name: 'quinta justa', semitones: 7 },
  m3: { name: 'terça menor', semitones: 3 },
  M3: { name: 'terça maior', semitones: 4 },
  p8: { name: 'oitava', semitones: 12 },
};

export const randomRoot = () => 48 + Math.floor(Math.random() * 24);
