// Sticker collection: a predictable, explainable reward schedule shared by
// every game in the app (not just the ones that happen to call
// celebrate.big()) — one sticker every 5 completed rounds, anywhere.
// Purely local, no streaks shown, no pressure — just a book that fills up.

import { ANIMALS, animal } from '../data/animals.js';
import * as speech from './speech.js';

const KEY = 'tinytaps-stickers';
const WIN_KEY = 'tinytaps-wins';
const WINS_PER_STICKER = 5;

export function earned() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch (e) { return []; }
}

// Awards a sticker: `preferredId`'s animal if given and not yet earned,
// otherwise a random not-yet-earned animal. Returns null once every animal
// is collected.
function award(preferredId) {
  const have = new Set(earned());
  let a = preferredId && !have.has(preferredId) ? animal(preferredId) : null;
  if (!a) {
    const pool = ANIMALS.filter(x => !have.has(x.id));
    if (!pool.length) return null;
    a = pool[Math.floor(Math.random() * pool.length)];
  }
  const list = [...have, a.id];
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage full */ }
  return { ...a, bookComplete: list.length === ANIMALS.length };
}

// Call once per completed round, from anywhere in the app. Awards a sticker
// every 5th win — predictable and explainable, and doesn't empty the pool
// in one sitting. `preferredId` (e.g. the animal coming up next) is used
// when given and still unearned, so the reward doubles as a preview.
// Returns the newly earned animal, or null (the common case, or a full book).
export function recordWin(preferredId) {
  const wins = Number(localStorage.getItem(WIN_KEY) || 0) + 1;
  try { localStorage.setItem(WIN_KEY, String(wins)); } catch (e) { /* storage full */ }
  if (wins % WINS_PER_STICKER !== 0) return null;
  return award(preferredId);
}

// Brief non-blocking toast: the sticker art floats up bottom-center.
export function showToast(a) {
  const t = document.createElement('div');
  t.className = 'sticker-toast';
  t.innerHTML = `<img src="${a.art}" alt=""><div class="sticker-toast-star">★</div>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
  if (a.bookComplete) speech.speak('You collected every sticker! Amazing!');
}
