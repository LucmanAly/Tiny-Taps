// Animals: a photo flashcard deck, not a round-based game. One animal fills
// the card at a time; tapping it plays the bundled spoken name, and it can be
// tapped again to hear it repeated. Prev/next simply move through the deck —
// no scoring, no correct/incorrect state, nothing here can be done wrongly.

import { preloadImages } from '../engine/intro.js';
import { shuffle } from '../engine/rand.js';
import { fadeSwap, addTap } from '../engine/ui.js';

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

  const order = shuffle(ANIMALS);
  let i = 0;

  const card = document.createElement('div');
  card.className = 'animals-card';
  const img = document.createElement('img');
  img.className = 'animals-photo';
  img.alt = '';
  const label = document.createElement('div');
  label.className = 'animals-label';
  card.appendChild(img);
  card.appendChild(label);

  const nav = document.createElement('div');
  nav.className = 'animals-nav';
  const prevBtn = document.createElement('button');
  prevBtn.className = 'big-btn animals-arrow';
  prevBtn.textContent = '‹';
  prevBtn.setAttribute('aria-label', 'Previous animal');
  const nextBtn = document.createElement('button');
  nextBtn.className = 'big-btn animals-arrow';
  nextBtn.textContent = '›';
  nextBtn.setAttribute('aria-label', 'Next animal');
  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);

  const wrap = document.createElement('div');
  wrap.className = 'animals-wrap';
  wrap.appendChild(card);
  wrap.appendChild(nav);
  stage.appendChild(wrap);

  function render() {
    const a = order[i];
    img.src = a.photo;
    img.alt = a.name;
    label.textContent = a.name;
    // Warm the current clip so a tap plays immediately, without decoding all
    // 33 files at once on lower-memory phones and tablets.
    audio.load(a.voiceKey, a.voice);
  }

  // Photo and name change together as one unit, so a fade never shows a
  // mismatched pairing mid-transition.
  function go(delta) {
    i = (i + delta + order.length) % order.length;
    fadeSwap(card, render);
  }

  addTap(card, async () => {
    if (!alive) return;
    const a = order[i];
    card.classList.remove('wiggle');
    void card.offsetWidth;
    card.classList.add('wiggle');
    speech.stop();
    audio.pop();
    const loaded = await audio.load(a.voiceKey, a.voice);
    if (!alive) return;
    if (loaded) await audio.play(a.voiceKey);
    else speech.speakWord(a.name); // safety fallback for a damaged/missing file
  });
  addTap(prevBtn, () => { if (alive) go(-1); });
  addTap(nextBtn, () => { if (alive) go(1); });

  // Warm the whole photo deck up front — it's under 1.1MB total, so there's no
  // reason to make the child wait mid-browse for a photo to arrive.
  preloadImages(Object.fromEntries(ANIMALS.map(a => [a.id, a.photo])), 0)
    .then(() => { if (alive) render(); });
  render();   // shows immediately; the preload above just warms the cache

  setReprompt(null);      // free play: never nag
  return () => { alive = false; };
}

export default {
  id: 'animals',
  title: 'Animals',
  icon: ICON,
  start,
};