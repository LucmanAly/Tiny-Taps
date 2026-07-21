// Sticker Book: browse the animal stickers earned from big celebrations.
// Earned stickers show in full color; the rest wait as silhouettes.

import { ANIMALS } from '../data/animals.js';
import { earned } from '../engine/stickers.js';
import { S } from '../data/strings.js';
import { addTap } from '../engine/ui.js';

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="st-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#ffd54a"/><stop offset="100%" stop-color="#f0a416"/>
    </linearGradient>
  </defs>
  <rect x="14" y="12" width="72" height="76" rx="10" fill="#fff"/>
  <rect x="14" y="12" width="18" height="76" rx="9" fill="url(#st-i)"/>
  <path d="M60 28 L65 41 L79 41 L68 50 L72 63 L60 55 L48 63 L52 50 L41 41 L55 41 Z" fill="url(#st-i)"/>
  <circle cx="46" cy="74" r="7" fill="#7ed67e"/>
  <circle cx="66" cy="76" r="5" fill="#ff9fce"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, setReprompt } = ctx;
  let alive = true;

  const have = new Set(earned());
  const book = document.createElement('div');
  book.className = 'sticker-book';
  const count = document.createElement('div');
  count.className = 'sticker-count';
  count.textContent = `${have.size} / ${ANIMALS.length}`;
  const grid = document.createElement('div');
  grid.className = 'sticker-grid';
  book.appendChild(count);
  book.appendChild(grid);
  stage.appendChild(book);

  ANIMALS.forEach((a, i) => {
    const cell = document.createElement('div');
    cell.className = 'sticker-cell pop-in' + (have.has(a.id) ? ' earned' : '');
    cell.style.animationDelay = `${i * 0.03}s`;
    cell.innerHTML = `<img src="${a.art}" alt="${a.name}">`;
    if (have.has(a.id)) {
      addTap(cell, () => {
        if (!alive) return;
        audio.pop();
        cell.classList.remove('wiggle');
        void cell.offsetWidth;
        cell.classList.add('wiggle');
        speech.speak(`Your ${a.name} sticker!`);
        if (a.sound) {
          audio.load('animal:' + a.id, a.sound).then(() => {
            if (alive) audio.play('animal:' + a.id, { maxDuration: 2.2 });
          });
        }
      });
    }
    grid.appendChild(cell);
  });

  speech.speak(S.stickerBook(have.size), { interrupt: false });
  setReprompt(null);
  return () => { alive = false; };
}

export default {
  id: 'stickers',
  title: 'Stickers',
  icon: ICON,
  start,
};
