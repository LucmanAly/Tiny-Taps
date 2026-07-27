// Animals: a photo flashcard deck, not a round-based game. One animal fills
// the card at a time; tapping it plays the bundled spoken name. Swipe left or
// right to move through the deck, wrapping in both directions.

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
  let pointerStart = null;

  const card = document.createElement('div');
  card.className = 'animals-card';
  card.style.touchAction = 'pan-y';
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
    audio.load(a.voiceKey, a.voice);
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
    const loaded = await audio.load(a.voiceKey, a.voice);
    if (!alive) return;
    if (loaded) await audio.play(a.voiceKey);
    else speech.speakWord(a.name);
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

  preloadImages(Object.fromEntries(ANIMALS.map(a => [a.id, a.photo])), 0)
    .then(() => { if (alive) render(); });
  render();

  setReprompt(null);
  return () => { alive = false; pointerStart = null; };
}

export default {
  id: 'animals',
  title: 'Animals',
  icon: ICON,
  start,
};
