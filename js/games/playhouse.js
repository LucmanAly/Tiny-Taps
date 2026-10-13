// Play House: a little world to live in rather than a game to win.
//
// A dollhouse on the left, a garden on the right, swiped between like a
// picture book. Everything answers a touch at once — the furniture wobbles,
// the toys squeak and bounce, animals pop out of the bushes — and almost
// everything can be picked up and carried: toys, the pram, the brother, even
// the baby sister. She asks for things with a picture in a thought bubble,
// and helping her (or just playing with her) snaps one of ten "Play Together"
// photos that fill the frames on the wall. Nothing can be done wrongly.
//
// Modules (all in js/games/playhouse/):
//   world.js   canvas, camera, drawing layers and touch routing
//   art.js     the painted scenery, as SVG rasterized per screen size
//   assets.js  painted character/toy artwork and pose tables
//   sky.js     sun, moon, weather cloud, rain, puddles, snow, snowman
//   home.js    lamp, bed, wardrobe, curtains, toy box, door
//   garden.js  bushes and animals, apple tree, trampoline, pram, birds
//   props.js   toys with simple physics
//   kids.js    the brother and the baby sister
//   moments.js the photo wall

import { createWorld } from './playhouse/world.js';
import { createSky } from './playhouse/sky.js';
import { createProps } from './playhouse/props.js';
import { createKids } from './playhouse/kids.js';
import { createHome } from './playhouse/home.js';
import { createGarden } from './playhouse/garden.js';
import { createMoments } from './playhouse/moments.js';
import { PLACES, TIMING } from './playhouse/layout.js';
import { OUTFITS, BABY_POSES, TOY_ART, SCENE_ART, BUSH_ANIMALS, CAT, OWL, loadImages } from './playhouse/assets.js';

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ph-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#e6f7ff"/>
    </linearGradient>
  </defs>
  <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#ph-sky)"/>
  <circle cx="77" cy="24" r="9" fill="#ffd650" stroke="#e59a2a" stroke-width="2"/>
  <path d="M5 76 Q30 66 52 72 T95 70 V95 H5 Z" fill="#9fd37f"/>
  <path d="M14 80 V50 L38 31 L62 50 V80 Z" fill="#fbe7cd" stroke="#6b4a3a" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M9 52 L38 27 L67 52" fill="none" stroke="#d9705a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="20" y="54" width="14" height="12" rx="2" fill="#bfe1f1" stroke="#6b4a3a" stroke-width="2"/>
  <rect x="42" y="58" width="12" height="22" rx="3" fill="#d58b5c" stroke="#6b4a3a" stroke-width="2"/>
  <path d="M80 70 C72 63 73 56 77 56 C79 56 80 58 80 59 C80 58 81 56 83 56 C87 56 88 63 80 70 Z" fill="#ff7a9c"/>
  <circle cx="72" cy="80" r="6" fill="#ffd166" stroke="#6b4a3a" stroke-width="1.6"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, setReprompt, recordOutcome } = ctx;
  const W = createWorld({ stage, audio });
  W.img = {};

  // The one computer-speech channel: a single name at a time (an animal, a
  // toy, an outfit, the weather), never an instruction or praise. The same
  // word is not repeated while it is still being said.
  let lastWord = '';
  let lastWordAt = -9;
  W.say = word => {
    if (!word || !W.isAlive()) return;
    if (word === lastWord && W.t - lastWordAt < 1.6) return;
    lastWord = word;
    lastWordAt = W.t;
    speech.speakWord(word, { interrupt: true });
  };
  // Parent recordings only (speech.praise never synthesizes a voice).
  W.praise = () => speech.praise({ quick: true });
  W.recordOutcome = (correct, detail) => recordOutcome(correct, detail);

  createSky(W);
  createProps(W);
  createMoments(W);
  const kids = createKids(W);
  createHome(W);
  createGarden(W);

  /* ---- artwork ---- */
  const art = {};
  for (const [k, v] of Object.entries(BABY_POSES)) art['baby_' + k] = v.src;
  for (const [k, v] of Object.entries(TOY_ART)) art['toy_' + k] = v.src;
  for (const [k, v] of Object.entries(SCENE_ART)) art['scene_' + k] = v;
  for (const o of OUTFITS) art['card_' + o.id] = o.card;
  for (const a of [...BUSH_ANIMALS.day, ...BUSH_ANIMALS.night, CAT, OWL]) if (a) art['animal_' + a.id] = a.art;
  loadImages(art).then(imgs => { if (W.isAlive()) Object.assign(W.img, imgs); });
  kids.ready.then(() => { if (W.isAlive()) W.boy.wob = 0.6; });

  /* ---- the toys, where they start ---- */
  W.spawnToy('ball', 700, 742);
  W.spawnToy('duck', 1210, 770);
  W.spawnToy('bottle', 1560, 700);
  W.spawnToy('wand', 2790, 712);
  for (const kind of ['teddy', 'rattle', 'blanket']) {
    const t = W.spawnToy(kind, PLACES.toybox.x, PLACES.toybox.y + 30);
    t.hidden = true;
    W.toybox.contents.add(t);
  }

  /* ---- idle hints ----
     After a quiet spell, something on screen gives a small wiggle and a
     sparkle, so a child who does not know what to touch next has an idea. */
  let nextHint = TIMING.hintAfterMs / 1000;
  let lastHinted = null;
  W.on('input', () => { nextHint = W.t + TIMING.hintAfterMs / 1000; });
  W.on('update', () => {
    if (W.t < nextHint || !W.ready) return;
    nextHint = W.t + TIMING.hintEveryMs / 1000;
    const options = W.entities.filter(e => e.hint && e !== lastHinted && typeof e.x === 'number'
      && W.onScreen(e.x, -60) && !e.hidden && !e.held);
    if (!options.length) return;
    const e = options[(Math.random() * options.length) | 0];
    lastHinted = e;
    e.hint();
    const y = typeof e.y === 'number' ? e.y - 160 : 300;
    W.fx.sparkle(e.x, y, 8, 120);
  });

  /* ---- tapping empty floor walks the brother there ---- */
  W.on('tapEmpty', p => {
    if (p.handled) return;
    if (p.y > 560) {
      W.boy.walkTo(p.x, p.y);
      W.fx.sparkle(p.x, p.y, 4, 60, ['#ffffff', '#fff3c4']);
    } else {
      // The sky (and the walls) play a note instead.
      audio.bell(Math.floor(Math.random() * 8));
      W.fx.sparkle(p.x, p.y, 6, 90);
    }
  });

  // Start in the house, with the brother and sister both in view.
  W.on('ready', () => {
    if (W.cam.viewW < 1400) W.cam.x = Math.max(-40, 1200 - W.cam.viewW / 2);
  });

  W.start();
  setReprompt(null);      // free play: never nag

  return () => {
    W.destroy();
    audio.stopWeatherBed();
  };
}

export default {
  id: 'playhouse',
  title: 'Play House',
  icon: ICON,
  start,
};
