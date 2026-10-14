// Play House painted artwork: the boy's outfits and poses, the baby's poses,
// the toys, and the ten "Play Together" photos.
//
// Every pose is drawn by the height of the child in it, not by the height of
// its file (the mascot poses carry different empty margins), so each pose
// lists how tall the child is in it relative to standing.

import { preloadImages } from '../../engine/intro.js';
import { ANIMALS } from '../../data/animals.js';

const P = 'assets/playhouse/';

// `word` is the single name said when the outfit goes on.
export const OUTFITS = [
  {
    id: 'winter', word: 'Coat', card: 'assets/mascot_outfit_winter.PNG',
    poses: {
      // mascot_idle is a close-up cropped at the knees, so the full-length
      // waving pose stands in for it.
      stand: 'assets/mascot_waving.PNG',
      walk: 'assets/mascot_walking.PNG',
      jump: 'assets/mascot_winter_jump.PNG',
      sleep: 'assets/mascot_winter_sleep.PNG',
      magic: 'assets/mascot_magic.PNG',
      pushA: P + 'boy-winter-push-a.png', pushB: P + 'boy-winter-push-b.png',
      carry: P + 'boy-winter-carry.png', kneel: P + 'boy-winter-kneel.png',
    },
  },
  {
    id: 'rain', word: 'Raincoat', card: 'assets/mascot_outfit_rain.PNG',
    poses: {
      stand: 'assets/mascot_rain_stand.PNG',
      walk: 'assets/mascot_rain_walk.PNG',
      jump: 'assets/mascot_rain_jump.PNG',
      sleep: 'assets/mascot_rain_sleep.PNG',
      pushA: P + 'boy-rain-push-a.png', pushB: P + 'boy-rain-push-b.png',
      carry: P + 'boy-rain-carry.png', kneel: P + 'boy-rain-kneel.png',
    },
  },
  {
    id: 'summer', word: 'T-shirt', card: 'assets/mascot_outfit_summer.PNG',
    poses: {
      stand: 'assets/mascot_summer_stand.PNG',
      walk: 'assets/mascot_summer_walk.PNG',
      jump: 'assets/mascot_summer_jump.PNG',
      sleep: 'assets/mascot_summer_sleep.PNG',
      pushA: P + 'boy-summer-push-a.png', pushB: P + 'boy-summer-push-b.png',
      carry: P + 'boy-summer-carry.png', kneel: P + 'boy-summer-kneel.png',
    },
  },
];

// Height of the boy in each pose, relative to standing. The winter hood's
// bear ears make that outfit's figure a little taller for the same child.
export const BOY_POSE_H = {
  stand: 1, walk: 1, jump: 0.88, magic: 1.1, pushA: 0.96, pushB: 0.93, carry: 0.98, kneel: 0.82,
};
export const OUTFIT_SCALE = { winter: 1.05, rain: 1, summer: 1 };

// The four original baby poses share one scale; the four reaction poses come
// from a second sheet, normalised so her sitting height matches.
export const BABY_POSES = {
  sit: { src: 'assets/baby_sit.PNG', h: 1 },
  happy: { src: 'assets/baby_happy.PNG', h: 1.01 },
  crawl: { src: 'assets/baby_crawl.PNG', h: 0.59 },
  sleep: { src: 'assets/baby_sleep.PNG', h: 0.5 },
  reach: { src: P + 'baby-reach.png', h: 1.07 },
  hug: { src: P + 'baby-hug.png', h: 1.056 },
  sleepy: { src: P + 'baby-sleepy.png', h: 1.01 },
  look: { src: P + 'baby-look.png', h: 1 },
};

// Painted toys from the objects sheet. `h` is drawn height in world units.
export const TOY_ART = {
  teddy: { src: P + 'toy-teddy.png', h: 118 },
  ball: { src: P + 'toy-ball.png', h: 96 },
  duck: { src: P + 'toy-duck.png', h: 100 },
  rattle: { src: P + 'toy-rattle.png', h: 108 },
  blanket: { src: P + 'toy-blanket.png', h: 78 },
};

export const SCENE_ART = {
  toyboxClosed: P + 'toybox-closed.png',
  toyboxOpen: P + 'toybox-open.png',
  toyboxEmpty: P + 'toybox-empty.png',
  bushBig: P + 'bush-big.png',
  bushMedium: P + 'bush-medium.png',
  bushSmall: P + 'bush-small.png',
};

// The ten illustrated sibling moments. `word` is said as the photo is taken.
export const MOMENTS = {
  teddy: { src: 'assets/moment_teddy.PNG', word: 'Teddy' },
  crawl: { src: 'assets/moment_crawl.PNG', word: 'Crawl' },
  hug: { src: 'assets/moment_hug.PNG', word: 'Hug' },
  rattle: { src: 'assets/moment_rattle.PNG', word: 'Shake' },
  peekaboo: { src: 'assets/moment_peekaboo.PNG', word: 'Peekaboo' },
  clap: { src: 'assets/moment_clap.PNG', word: 'Clap' },
  duck: { src: 'assets/moment_duck.PNG', word: 'Duck' },
  bubbles: { src: 'assets/moment_bubbles.PNG', word: 'Bubbles' },
  ride: { src: 'assets/moment_ride.PNG', word: 'Ride' },
  lift: { src: 'assets/moment_lift.PNG', word: 'Up' },
};
export const MOMENT_ORDER = ['teddy', 'duck', 'rattle', 'clap', 'bubbles', 'peekaboo', 'hug', 'lift', 'crawl', 'ride'];

// Animals that can hide in the garden bushes: those with a real recording.
// Owls and frogs come out after dark; the rest by day.
const BUSH_DAY = ['bunny', 'cat', 'dog', 'duck', 'sheep', 'pig', 'rooster', 'frog'];
const BUSH_NIGHT = ['owl', 'frog', 'cat'];
const byId = new Map(ANIMALS.map(a => [a.id, a]));
export const BUSH_ANIMALS = {
  day: BUSH_DAY.map(id => byId.get(id)).filter(a => a && a.sound),
  night: BUSH_NIGHT.map(id => byId.get(id)).filter(a => a && a.sound),
};
export const ROOSTER = byId.get('rooster');
export const OWL = byId.get('owl');
export const CAT = byId.get('cat');
// Visitors to the flowers in the vegetable patch.
export const BEE = byId.get('bee');
export const BUTTERFLY = byId.get('butterfly');

/* ---------------- loading ---------------- */

export function loadImages(map) {
  return preloadImages(map, 0).then(loaded => loaded || {});
}

export function loadOutfit(outfit) {
  return loadImages(outfit.poses);
}

// Normalised bounding box of the visible pixels in an image, measured once on
// a small downsample. The mascot poses are framed inconsistently inside their
// files; drawing by this box keeps him the same size in every pose and his
// feet on the floor.
const BOUNDS = new WeakMap();
const FULL = { x0: 0, x1: 1, y0: 0, y1: 1 };
export function boundsOf(img) {
  if (!img || !img.naturalWidth) return FULL;
  const cached = BOUNDS.get(img);
  if (cached) return cached;
  let box = FULL;
  try {
    const cw = 96;
    const ch = Math.max(1, Math.round(cw * img.naturalHeight / img.naturalWidth));
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const cg = c.getContext('2d', { willReadFrequently: true });
    cg.drawImage(img, 0, 0, cw, ch);
    const d = cg.getImageData(0, 0, cw, ch).data;
    let x0 = cw, x1 = -1, y0 = ch, y1 = -1;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        if (d[(y * cw + x) * 4 + 3] > 24) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 >= x0 && y1 >= y0) box = { x0: x0 / cw, x1: (x1 + 1) / cw, y0: y0 / ch, y1: (y1 + 1) / ch };
  } catch (e) {
    // A measurement problem must never stop the world drawing.
  }
  BOUNDS.set(img, box);
  return box;
}

// Draws `img` so its visible content is `h` world units tall with its
// bottom-centre at (x, y). Returns the drawn content box for hit-testing.
export function drawFitted(g, img, x, y, h, { flip = false, alpha = 1 } = {}) {
  if (!img || !img.naturalWidth) return null;
  const bb = boundsOf(img);
  const drawH = h / (bb.y1 - bb.y0);
  const drawW = drawH * img.naturalWidth / img.naturalHeight;
  const cx = (bb.x0 + bb.x1) / 2;
  g.save();
  g.translate(x, y);
  if (flip) g.scale(-1, 1);
  if (alpha !== 1) g.globalAlpha *= alpha;
  g.drawImage(img, -cx * drawW, -bb.y1 * drawH, drawW, drawH);
  g.restore();
  const w = (bb.x1 - bb.x0) * drawW;
  return { x: x - w / 2, y: y - h, w, h };
}
