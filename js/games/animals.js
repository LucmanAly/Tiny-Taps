// My First Words: illustrated animals and everyday-photo flashcards. One card
// fills the screen at a time; tapping it speaks its name. Swipe left or right
// to move through the deck, wrapping in both directions.
//
// Find it is an optional second mode (chosen in the same corner panel as the
// deck): the bundled recording says one word and two or three photos wait —
// tap the one that was named. Only the word itself is ever played, never an
// instruction, and words the child is still learning come back more often.

import { animalArt } from '../data/animal-art.js';
import { preloadImages } from '../engine/intro.js';
import { shuffle, pickN } from '../engine/rand.js';
import { fadeSwap } from '../engine/ui.js';
import { details as practiceDetails } from '../engine/progress.js';
import { childKey } from '../engine/children.js';

// Loaded on first use: the release check imports this module under Node,
// where the sticker engine's browser speech module cannot load.
let stickerEngine = null;
const stickers = () => (stickerEngine ||= import('../engine/stickers.js'));

function voiceSlug(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function wordCard(word) {
  return {
    ...word,
    photo: word.illustrated ? animalArt(word.id) : `assets/words-photos/${word.id}.${word.extension ?? 'jpg'}`,
    voiceKey: `animal-name:${voiceSlug(word.name)}`,
    voice: `assets/audio/animals/${voiceSlug(word.name)}.mp3`,
  };
}

// Stable card ids resolve to the shared illustrated animal catalog. Names are
// what gets printed under the card and spoken by the bundled Piper clips.
const ANIMALS = [
  { id: 'whale', name: 'Whale' },
  { id: 'shark', name: 'Shark' },
  { id: 'jellyfish', name: 'Jellyfish' },
  { id: 'eagle', name: 'Eagle' },
  { id: 'sparrow', name: 'Sparrow' },
  { id: 'penguin', name: 'Penguin' },
  { id: 'octopus', name: 'Octopus' },
  { id: 'sea-turtle', name: 'Turtle' },
  { id: 'crocodile', name: 'Crocodile' },
  { id: 'rabbit', name: 'Rabbit' },
  { id: 'kitten', name: 'Kitten' },
  { id: 'puppy', name: 'Puppy' },
  { id: 'bear-cub', name: 'Bear' },
  { id: 'elephant', name: 'Elephant' },
  { id: 'lion-cub', name: 'Lion' },
  { id: 'monkey', name: 'Monkey' },
  { id: 'horse', name: 'Horse' },
  { id: 'cow', name: 'Cow' },
  { id: 'panda', name: 'Panda' },
  { id: 'giraffe', name: 'Giraffe' },
  { id: 'zebra', name: 'Zebra' },
  { id: 'piglet', name: 'Pig' },
  { id: 'lamb', name: 'Sheep' },
  { id: 'fox', name: 'Fox' },
  { id: 'koala', name: 'Koala' },
  { id: 'deer-fawn', name: 'Deer' },
  { id: 'squirrel', name: 'Squirrel' },
  { id: 't-rex', name: 'T. Rex' },
  { id: 'brachiosaurus', name: 'Brachiosaurus' },
  { id: 'pterodactyl', name: 'Pterodactyl' },
  { id: 'triceratops', name: 'Triceratops' },
  { id: 'stegosaurus', name: 'Stegosaurus' },
  { id: 'velociraptor', name: 'Velociraptor' },
].map(a => ({
  ...a,
  photo: animalArt(a.id),
  voiceKey: `animal-name:${voiceSlug(a.name)}`,
  voice: `assets/audio/animals/${voiceSlug(a.name)}.mp3`,
}));

// Everyday words beyond the animal kingdom, sliced from uploaded photo sheets.
// They use the same bundled Piper voice as the animal cards so pronunciation
// never changes with the device's browser or installed system voices.
const EXTRA_ANIMALS = [
  { id: 'snake', name: 'Snake' },
  { id: 'ant', name: 'Ant' },
  { id: 'grasshopper', name: 'Grasshopper' },
  { id: 'tiger', name: 'Tiger' },
  { id: 'hippo', name: 'Hippo' },
  { id: 'camel', name: 'Camel' },
  { id: 'kangaroo', name: 'Kangaroo' },
  { id: 'rhino', name: 'Rhino' },
  { id: 'bee', name: 'Bee' },
  { id: 'butterfly', name: 'Butterfly' },
  { id: 'goldfish', name: 'Goldfish' },
  { id: 'frog', name: 'Frog' },
  { id: 'owl', name: 'Owl' },
  { id: 'duckling', name: 'Duckling' },
].map(word => wordCard({ ...word, illustrated: true }));

const SHARK_FAMILY = [
  { id: 'baby-shark', name: 'Baby Shark', extension: 'png' },
  { id: 'daddy-shark', name: 'Daddy Shark', extension: 'png' },
  { id: 'mommy-shark', name: 'Mommy Shark', extension: 'png' },
  { id: 'grandpa-shark', name: 'Grandpa Shark', extension: 'png' },
  { id: 'grandma-shark', name: 'Grandma Shark', extension: 'png' },
].map(word => wordCard({ ...word, illustrated: true }));

const OBJECTS = [
  { id: 'bed', name: 'Bed' },
  { id: 'shoe', name: 'Shoe' },
  { id: 'hat', name: 'Hat' },
  { id: 'apple', name: 'Apple' },
  { id: 'banana', name: 'Banana' },
  { id: 'flower', name: 'Flower' },
  { id: 'sun', name: 'Sun' },
  { id: 'moon', name: 'Moon' },
  { id: 'star', name: 'Star' },
  { id: 'house', name: 'House' },
  { id: 'train', name: 'Train' },
  { id: 'airplane', name: 'Airplane' },
  { id: 'boat', name: 'Boat' },
  { id: 'bicycle', name: 'Bicycle' },
  { id: 'car', name: 'Car' },
  { id: 'bus', name: 'Bus' },
  { id: 'ball', name: 'Ball' },
  { id: 'book', name: 'Book' },
  { id: 'cup', name: 'Cup' },
  { id: 'spoon', name: 'Spoon' },
  { id: 'chair', name: 'Chair' },
].map(wordCard);

const ITEMS = [...ANIMALS, ...EXTRA_ANIMALS, ...SHARK_FAMILY, ...OBJECTS];

// The exact 3-way partition of every flashcard, checked by scripts/check.mjs.
export const FIRST_WORD_CATEGORIES = {
  animals: [...ANIMALS, ...EXTRA_ANIMALS],
  'shark-family': SHARK_FAMILY,
  objects: OBJECTS,
};
// In-game deck picker adds a mixed "All" option on top of that partition.
const CATEGORIES = { ...FIRST_WORD_CATEGORIES, all: ITEMS };
const CATEGORY_OPTIONS = [
  { id: 'animals', label: 'Animals', icon: '🐾' },
  { id: 'shark-family', label: 'Shark Family', icon: '🦈' },
  { id: 'objects', label: 'Objects', icon: '🧸' },
  { id: 'all', label: 'All', icon: '🔀' },
];
const CATEGORY_KEY = 'tiny-taps:first-words-category';
const MODE_KEY = 'tiny-taps:first-words-mode';
const MODE_OPTIONS = [
  { id: 'cards', label: 'Flashcards', icon: '🃏' },
  { id: 'find', label: 'Find it', icon: '🔍' },
];

function savedMode() {
  try {
    if (localStorage.getItem(childKey(MODE_KEY)) === 'find') return 'find';
  } catch (_) { /* optional */ }
  return 'cards';
}

const LISTEN_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="#fff"/>
  <path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M19 6a9 9 0 0 1 0 12" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;

function savedCategory() {
  try {
    const saved = localStorage.getItem(childKey(CATEGORY_KEY));
    if (CATEGORIES[saved]) return saved;
  } catch (_) { /* storage can be unavailable in private browsing */ }
  return 'animals';
}

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="an-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#8fd9c4"/><stop offset="100%" stop-color="#4fb89c"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="80" height="80" rx="18" fill="url(#an-i)"/>
  <circle cx="35" cy="38" r="8" fill="#fff"/>
  <circle cx="65" cy="38" r="8" fill="#fff"/>
  <circle cx="22" cy="58" r="7" fill="#fff"/>
  <circle cx="78" cy="58" r="7" fill="#fff"/>
  <ellipse cx="50" cy="66" rx="16" ry="13" fill="#fff"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt, difficulty, recordOutcome } = ctx;
  let alive = true;

  let category = savedCategory();
  let mode = savedMode();
  let order = shuffle(CATEGORIES[category]);
  let i = 0;
  let pointerStart = null;
  const objectMask = document.createElement('canvas');
  const objectMaskCtx = objectMask.getContext('2d', { willReadFrequently: true });
  let objectMaskSrc = '';

  const card = document.createElement('div');
  card.className = 'animals-card';
  // 'none', not 'pan-y': the stage never scrolls (every other tappable game
  // element uses 'none' too — see addTap()'s comment in engine/ui.js). With
  // any panning left to the browser, iOS can hand a real finger's natural
  // jitter off to native gesture handling before a matching pointerup ever
  // reaches us, silently swallowing the tap that's supposed to speak the
  // animal's name — invisible with a mouse or a synthetic, jitter-free tap,
  // but reproducible on an actual touchscreen.
  stage.style.touchAction = 'none';
  const img = document.createElement('img');
  img.className = 'animals-photo';
  img.alt = '';
  img.draggable = false;
  const label = document.createElement('div');
  label.className = 'animals-label';
  card.appendChild(img);
  card.appendChild(label);

  const wrap = document.createElement('div');
  wrap.className = 'animals-wrap';
  wrap.appendChild(card);
  stage.appendChild(wrap);

  const config = document.createElement('div');
  config.className = 'words-config';
  const configButton = document.createElement('button');
  configButton.className = 'words-config-button';
  configButton.type = 'button';
  configButton.textContent = '⚙';
  configButton.setAttribute('aria-label', 'Choose flashcard category');
  configButton.setAttribute('aria-expanded', 'false');
  const categoryPanel = document.createElement('div');
  categoryPanel.className = 'words-category-panel';
  categoryPanel.hidden = true;
  const modeRow = document.createElement('div');
  modeRow.className = 'words-mode-row';
  const modeButtons = new Map();
  for (const option of MODE_OPTIONS) {
    const button = document.createElement('button');
    button.className = 'words-mode-button';
    button.type = 'button';
    button.innerHTML = `<span aria-hidden="true">${option.icon}</span><span>${option.label}</span>`;
    button.addEventListener('click', () => selectMode(option.id));
    modeRow.appendChild(button);
    modeButtons.set(option.id, button);
  }
  categoryPanel.appendChild(modeRow);
  const categoryButtons = new Map();
  for (const option of CATEGORY_OPTIONS) {
    const button = document.createElement('button');
    button.className = 'words-category-button';
    button.type = 'button';
    button.dataset.category = option.id;
    button.innerHTML = `<span aria-hidden="true">${option.icon}</span><span>${option.label}</span>`;
    categoryPanel.appendChild(button);
    categoryButtons.set(option.id, button);
  }
  config.appendChild(categoryPanel);
  config.appendChild(configButton);
  stage.appendChild(config);

  function setConfigOpen(open) {
    categoryPanel.hidden = !open;
    configButton.setAttribute('aria-expanded', String(open));
    config.classList.toggle('open', open);
  }

  function renderCategoryButtons() {
    for (const [id, button] of categoryButtons) {
      const selected = id === category;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    for (const [id, button] of modeButtons) {
      const selected = id === mode;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  function selectMode(nextMode) {
    setConfigOpen(false);
    if (nextMode === mode) return;
    mode = nextMode;
    try { localStorage.setItem(childKey(MODE_KEY), mode); } catch (_) { /* optional */ }
    speech.stop();
    audio.stopPlayback();
    renderCategoryButtons();
    showMode();
  }

  function selectCategory(nextCategory) {
    if (!CATEGORIES[nextCategory] || nextCategory === category) {
      setConfigOpen(false);
      return;
    }
    category = nextCategory;
    try { localStorage.setItem(childKey(CATEGORY_KEY), category); } catch (_) { /* optional */ }
    order = shuffle(CATEGORIES[category]);
    i = 0;
    speech.stop();
    audio.stopPlayback();
    renderCategoryButtons();
    setConfigOpen(false);
    if (mode === 'find') newFindRound();
    else fadeSwap(card, render);
  }

  // The category controls sit inside the full-screen swipe surface. Keep their
  // pointer sequence local so choosing a deck can never turn into a card swipe.
  for (const eventName of ['pointerdown', 'pointerup', 'pointercancel']) {
    config.addEventListener(eventName, e => e.stopPropagation());
  }
  configButton.addEventListener('click', () => setConfigOpen(categoryPanel.hidden));
  for (const [id, button] of categoryButtons) {
    button.addEventListener('click', () => selectCategory(id));
  }
  renderCategoryButtons();

  function render() {
    const a = order[i];
    objectMaskSrc = '';
    img.src = a.photo;
    img.alt = a.name;
    label.textContent = a.name;
    if (a.voice) audio.load(a.voiceKey, a.voice);
  }

  function prepareObjectMask() {
    if (!objectMaskCtx || !img.complete || !img.naturalWidth || !img.naturalHeight) return false;
    if (objectMaskSrc === img.currentSrc) return true;
    objectMask.width = img.naturalWidth;
    objectMask.height = img.naturalHeight;
    objectMaskCtx.clearRect(0, 0, objectMask.width, objectMask.height);
    objectMaskCtx.drawImage(img, 0, 0);
    objectMaskSrc = img.currentSrc;
    return true;
  }

  // PNG cards can have a large transparent square around the pictured object.
  // Map the touch through object-fit: contain and check the source pixel so
  // only the visible object speaks; opaque JPG photos naturally count across
  // their whole displayed image.
  function touchesObject(clientX, clientY) {
    const rect = img.getBoundingClientRect();
    if (
      clientX < rect.left || clientX > rect.right ||
      clientY < rect.top || clientY > rect.bottom
    ) return false;
    if (!prepareObjectMask()) return true;

    const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
    const drawnWidth = img.naturalWidth * scale;
    const drawnHeight = img.naturalHeight * scale;
    const x = clientX - rect.left - (rect.width - drawnWidth) / 2;
    const y = clientY - rect.top - (rect.height - drawnHeight) / 2;
    if (x < 0 || y < 0 || x >= drawnWidth || y >= drawnHeight) return false;

    try {
      const sourceX = Math.min(img.naturalWidth - 1, Math.floor(x / scale));
      const sourceY = Math.min(img.naturalHeight - 1, Math.floor(y / scale));
      return objectMaskCtx.getImageData(sourceX, sourceY, 1, 1).data[3] >= 24;
    } catch (_) {
      // Same-origin bundled images should always be readable. If a future
      // source is not, keep the image rectangle usable rather than going mute.
      return true;
    }
  }

  function go(delta) {
    if (!alive) return;
    i = (i + delta + order.length) % order.length;
    speech.stop();
    audio.stopPlayback();
    fadeSwap(card, render);
  }

  async function speakCurrent() {
    if (!alive) return;
    const a = order[i];
    card.classList.remove('wiggle');
    void card.offsetWidth;
    card.classList.add('wiggle');
    speech.stop();
    audio.unlock();
    audio.pop();
    const loaded = await audio.load(a.voiceKey, a.voice);
    if (!alive || order[i] !== a || !loaded) return;
    await audio.play(a.voiceKey, { rate: speech.getUserRate() });
  }

  /* ---------- Find it ---------- */

  const find = document.createElement('div');
  find.className = 'words-find';
  const listen = document.createElement('button');
  listen.type = 'button';
  listen.className = 'words-listen';
  listen.setAttribute('aria-label', 'Hear the word again');
  listen.innerHTML = LISTEN_ICON;
  const choices = document.createElement('div');
  choices.className = 'words-choices';
  find.append(listen, choices);
  stage.insertBefore(find, config);

  let target = null;
  let lastTarget = null;
  let answered = false;
  let roundTimer = null;

  // Words with more misses than wins are drawn up to four times as often.
  function pickTarget(pool) {
    const stats = practiceDetails('animals');
    const options = pool.filter(a => a !== lastTarget);
    const weights = options.map(a => {
      const d = stats[a.name];
      return 1 + (d ? Math.min(3, Math.max(0, d.misses - d.wins)) : 0);
    });
    let roll = Math.random() * weights.reduce((sum, w) => sum + w, 0);
    for (let n = 0; n < options.length; n++) {
      roll -= weights[n];
      if (roll <= 0) return options[n];
    }
    return options[options.length - 1];
  }

  async function sayTarget() {
    if (!alive || mode !== 'find' || !target) return;
    const a = target;
    listen.classList.remove('wiggle');
    void listen.offsetWidth;
    listen.classList.add('wiggle');
    const loaded = await audio.load(a.voiceKey, a.voice);
    if (!alive || target !== a || !loaded) return;
    await audio.play(a.voiceKey, { rate: speech.getUserRate() });
  }

  function newFindRound() {
    clearTimeout(roundTimer);
    const pool = CATEGORIES[category];
    const count = Math.min(pool.length, difficulty && difficulty() >= 2 ? 3 : 2);
    target = pickTarget(pool);
    lastTarget = target;
    answered = false;
    const others = pickN(pool.filter(a => a !== target), count - 1);
    const build = () => {
      if (!alive || mode !== 'find') return;
      choices.replaceChildren();
      choices.dataset.count = String(count);
      shuffle([target, ...others]).forEach((a, n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'words-choice pop-in';
        b.style.animationDelay = `${n * 0.07}s`;
        b.setAttribute('aria-label', a.name);
        b.innerHTML = `<img src="${a.photo}" alt="" draggable="false">`;
        b.addEventListener('pointerdown', e => {
          e.stopPropagation();
          choose(a, b, e);
        });
        choices.appendChild(b);
      });
      sayTarget();
    };
    if (choices.children.length) fadeSwap(choices, build);
    else build();
  }

  function choose(a, button, e) {
    if (!alive || answered || mode !== 'find') return;
    if (a === target) {
      answered = true;
      if (recordOutcome) recordOutcome(true, a.name);
      button.classList.add('right');
      audio.chime();
      celebrate.burst(e.clientX, e.clientY, { count: 26 });
      speech.praise({ quick: true });
      stickers().then(m => {
        const won = m.recordWin(null);
        if (won) setTimeout(() => m.showToast(won), 700);
      });
      roundTimer = setTimeout(() => { if (alive && mode === 'find') newFindRound(); }, 1300);
    } else {
      if (recordOutcome) recordOutcome(false, target.name);
      button.classList.remove('wiggle');
      void button.offsetWidth;
      button.classList.add('wiggle');
      audio.boing();
      speech.encourage();
      roundTimer = setTimeout(sayTarget, 700);
    }
  }

  listen.addEventListener('pointerdown', e => {
    e.stopPropagation();
    sayTarget();
  });

  function showMode(first = false) {
    clearTimeout(roundTimer);
    const finding = mode === 'find';
    // Inline display: the stylesheet's own display rules would beat [hidden].
    wrap.style.display = finding ? 'none' : '';
    find.style.display = finding ? '' : 'none';
    if (finding) {
      // An idle child hears the word again — just the word.
      setReprompt(() => { if (!answered) sayTarget(); });
      newFindRound();
    } else {
      target = null;
      setReprompt(null);
      if (!first) fadeSwap(card, render);
    }
  }

  stage.addEventListener('pointerdown', e => {
    if (!alive || !e.isPrimary) return;
    if (!categoryPanel.hidden) {
      pointerStart = null;
      setConfigOpen(false);
      return;
    }
    if (mode !== 'cards') { pointerStart = null; return; }
    pointerStart = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      onObject: touchesObject(e.clientX, e.clientY),
    };
    try { stage.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
  });

  stage.addEventListener('pointerup', e => {
    if (!alive || !pointerStart || pointerStart.id !== e.pointerId) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    const startedOnObject = pointerStart.onObject;
    pointerStart = null;
    try { stage.releasePointerCapture(e.pointerId); } catch (_) { /* optional */ }

    const horizontalSwipe = Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.25;
    if (horizontalSwipe) {
      // Swipe left = next; swipe right = previous. The modulo in go() means
      // swiping right from the first card opens the last card, and vice versa.
      go(dx < 0 ? 1 : -1);
    } else if (
      startedOnObject &&
      Math.abs(dx) < 18 && Math.abs(dy) < 18 &&
      touchesObject(e.clientX, e.clientY)
    ) {
      speakCurrent();
    }
  });

  stage.addEventListener('pointercancel', () => { pointerStart = null; });

  preloadImages(Object.fromEntries(ITEMS.map(a => [a.id, a.photo])), 0)
    .then(() => { if (alive && mode === 'cards') render(); });
  render();
  renderCategoryButtons();
  showMode(true);

  return () => { alive = false; pointerStart = null; clearTimeout(roundTimer); };
}

export default {
  id: 'animals',
  title: 'My First Words',
  icon: ICON,
  start,
};
