import { ANIMALS } from './animals.js';

// Simple centre-line glyphs are intentionally used instead of font outlines:
// each stroke has an obvious start and can be followed by a toddler's finger.
const LETTER_PATHS = {
  A: ['M70 205 L150 35 L230 205', 'M105 135 L195 135'],
  B: ['M85 35 V205', 'M85 35 H155 Q225 35 225 85 Q225 125 155 125 H85', 'M155 125 Q235 125 235 165 Q235 205 155 205 H85'],
  C: ['M230 65 Q205 30 150 30 Q65 30 65 120 Q65 210 150 210 Q205 210 230 175'],
  D: ['M80 35 V205', 'M80 35 H140 Q230 35 230 120 Q230 205 140 205 H80'],
  E: ['M220 35 H80 V205 H220', 'M80 120 H190'],
  F: ['M80 205 V35 H225', 'M80 120 H190'],
  G: ['M230 65 Q205 30 150 30 Q65 30 65 120 Q65 210 150 210 Q205 210 230 175 V130 H165'],
  H: ['M75 35 V205', 'M225 35 V205', 'M75 120 H225'],
  I: ['M90 35 H210', 'M150 35 V205', 'M90 205 H210'],
  J: ['M85 35 H220', 'M180 35 V165 Q180 210 125 210 Q80 210 75 170'],
  K: ['M80 35 V205', 'M225 35 L80 135', 'M130 100 L230 205'],
  L: ['M80 35 V205 H225'],
  M: ['M65 205 V35 L150 125 L235 35 V205'],
  N: ['M70 205 V35 L230 205 V35'],
  O: ['M150 30 Q65 30 65 120 Q65 210 150 210 Q235 210 235 120 Q235 30 150 30 Z'],
  P: ['M80 205 V35 H155 Q230 35 230 95 Q230 145 155 145 H80'],
  Q: ['M150 30 Q65 30 65 120 Q65 210 150 210 Q235 210 235 120 Q235 30 150 30 Z', 'M175 165 L235 220'],
  R: ['M80 205 V35 H155 Q230 35 230 95 Q230 145 155 145 H80', 'M155 145 L235 205'],
  S: ['M225 60 Q200 30 150 30 Q75 30 75 85 Q75 120 150 120 Q225 120 225 165 Q225 210 150 210 Q95 210 70 180'],
  T: ['M55 35 H245', 'M150 35 V205'],
  U: ['M70 35 V145 Q70 210 150 210 Q230 210 230 145 V35'],
  V: ['M60 35 L150 210 L240 35'],
  W: ['M45 35 L90 205 L150 115 L210 205 L255 35'],
  X: ['M65 35 L235 205', 'M235 35 L65 205'],
  Y: ['M55 35 L150 125 L245 35', 'M150 125 V205'],
  Z: ['M65 35 H235 L65 205 H235'],
};

export const ALPHABET = Object.entries(LETTER_PATHS).map(([label, paths]) => ({
  id: label.toLowerCase(), label, spoken: label, paths,
}));

export const SHAPES = [
  { id: 'circle', label: 'Circle', spoken: 'circle', paths: ['M150 35 A85 85 0 1 1 149.9 35 Z'] },
  { id: 'square', label: 'Square', spoken: 'square', paths: ['M70 40 H230 V200 H70 Z'] },
  { id: 'triangle', label: 'Triangle', spoken: 'triangle', paths: ['M150 30 L245 205 H55 Z'] },
  { id: 'diamond', label: 'Diamond', spoken: 'diamond', paths: ['M150 25 L245 120 L150 215 L55 120 Z'] },
  { id: 'star', label: 'Star', spoken: 'star', paths: ['M150 25 L175 90 L245 92 L190 135 L210 205 L150 165 L90 205 L110 135 L55 92 L125 90 Z'] },
  { id: 'heart', label: 'Heart', spoken: 'heart', paths: ['M150 210 C120 180 55 140 55 85 C55 35 120 25 150 75 C180 25 245 35 245 85 C245 140 180 180 150 210 Z'] },
];

const NUMBER_PATHS = {
  one: ['M120 75 L155 35 V205', 'M105 205 H205'],
  two: ['M75 75 Q90 30 150 30 Q225 30 225 85 Q225 120 75 205 H230'],
  three: ['M80 55 Q110 30 160 30 Q225 30 225 80 Q225 120 165 120', 'M165 120 Q230 120 230 165 Q230 210 155 210 Q100 210 75 180'],
  four: ['M195 205 V35 L65 150 H235'],
  five: ['M220 35 H90 L80 115 Q120 95 165 105 Q230 115 230 165 Q230 210 155 210 Q100 210 75 180'],
  six: ['M220 55 Q195 30 155 30 Q70 30 70 125 Q70 210 155 210 Q230 210 230 155 Q230 105 165 105 Q105 105 75 145'],
  seven: ['M65 35 H235 L120 205'],
  eight: ['M150 30 Q80 30 80 80 Q80 120 150 120 Q220 120 220 80 Q220 30 150 30 Z', 'M150 120 Q70 120 70 165 Q70 210 150 210 Q230 210 230 165 Q230 120 150 120 Z'],
  nine: ['M225 105 Q195 135 145 135 Q75 135 75 85 Q75 30 150 30 Q230 30 230 120 Q230 210 150 210 Q105 210 80 185'],
  ten: ['M55 70 L85 35 V205', 'M185 30 Q130 30 130 120 Q130 210 185 210 Q240 210 240 120 Q240 30 185 30 Z'],
};

export const NUMBERS = Object.entries(NUMBER_PATHS).map(([spoken, paths], i) => ({
  id: String(i + 1), label: String(i + 1), spoken, paths,
}));

const QUADRUPED = ['M35 145 Q45 85 105 80 Q150 55 195 85 L225 75 Q260 80 260 110 Q250 130 225 125 L215 190', 'M85 125 L78 200', 'M175 125 L180 200'];
const BIRD = ['M55 145 Q75 80 145 90 Q175 45 215 65 Q235 80 215 95 Q245 110 260 135 Q205 130 175 155 Q110 205 55 145 Z', 'M135 110 Q105 125 105 160'];
const FISH = ['M45 120 Q95 55 190 85 L255 45 L235 120 L255 195 L190 155 Q95 185 45 120 Z', 'M95 100 Q130 120 95 140'];
const BUG = ['M150 55 V195', 'M145 100 Q80 35 55 95 Q50 155 145 145', 'M155 100 Q220 35 245 95 Q250 155 155 145'];
const GIRAFFE = ['M70 190 Q65 115 125 110 L155 40 Q170 20 205 35 L235 55 Q220 80 180 65 L170 150 Q205 160 220 195', 'M105 145 L95 210', 'M180 150 L185 210'];
const ELEPHANT = ['M45 145 Q45 75 120 70 Q180 55 220 95 L245 105 V180 Q225 185 220 145 Q185 165 165 175 L170 210', 'M85 155 L80 210', 'M220 105 Q275 110 245 190'];

function animalPaths(id) {
  if (['duck', 'owl', 'rooster'].includes(id)) return BIRD;
  if (['fish', 'shark', 'turtle', 'frog'].includes(id)) return FISH;
  if (['bee', 'butterfly'].includes(id)) return BUG;
  if (id === 'giraffe') return GIRAFFE;
  if (id === 'elephant') return ELEPHANT;
  return QUADRUPED;
}

export const TRACE_ANIMALS = ANIMALS.map(a => ({
  id: a.id, label: a.name[0].toUpperCase() + a.name.slice(1), spoken: a.name,
  art: a.art, paths: animalPaths(a.id),
}));

export const TRACE_CATEGORIES = {
  alphabet: { label: 'ABC', items: ALPHABET },
  shapes: { label: 'Shapes', items: SHAPES },
  numbers: { label: '123', items: NUMBERS },
  animals: { label: 'Animals', items: TRACE_ANIMALS },
};
