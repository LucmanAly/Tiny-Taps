// Sticker collection: every big celebration can award an animal sticker.
// Purely local, no streaks, no pressure — just a book that fills up.

import { ANIMALS } from '../data/animals.js';

const KEY = 'tinytaps-stickers';

export function earned() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch (e) { return []; }
}

// Awards one random not-yet-earned animal, or null when the book is full.
export function award() {
  const have = new Set(earned());
  const pool = ANIMALS.filter(a => !have.has(a.id));
  if (!pool.length) return null;
  const a = pool[Math.floor(Math.random() * pool.length)];
  localStorage.setItem(KEY, JSON.stringify([...have, a.id]));
  return a;
}

// Brief non-blocking toast: the sticker art floats up bottom-center.
export function showToast(a) {
  const t = document.createElement('div');
  t.className = 'sticker-toast';
  t.innerHTML = `<img src="${a.art}" alt=""><div class="sticker-toast-star">★</div>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
