// Game registry. Each game exports { id, title, icon, start(ctx) -> cleanup }.

import peekaboo from './peekaboo.js';
import sounds from './sounds.js';
import colors from './colors.js';
import shapes from './shapes.js';
import counting from './counting.js';
import puzzle from './puzzle.js';
import feedme from './feedme.js';
import coloring from './coloring.js';
import bubbles from './bubbles.js';

export const games = [
  peekaboo,
  sounds,
  colors,
  shapes,
  counting,
  puzzle,
  feedme,
  coloring,
  bubbles,
];
