// My First Words: a photo flashcard deck, not a round-based game. One card
// fills the screen at a time; tapping it speaks its name. Swipe left or right
// to move through the deck, wrapping in both directions.

import { preloadImages } from '../engine/intro.js';
import { shuffle } from '../engine/rand.js';
import { fadeSwap } from '../engine/ui.js';

function voiceSlug(name) {
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Ids match the sliced photo filenames in assets/animals-photos/. Names are
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
  photo: `assets/animals-photos/${a.id}.jpg`,
  voiceKey: `animal-name:${voiceSlug(a.name)}`,
  voice: `assets/audio/animals/${voiceSlug(a.name)}.mp3`,
}));

// Everyday words beyond the animal kingdom, sliced from four uploaded photo
// sheets. No bundled recording for these yet, so `voice: null` — tapping
// falls back to the browser's spoken voice (see speakCurrent()).
const WORDS = [
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
  { id: 'baby-shark', name: 'Baby Shark', extension: 'png' },
  { id: 'daddy-shark', name: 'Daddy Shark', extension: 'png' },
  { id: 'mommy-shark', name: 'Mommy Shark', extension: 'png' },
  { id: 'grandpa-shark', name: 'Grandpa Shark', extension: 'png' },
  { id: 'grandma-shark', name: 'Grandma Shark', extension: 'png' },
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
].map(w => ({
  ...w,
  photo: `assets/words-photos/${w.id}.${w.extension ?? 'jpg'}`,
  voiceKey: `animal-name:${voiceSlug(w.name)}`,
  voice: null,
}));

const ITEMS = [...ANIMALS, ...WORDS];

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
  const { stage, audio, speech, setReprompt } = ctx;
  let alive = true;

  const order = shuffle(ITEMS);
  let i = 0;
  let pointerStart = null;

  const card = document.createElement('div');
  card.className = 'animals-card';
  // 'none', not 'pan-y': the stage never scrolls (every other tappable game
  // element uses 'none' too — see addTap()'s comment in engine/ui.js). With
  // any panning left to the browser, iOS can hand a real finger's natural
  // jitter off to native gesture handling before a matching pointerup ever
  // reaches us, silently swallowing the tap that's supposed to speak the
  // animal's name — invisible with a mouse or a synthetic, jitter-free tap,
  // but reproducible on an actual touchscreen.
  card.style.touchAction = 'none';
  const img = document.createElement('img');
  img.className = 'animals-photo';
  img.alt = '';
  const label = document.createElement('div');
  label.className = 'animals-label';
  card.appendChild(img);
  card.appendChild(label);

  const wrap = document.createElement('div');
  wrap.className = 'animals-wrap';
  wrap.appendChild(card);
  stage.appendChild(wrap);

  function render() {
    const a = order[i];
    img.src = a.photo;
    img.alt = a.name;
    label.textContent = a.name;
    if (a.voice) audio.load(a.voiceKey, a.voice);
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
    audio.pop();
    const loaded = a.voice ? await audio.load(a.voiceKey, a.voice) : false;
    if (!alive) return;
    if (loaded) await audio.play(a.voiceKey, { rate: speech.getUserRate() });
    else speech.speakWord(order[i].name);
  }

  card.addEventListener('pointerdown', e => {
    if (!alive || !e.isPrimary) return;
    pointerStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try { card.setPointerCapture(e.pointerId); } catch (_) { /* optional */ }
  });

  card.addEventListener('pointerup', e => {
    if (!alive || !pointerStart || pointerStart.id !== e.pointerId) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    pointerStart = null;
    try { card.releasePointerCapture(e.pointerId); } catch (_) { /* optional */ }

    const horizontalSwipe = Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.25;
    if (horizontalSwipe) {
      // Swipe left = next; swipe right = previous. The modulo in go() means
      // swiping right from the first card opens the last card, and vice versa.
      go(dx < 0 ? 1 : -1);
    } else if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
      speakCurrent();
    }
  });

  card.addEventListener('pointercancel', () => { pointerStart = null; });

  preloadImages(Object.fromEntries(ITEMS.map(a => [a.id, a.photo])), 0)
    .then(() => { if (alive) render(); });
  render();

  setReprompt(null);
  return () => { alive = false; pointerStart = null; };
}

export default {
  id: 'animals',
  title: 'My First Words',
  icon: ICON,
  start,
};
