// Sticker collection: a predictable, explainable reward schedule shared by
// every game in the app (not just the ones that happen to call
// celebrate.big()) — one sticker every 5 completed rounds, anywhere.
// Purely local, no streaks shown, no pressure — just a book that fills up.
//
// Three sets fill the book: the animals, the Shape Builder toys, and the
// treats from Feed Me. Animal stickers keep their plain animal ids (so books
// saved before the other sets existed still count); the rest are prefixed.

import { ANIMALS, FOODS, displayArt } from '../data/animals.js';
import { BUILDS, buildSvg } from '../data/builds.js';
import * as speech from './speech.js';
import { childKey } from './children.js';

const KEY = 'tinytaps-stickers';
const WIN_KEY = 'tinytaps-wins';
const WINS_PER_STICKER = 5;

const TOY_NAMES = { ladybug: 'ladybug', snowman: 'snowman' };

export const STICKER_SETS = [
  {
    id: 'animals', label: 'Animals',
    // The book shows the photo where one exists; scenes use the cut-out
    // cartoon so stickers sit in the picture without a photo's background.
    items: ANIMALS.map(a => ({ id: a.id, name: a.name, img: displayArt(a), cutout: a.art, sound: a.sound || null })),
  },
  {
    id: 'toys', label: 'Toys',
    items: BUILDS.map(b => ({
      id: 'toy:' + b.id, name: TOY_NAMES[b.id] || b.id, svg: buildSvg(b), sfx: b.go.sound || 'squeak',
    })),
  },
  {
    id: 'treats', label: 'Treats',
    items: FOODS.map(f => ({ id: 'food:' + f.id, name: f.name, img: f.art, sfx: 'chomp' })),
  },
];

const ALL = STICKER_SETS.flatMap(set => set.items.map(item => ({ ...item, set: set.id })));
const BY_ID = new Map(ALL.map(item => [item.id, item]));

export const TOTAL = ALL.length;

export function sticker(id) {
  return BY_ID.get(id) || null;
}

// The sticker's picture as markup: a photo/SVG file or an inline toy SVG.
// `cutout` asks for the transparent cartoon version where there is one.
export function stickerArt(item, { cutout = false } = {}) {
  const src = (cutout && item.cutout) || item.img;
  return src ? `<img src="${src}" alt="" draggable="false">` : item.svg;
}

// Plays a sticker's own sound: an animal's real recording, or a toy/treat
// effect. Recordings are loaded on first use.
export function playSticker(audio, item) {
  if (item.sound) {
    const name = 'animal:' + item.id;
    audio.load(name, item.sound).then(() => audio.play(name, { maxDuration: 2.2 }));
  } else if (item.sfx && item.sfx.startsWith('animal:')) {
    const a = ANIMALS.find(x => x.id === item.sfx.slice(7));
    if (a && a.sound) audio.load(item.sfx, a.sound).then(() => audio.play(item.sfx, { maxDuration: 2.2 }));
  } else if (item.sfx && typeof audio[item.sfx] === 'function') {
    audio[item.sfx]();
  } else {
    audio.pop();
  }
}

export function earned() {
  try {
    const list = JSON.parse(localStorage.getItem(childKey(KEY)) || '[]');
    return Array.isArray(list) ? list.filter(id => BY_ID.has(id)) : [];
  } catch (e) { return []; }
}

// Awards a sticker: `preferredId`'s sticker if given and not yet earned,
// otherwise a random not-yet-earned one from any set. Returns null once the
// whole book is collected.
function award(preferredId) {
  const have = new Set(earned());
  let s = preferredId && !have.has(preferredId) ? sticker(preferredId) : null;
  if (!s) {
    const pool = ALL.filter(x => !have.has(x.id));
    if (!pool.length) return null;
    s = pool[Math.floor(Math.random() * pool.length)];
  }
  const list = [...have, s.id];
  try { localStorage.setItem(childKey(KEY), JSON.stringify(list)); } catch (e) { /* storage full */ }
  return { ...s, bookComplete: list.length === ALL.length };
}

// Call once per completed round, from anywhere in the app. Awards a sticker
// every 5th win — predictable and explainable, and doesn't empty the pool
// in one sitting. `preferredId` (e.g. the animal coming up next) is used
// when given and still unearned, so the reward doubles as a preview.
// Returns the newly earned sticker, or null (the common case, or a full book).
export function recordWin(preferredId) {
  const wins = Number(localStorage.getItem(childKey(WIN_KEY)) || 0) + 1;
  try { localStorage.setItem(childKey(WIN_KEY), String(wins)); } catch (e) { /* storage full */ }
  if (wins % WINS_PER_STICKER !== 0) return null;
  return award(preferredId);
}

// Brief non-blocking toast: the sticker art floats up bottom-center.
export function showToast(s) {
  const t = document.createElement('div');
  t.className = 'sticker-toast';
  t.innerHTML = `${stickerArt(s)}<div class="sticker-toast-star">★</div>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
  if (s.bookComplete) speech.speak('You collected every sticker! Amazing!');
}
