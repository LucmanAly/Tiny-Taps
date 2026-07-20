// Game registry. Each game exports { id, title, icon, start(ctx) -> cleanup }.

import peekaboo from './peekaboo.js';
import sounds from './sounds.js';
import colors from './colors.js';
import shapes from './shapes.js';
import counting from './counting.js';
import puzzle from './puzzle.js';
import feedme from './feedme.js';
import coloring from './coloring.js';
import memory from './memory.js';
import music from './music.js';
import bubbles from './bubbles.js';
import stickers from './stickers.js';

export const games = [
  peekaboo,
  sounds,
  colors,
  shapes,
  counting,
  puzzle,
  feedme,
  coloring,
  memory,
  music,
  bubbles,
  stickers,
];
