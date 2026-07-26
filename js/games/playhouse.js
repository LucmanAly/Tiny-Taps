// Play House v4: one continuous home-and-yard world built around actions a
// toddler performs directly. Toys can be dragged, carried, offered and kept;
// the baby stays in one wheeled cot that her brother visibly pushes between
// the indoor and outdoor parking spots. There are no cutaway "moment" cards.

import { preloadImages } from '../engine/intro.js';

const WORLD_SCREENS = 1.7;

const CONFIG = {
  camera: { ease: 7.5, edgeFrac: 0.12 },
  boy: {
    heightFrac: 0.39,
    minHeight: 118,
    maxHeight: 250,
    walkSpeed: 0.48,
    bobHz: 3.1,
  },
  cot: {
    indoorX: 0.675,
    outdoorX: 1.075,
    widthFrac: 0.30,
    heightFrac: 0.19,
    moveMs: 1650,
  },
  stations: {
    bed: 0.205,
    wardrobe: 0.445,
    trampoline: 1.425,
    yardHome: 1.185,
  },
  jump: {
    count: 3,
    durationMs: 650,
    heightFrac: 0.31,
  },
  baby: {
    heightFrac: 0.255,
    contentMs: 12000,
    toyWantMs: 11000,
    reactionMs: 1500,
    laughMs: 950,
  },
  toys: {
    snapBabyFrac: 0.20,
    snapBoyFrac: 0.15,
    dragSizeFrac: 0.09,
  },
  idleDemoMs: 10000,
  weather: {
    order: ['sunny', 'rainy', 'windy', 'snowy'],
    rainDrops: 92,
    snowFlakes: 105,
    leafCount: 15,
    snowSettleMs: 4200,
    snowThawMs: 2600,
  },
  picker: {
    openMs: 260,
    cardWidthFrac: 0.26,
    cardGapFrac: 0.03,
    cardHeightFrac: 0.80,
  },
  colors: {
    skyDayTop: '#8ed6ff',
    skyDayBottom: '#eafaff',
    skyNightTop: '#2b3570',
    skyNightBottom: '#5a6bab',
    skyRainTop: '#9fb4c4',
    skyRainBottom: '#d6e2e8',
    skySnowTop: '#b9c6d4',
    skySnowBottom: '#eef3f7',
    grassDay: '#7ed67e',
    grassNight: '#3f6b52',
    grassStripe: '#6ac66f',
    sun: '#ffd54a',
    sunGlow: '#fff3b0',
    moon: '#fdf6d8',
    wall: '#ffe6c4',
    wallNight: '#c9a983',
    interior: '#fff6e8',
    interiorNight: '#f5d8ae',
    roof: '#e0685a',
    roofDark: '#c04a3e',
    floor: '#c99a6a',
    ink: '#3a3357',
    bedFrame: '#8a5a3c',
    bedSheet: '#fffaf0',
    bedBlanket: '#7fb3ff',
    wardrobe: '#a3714a',
    wardrobeDark: '#7d5334',
    wardrobeDoor: '#b98352',
    cotFrame: '#e08a5a',
    cotDark: '#bd6a3e',
    cotRail: '#f6c177',
    cotMat: '#8fd9c4',
    tramFrame: '#8a8098',
    tramMat: '#5aa8e0',
    tramSpring: '#c9c3d6',
    snow: '#ffffff',
    snowShade: '#dfe9f2',
    rain: '#a9dcf5',
    leaf: ['#7ed67e', '#ffcf6f', '#ff9fce'],
  },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const clamp01 = v => clamp(v, 0, 1);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = t => (t < 0.5
  ? 4 * t * t * t
  : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ph4-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8ed6ff"/><stop offset="100%" stop-color="#eafaff"/>
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="88" height="88" rx="18" fill="url(#ph4-sky)"/>
  <circle cx="78" cy="24" r="9" fill="#ffd54a"/>
  <rect x="6" y="69" width="88" height="25" fill="#7ed67e"/>
  <path d="M11 70V45l23-17 24 17v25z" fill="#ffe6c4"/>
  <path d="m8 47 26-22 27 22h-7L34 32 15 47z" fill="#e0685a"/>
  <rect x="20" y="54" width="13" height="16" rx="2" fill="#7fb3ff"/>
  <circle cx="70" cy="66" r="13" fill="#8fd9c4" stroke="#e08a5a" stroke-width="4"/>
  <circle cx="65" cy="80" r="4" fill="#8a8098"/><circle cx="77" cy="80" r="4" fill="#8a8098"/>
</svg>`;

const OUTFITS = [
  {
    id: 'winter',
    tint: '#a9713f',
    card: 'assets/mascot_outfit_winter.PNG',
    poses: {
      stand: 'assets/mascot_idle.PNG',
      walk: 'assets/mascot_walking.PNG',
      wave: 'assets/mascot_waving.PNG',
      magic: 'assets/mascot_magic.PNG',
      jump: 'assets/mascot_winter_jump.PNG',
      sleep: 'assets/mascot_winter_sleep.PNG',
      pushA: 'assets/playhouse_push_winter_a.png',
      pushB: 'assets/playhouse_push_winter_b.png',
      carry: 'assets/playhouse_carry_winter.png',
      give: 'assets/playhouse_give_winter.png',
    },
  },
  {
    id: 'rain',
    tint: '#f2c318',
    card: 'assets/mascot_outfit_rain.PNG',
    poses: {
      stand: 'assets/mascot_rain_stand.PNG',
      walk: 'assets/mascot_rain_walk.PNG',
      jump: 'assets/mascot_rain_jump.PNG',
      sleep: 'assets/mascot_rain_sleep.PNG',
      pushA: 'assets/playhouse_push_rain_a.png',
      pushB: 'assets/playhouse_push_rain_b.png',
      carry: 'assets/playhouse_carry_rain.png',
      give: 'assets/playhouse_give_rain.png',
    },
  },
  {
    id: 'summer',
    tint: '#d8c6a4',
    card: 'assets/mascot_outfit_summer.PNG',
    poses: {
      stand: 'assets/mascot_summer_stand.PNG',
      walk: 'assets/mascot_summer_walk.PNG',
      jump: 'assets/mascot_summer_jump.PNG',
      sleep: 'assets/mascot_summer_sleep.PNG',
      pushA: 'assets/playhouse_push_summer_a.png',
      pushB: 'assets/playhouse_push_summer_b.png',
      carry: 'assets/playhouse_carry_summer.png',
      give: 'assets/playhouse_give_summer.png',
    },
  },
];

const BABY_ART = {
  sit: 'assets/baby_sit.PNG',
  sleep: 'assets/baby_sleep.PNG',
  reach: 'assets/playhouse_baby_reach.png',
  hugTeddy: 'assets/playhouse_baby_hug_teddy.png',
  sleepy: 'assets/playhouse_baby_sleepy.png',
  laugh: 'assets/playhouse_baby_laugh.png',
};

const WORLD_ART = {
  binClosed: 'assets/playhouse_toy_bin_closed.png',
  binOpen: 'assets/playhouse_toy_bin_open.png',
  bush: 'assets/playhouse_bush.png',
};

const TOY_DEFS = [
  { id: 'teddy', file: 'assets/playhouse_toy_teddy.png', size: 0.087, x: 1.495, y: 0.795 },
  { id: 'ball', file: 'assets/playhouse_toy_ball.png', size: 0.078, x: 1.565, y: 0.815 },
  { id: 'duck', file: 'assets/playhouse_toy_duck.png', size: 0.073, x: 1.625, y: 0.800 },
  { id: 'rattle', file: 'assets/playhouse_toy_rattle.png', size: 0.080, x: 1.675, y: 0.785 },
  { id: 'blanket', file: 'assets/playhouse_blanket.png', size: 0.105, x: 0.26, y: 0.76, care: true },
];

const TOY_FILES = Object.fromEntries(TOY_DEFS.map(t => [t.id, t.file]));
const BOUNDS = new WeakMap();
const FULL_BOUNDS = { x0: 0, x1: 1, y0: 0, y1: 1 };

// Kept pure so the exact phone/tablet spacing can be regression-tested without
// standing up a browser or duplicating the layout formula in the test.
export function playhouseLayout(w, h) {
  const unit = Math.min(w, h);
  const portrait = h >= w;
  const groundY = h * 0.88;
  const horizonY = h * 0.50;
  const boyH = clamp(unit * CONFIG.boy.heightFrac, CONFIG.boy.minHeight, CONFIG.boy.maxHeight);
  const cotW = unit * CONFIG.cot.widthFrac;
  const cotH = unit * CONFIG.cot.heightFrac;
  const house = {
    x: w * 0.035,
    right: w * 0.82,
    interiorRight: w * 0.70,
    wallTop: groundY - unit * 0.60,
    roofPeak: groundY - unit * 0.77,
  };

  return {
    w,
    h,
    unit,
    portrait,
    worldW: w * WORLD_SCREENS,
    groundY,
    horizonY,
    boyH,
    babyH: unit * CONFIG.baby.heightFrac,
    cotW,
    cotH,
    cameraMax: WORLD_SCREENS - 1,
    house,
    bed: {
      x: w * 0.075,
      y: groundY - unit * 0.23,
      w: w * 0.255,
      h: unit * 0.23,
    },
    wardrobe: {
      x: w * 0.365,
      y: groundY - unit * 0.43,
      w: w * 0.175,
      h: unit * 0.43,
    },
    tram: {
      x: w * CONFIG.stations.trampoline - unit * 0.155,
      y: groundY - unit * 0.15,
      w: unit * 0.31,
      h: unit * 0.15,
    },
    bin: {
      x: w * 1.625 - unit * 0.105,
      y: groundY - unit * 0.18,
      w: unit * 0.21,
      h: unit * 0.18,
    },
    bush: {
      x: w * 1.23 - unit * 0.10,
      y: groundY - unit * 0.14,
      w: unit * 0.20,
      h: unit * 0.14,
    },
    sunX: w * 0.86,
    sunY: h * 0.20,
    sunR: unit * 0.065,
  };
}

function start(ctx) {
  const { stage, audio, setReprompt } = ctx;
  let alive = true;
  let raf = 0;
  const now = () => performance.now();

  const canvas = document.createElement('canvas');
  canvas.className = 'playhouse-canvas';
  canvas.style.touchAction = 'none';
  stage.appendChild(canvas);
  const g = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  let L = null;
  let lastFrame = now();

  let night = false;
  let weather = 'sunny';
  let cameraX = 0;
  let cameraTarget = 0;

  let outfitIndex = 0;
  let images = {};
  let babyArt = {};
  let worldArt = {};
  let toyArt = {};
  let cards = {};
  const outfitCache = new Map();

  let boyX = 0.88;
  let boyTarget = boyX;
  let facing = 1;
  let activity = 'idle';
  let activityStart = 0;
  let afterWalk = null;
  let walkPhase = 0;
  let stepAt = 0;
  let picker = null;
  let heldToyId = null;
  let giveTransferred = false;
  let demo = null;
  let lastDemoAt = 0;

  let cotSpot = 'inside';
  let cotX = CONFIG.cot.indoorX;
  let cotMove = null;
  let wheelAngle = 0;
  let cotNudgeUntil = 0;

  let mood = 'content';
  let moodSince = now();
  let preferredToy = 'teddy';
  let babyReaction = 'sit';
  let reactionUntil = 0;
  let blanketOn = false;
  let lastLaughBounce = -1;

  const toys = TOY_DEFS.map(t => ({
    ...t,
    owner: 'loose',
    homeX: t.x,
    homeY: t.y,
  }));

  let drag = null;
  let lastInputAt = now();
  let touchPulses = [];
  let landingPuffs = [];
  let sparkles = [];

  let clouds = [];
  let stars = [];
  let drops = [];
  let flakes = [];
  let leaves = [];
  let snowDepth = 0;

  function boundsOf(img) {
    if (!img || !img.naturalWidth) return FULL_BOUNDS;
    const cached = BOUNDS.get(img);
    if (cached) return cached;
    let box = FULL_BOUNDS;
    try {
      const cw = 96;
      const ch = Math.max(1, Math.round(cw * img.naturalHeight / img.naturalWidth));
      const c = document.createElement('canvas');
      c.width = cw;
      c.height = ch;
      const cg = c.getContext('2d', { willReadFrequently: true });
      cg.drawImage(img, 0, 0, cw, ch);
      const d = cg.getImageData(0, 0, cw, ch).data;
      let x0 = cw;
      let y0 = ch;
      let x1 = -1;
      let y1 = -1;
      for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
          if (d[(y * cw + x) * 4 + 3] <= 20) continue;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
      if (x1 >= x0 && y1 >= y0) {
        box = {
          x0: x0 / cw,
          x1: (x1 + 1) / cw,
          y0: y0 / ch,
          y1: (y1 + 1) / ch,
        };
      }
    } catch (e) {
      // Cross-origin or decode trouble should never stop the procedural world.
    }
    BOUNDS.set(img, box);
    return box;
  }

  function drawGrounded(img, x, baseY, contentH, opts = {}) {
    if (!img || !img.naturalWidth) return;
    const bb = boundsOf(img);
    const sourceH = img.naturalHeight * Math.max(0.01, bb.y1 - bb.y0);
    const scale = contentH / sourceH;
    const fw = img.naturalWidth * scale;
    const fh = img.naturalHeight * scale;
    const contentMid = (bb.x0 + bb.x1) * fw / 2;
    g.save();
    g.translate(x, baseY + (opts.bob || 0));
    if (opts.rotation) g.rotate(opts.rotation);
    g.scale(opts.facing || 1, 1);
    g.drawImage(img, -contentMid, -bb.y1 * fh, fw, fh);
    g.restore();
  }

  function drawContained(img, x, y, maxW, maxH, opts = {}) {
    if (!img || !img.naturalWidth) return;
    const bb = boundsOf(img);
    const contentW = img.naturalWidth * Math.max(0.01, bb.x1 - bb.x0);
    const contentH = img.naturalHeight * Math.max(0.01, bb.y1 - bb.y0);
    const scale = Math.min(maxW / contentW, maxH / contentH);
    const fw = img.naturalWidth * scale;
    const fh = img.naturalHeight * scale;
    const cx = (bb.x0 + bb.x1) * fw / 2;
    const cy = (bb.y0 + bb.y1) * fh / 2;
    g.save();
    g.translate(x, y);
    if (opts.rotation) g.rotate(opts.rotation);
    g.scale(opts.facing || 1, 1);
    g.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
    g.drawImage(img, -cx, -cy, fw, fh);
    g.restore();
  }

  function loadOutfit(index) {
    const outfit = OUTFITS[index];
    if (!outfitCache.has(outfit.id)) {
      outfitCache.set(outfit.id, preloadImages(outfit.poses, 0));
    }
    return outfitCache.get(outfit.id);
  }

  function wearOutfit(index) {
    outfitIndex = index;
    const expected = OUTFITS[index].id;
    loadOutfit(index).then(loaded => {
      if (!alive || OUTFITS[outfitIndex].id !== expected) return;
      images = loaded || {};
      const next = (outfitIndex + 1) % OUTFITS.length;
      if (!outfitCache.has(OUTFITS[next].id)) loadOutfit(next);
    });
  }

  function pose(kind) {
    return images[kind] || images.stand || images.walk || images.jump || null;
  }

  function resize() {
    const w = canvas.clientWidth || stage.clientWidth;
    const h = canvas.clientHeight || stage.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout(w, h);
    seedScenery();
  }

  function layout(w, h) {
    L = playhouseLayout(w, h);
    cameraX = clamp(cameraX, 0, L.cameraMax);
    cameraTarget = clamp(cameraTarget, 0, L.cameraMax);
  }

  function wx(fraction) {
    return fraction * L.w;
  }

  function screenPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function worldPoint(e) {
    const p = screenPoint(e);
    return {
      screenX: p.x,
      x: p.x + cameraX * L.w,
      y: p.y,
      xf: (p.x + cameraX * L.w) / L.w,
      yf: p.y / L.h,
    };
  }

  function focus(where) {
    cameraTarget = where === 'inside' ? 0 : L.cameraMax;
  }

  function focusForX(xf) {
    focus(xf < 0.79 ? 'inside' : 'outside');
  }

  function seedScenery() {
    clouds = Array.from({ length: weather === 'sunny' ? 3 : 5 }, () => ({
      x: Math.random(),
      y: 0.07 + Math.random() * 0.28,
      s: 0.65 + Math.random() * 0.8,
      v: 0.008 + Math.random() * 0.018,
    }));
    stars = Array.from({ length: 36 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.45,
      r: 0.6 + Math.random() * 1.5,
      tw: Math.random() * Math.PI * 2,
    }));
    drops = [];
    flakes = [];
    leaves = [];
  }

  function addPulse(screenX, y) {
    touchPulses.push({ x: screenX, y, born: now() });
    if (touchPulses.length > 12) touchPulses.shift();
  }

  function setActivity(next) {
    activity = next;
    activityStart = now();
  }

  function cancelDemo() {
    demo = null;
  }

  function walkTo(xf, after = null, { keepDemo = false } = {}) {
    if (!keepDemo) cancelDemo();
    if (activity === 'sleeping') activity = 'idle';
    boyTarget = clamp(xf, 0.08, WORLD_SCREENS - 0.05);
    afterWalk = after;
    facing = boyTarget >= boyX ? 1 : -1;
    focusForX(boyTarget);
    if (Math.abs(boyTarget - boyX) < 0.008) {
      finishWalk();
      return;
    }
    setActivity('walking');
  }

  function finishWalk() {
    const next = afterWalk;
    afterWalk = null;
    setActivity('idle');
    if (typeof next === 'function') {
      next();
      return;
    }
    if (!next) return;
    setActivity(next);
    if (next === 'jumping') {
      lastLaughBounce = -1;
      audio.boing();
    } else if (next === 'wardrobe') {
      picker = { openedAt: now() };
      audio.chime();
    } else if (next === 'sleeping') {
      audio.chime();
    } else if (next === 'giving') {
      giveTransferred = false;
    }
  }

  function currentCotX() {
    return cotX;
  }

  function cotBox() {
    const cx = wx(currentCotX());
    return {
      x: cx - L.cotW / 2,
      y: L.groundY - L.cotH,
      w: L.cotW,
      h: L.cotH,
    };
  }

  function babyCenter() {
    const c = cotBox();
    return {
      x: c.x + c.w * 0.53,
      y: c.y + c.h * 0.30,
    };
  }

  function boyBox() {
    return {
      x: wx(boyX) - L.boyH * 0.32,
      y: L.groundY - L.boyH,
      w: L.boyH * 0.64,
      h: L.boyH,
    };
  }

  function toyById(id) {
    return toys.find(t => t.id === id) || null;
  }

  function playToySound(id, delighted = false) {
    if (id === 'rattle') audio.rattleShake();
    else if (id === 'duck') audio.quack();
    else if (id === 'ball') audio.boing();
    else if (id === 'teddy') audio.gentleGift();
    else audio.chime();
    if (delighted) setTimeout(() => { if (alive) audio.babyLaugh(); }, 130);
  }

  function resetBabyMood() {
    mood = 'content';
    moodSince = now();
    preferredToy = ['teddy', 'ball', 'duck', 'rattle'][(Math.random() * 4) | 0];
  }

  function babyReceives(toy, { modelled = false } = {}) {
    if (!toy) return;
    const rightGift = mood === 'wantsToy' && toy.id === preferredToy;
    if (toy.care) {
      blanketOn = true;
      toy.owner = 'baby';
      babyReaction = mood === 'sleepy' ? 'sleepy' : 'sit';
      reactionUntil = now() + CONFIG.baby.reactionMs;
      if (mood === 'sleepy' && cotSpot === 'inside') {
        babyReaction = 'sleep';
        reactionUntil = Infinity;
      }
      audio.chime();
      return;
    }

    toy.owner = 'baby';
    heldToyId = heldToyId === toy.id ? null : heldToyId;
    babyReaction = toy.id === 'teddy' ? 'hugTeddy' : 'sit';
    reactionUntil = now() + CONFIG.baby.reactionMs * (rightGift ? 1.5 : 1);
    playToySound(toy.id, rightGift);
    if (!rightGift) audio.babble();
    resetBabyMood();
    if (modelled) lastDemoAt = now();
  }

  function dropHeldToyNearBoy() {
    if (!heldToyId) return;
    const old = toyById(heldToyId);
    if (old) {
      old.owner = 'loose';
      old.x = clamp(boyX + facing * 0.07, 0.04, WORLD_SCREENS - 0.04);
      old.y = 0.82;
    }
    heldToyId = null;
  }

  function boyTakes(toy) {
    if (!toy || toy.care) return;
    dropHeldToyNearBoy();
    toy.owner = 'boy';
    heldToyId = toy.id;
    setActivity('idle');
    audio.gentleGift();
  }

  function startGiving({ modelled = false } = {}) {
    if (!heldToyId) {
      setActivity('idle');
      return;
    }
    demo = modelled ? { phase: 'giving', toyId: heldToyId } : null;
    facing = currentCotX() >= boyX ? 1 : -1;
    setActivity('giving');
    giveTransferred = false;
  }

  function deliverHeldToy({ modelled = false } = {}) {
    if (!heldToyId || cotMove) return;
    const side = currentCotX() - (currentCotX() >= boyX ? 0.205 : -0.205);
    walkTo(side, () => startGiving({ modelled }), { keepDemo: modelled });
  }

  function startIdleDemo(t) {
    if (demo || heldToyId || activity !== 'idle' || cotMove) return;
    const toy = toys.find(item => !item.care && item.owner === 'loose');
    if (!toy) return;
    demo = { phase: 'pickup', toyId: toy.id };
    walkTo(toy.x, () => {
      if (!alive || !demo || demo.toyId !== toy.id || toy.owner !== 'loose') {
        demo = null;
        return;
      }
      boyTakes(toy);
      demo = { phase: 'carry', toyId: toy.id };
      deliverHeldToy({ modelled: true });
    }, { keepDemo: true });
    lastDemoAt = t;
  }

  function startCotMove(destination) {
    if (cotMove || destination === cotSpot) {
      cotNudgeUntil = now() + 350;
      audio.pop();
      return;
    }
    cancelDemo();
    dropHeldToyNearBoy();
    if (activity === 'sleeping') activity = 'idle';
    const to = destination === 'inside' ? CONFIG.cot.indoorX : CONFIG.cot.outdoorX;
    const direction = Math.sign(to - cotX);
    cotMove = {
      from: cotX,
      to,
      destination,
      direction,
      startedAt: now(),
    };
    facing = direction;
    setActivity('pushing');
    audio.whoosh();
  }

  function finishCotMove() {
    if (!cotMove) return;
    cotSpot = cotMove.destination;
    cotX = cotMove.to;
    boyX = cotX - cotMove.direction * (L.cotW / L.w) * 0.85;
    cotMove = null;
    setActivity('idle');
    focus(cotSpot);
    audio.chime();
    audio.babble();
    if (cotSpot === 'inside' && mood === 'sleepy' && blanketOn) {
      babyReaction = 'sleep';
      reactionUntil = Infinity;
    } else if (babyReaction === 'sleep') {
      babyReaction = 'sleepy';
      reactionUntil = now() + CONFIG.baby.reactionMs;
    }
  }

  function startJumping() {
    walkTo(CONFIG.stations.trampoline, 'jumping');
  }

  function triggerMagic() {
    cancelDemo();
    setActivity('magic');
    sparkles = Array.from({ length: 24 }, (_, i) => ({
      angle: i / 24 * Math.PI * 2 + Math.random() * 0.2,
      distance: 0.24 + Math.random() * 0.58,
      size: 0.012 + Math.random() * 0.018,
      color: CONFIG.colors.leaf[i % CONFIG.colors.leaf.length],
    }));
    audio.chime();
  }

  function cycleWeather() {
    const order = CONFIG.weather.order;
    weather = order[(order.indexOf(weather) + 1) % order.length];
    seedScenery();
    applyWeatherBed();
    audio.pop();
  }

  function toggleNight() {
    night = !night;
    audio.chime();
    if (night && cotSpot === 'inside' && blanketOn) {
      mood = 'sleepy';
      babyReaction = 'sleep';
      reactionUntil = Infinity;
    } else if (!night && babyReaction === 'sleep') {
      resetBabyMood();
      babyReaction = 'sit';
      reactionUntil = 0;
    }
  }

  const WEATHER_BED = { rainy: 'rain', windy: 'wind' };
  function applyWeatherBed() {
    audio.setWeatherBed(WEATHER_BED[weather] || null);
  }

  function toyHit(p) {
    let best = null;
    let bestDistance = Infinity;
    for (const toy of toys) {
      if (toy.owner !== 'loose') continue;
      const x = wx(toy.x);
      const y = toy.y * L.h;
      const radius = L.unit * Math.max(0.055, toy.size * 0.75);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d <= radius && d < bestDistance) {
        best = toy;
        bestDistance = d;
      }
    }
    return best;
  }

  function inBox(p, b, pad = L.unit * 0.04) {
    return p.x >= b.x - pad && p.x <= b.x + b.w + pad
      && p.y >= b.y - pad && p.y <= b.y + b.h + pad;
  }

  function cotHandleHit(p) {
    const c = cotBox();
    const pad = L.unit * 0.07;
    return p.y >= c.y - pad && p.y <= c.y + c.h * 0.75
      && p.x >= c.x - pad * 1.8 && p.x <= c.x + c.w + pad * 1.8;
  }

  function babyHit(p) {
    const b = babyCenter();
    return Math.hypot(p.x - b.x, p.y - b.y) <= L.unit * 0.19;
  }

  function beginToyDrag(e, p, toy) {
    cancelDemo();
    if (heldToyId === toy.id) heldToyId = null;
    toy.owner = 'drag';
    drag = {
      kind: 'toy',
      id: toy.id,
      pointerId: e.pointerId,
      offsetX: p.x - wx(toy.x),
      offsetY: p.y - toy.y * L.h,
    };
    babyReaction = 'sit';
    canvas.setPointerCapture?.(e.pointerId);
    playToySound(toy.id);
  }

  function beginCotGesture(e, p) {
    drag = {
      kind: 'cot',
      pointerId: e.pointerId,
      startScreenX: p.screenX,
      started: false,
    };
    cotNudgeUntil = now() + 450;
    canvas.setPointerCapture?.(e.pointerId);
    audio.pop();
  }

  function onPointerDown(e) {
    if (!alive || !L || L.portrait) return;
    const p = worldPoint(e);
    lastInputAt = now();
    addPulse(p.screenX, p.y);
    if (audio.tryResume()) applyWeatherBed();

    if (picker) {
      const index = pickerHit(p.screenX, p.y);
      if (index >= 0) {
        picker = null;
        wearOutfit(index);
        audio.pop();
      } else {
        picker = null;
      }
      return;
    }

    const toy = toyHit(p);
    if (toy) {
      beginToyDrag(e, p, toy);
      return;
    }

    if (cotHandleHit(p)) {
      beginCotGesture(e, p);
      return;
    }

    if (Math.hypot(p.screenX - L.sunX, p.y - L.sunY) <= L.sunR * 1.75) {
      toggleNight();
      return;
    }

    if (p.y < L.horizonY) {
      cycleWeather();
      return;
    }

    if (babyHit(p)) {
      if (heldToyId) {
        deliverHeldToy();
      } else if (babyReaction === 'sleep') {
        babyReaction = 'sit';
        blanketOn = false;
        const blanket = toyById('blanket');
        if (blanket) {
          blanket.owner = 'loose';
          blanket.x = cotX + 0.11;
          blanket.y = 0.82;
        }
        resetBabyMood();
        audio.babble();
      } else {
        babyReaction = 'laugh';
        reactionUntil = now() + CONFIG.baby.laughMs;
        audio.babyLaugh();
      }
      return;
    }

    if (inBox(p, L.bed)) {
      focus('inside');
      walkTo(CONFIG.stations.bed, 'sleeping');
      return;
    }

    if (inBox(p, L.wardrobe)) {
      focus('inside');
      walkTo(CONFIG.stations.wardrobe, 'wardrobe');
      return;
    }

    if (inBox(p, L.tram, L.unit * 0.07)) {
      focus('outside');
      startJumping();
      return;
    }

    if (inBox(p, L.bin, L.unit * 0.06)) {
      focus('outside');
      for (const item of toys) {
        if (item.owner === 'loose' && !item.care) {
          item.y = clamp(item.y - 0.025 - Math.random() * 0.02, 0.62, 0.83);
        }
      }
      audio.rattleShake();
      return;
    }

    if (inBox(p, boyBox(), L.unit * 0.035)) {
      triggerMagic();
      return;
    }

    // The house sliver and the open yard are natural attention targets rather
    // than labelled navigation controls.
    if (p.x >= wx(0.70) && p.x <= wx(0.84)) {
      focus(cameraTarget > 0.35 ? 'inside' : 'outside');
      audio.pop();
      return;
    }

    walkTo(p.xf);
  }

  function onPointerMove(e) {
    if (!drag || drag.pointerId !== e.pointerId || !L) return;
    const p = worldPoint(e);
    if (drag.kind === 'toy') {
      const toy = toyById(drag.id);
      if (!toy) return;

      if (p.screenX < L.w * CONFIG.camera.edgeFrac) focus('inside');
      else if (p.screenX > L.w * (1 - CONFIG.camera.edgeFrac)) focus('outside');

      toy.x = clamp((p.x - drag.offsetX) / L.w, 0.04, WORLD_SCREENS - 0.04);
      toy.y = clamp((p.y - drag.offsetY) / L.h, 0.42, 0.84);
      const baby = babyCenter();
      if (Math.hypot(wx(toy.x) - baby.x, toy.y * L.h - baby.y) < L.unit * CONFIG.toys.snapBabyFrac) {
        babyReaction = 'reach';
        reactionUntil = now() + 240;
      } else if (reactionUntil < now()) {
        babyReaction = mood === 'sleepy' ? 'sleepy' : 'sit';
      }
      return;
    }

    if (drag.kind === 'cot' && !drag.started) {
      const dx = p.screenX - drag.startScreenX;
      const required = L.unit * 0.045;
      const wantsOutside = cotSpot === 'inside' && dx > required;
      const wantsInside = cotSpot === 'outside' && dx < -required;
      if (wantsOutside || wantsInside) {
        drag.started = true;
        startCotMove(wantsOutside ? 'outside' : 'inside');
      }
    }
  }

  function finishToyDrag(toy) {
    if (!toy) return;
    const baby = babyCenter();
    const tx = wx(toy.x);
    const ty = toy.y * L.h;
    const boy = boyBox();
    const boyCx = boy.x + boy.w / 2;
    const boyCy = boy.y + boy.h * 0.48;

    if (Math.hypot(tx - baby.x, ty - baby.y) <= L.unit * CONFIG.toys.snapBabyFrac) {
      babyReceives(toy);
    } else if (!toy.care
      && Math.hypot(tx - boyCx, ty - boyCy) <= L.unit * CONFIG.toys.snapBoyFrac) {
      boyTakes(toy);
    } else {
      toy.owner = 'loose';
      audio.pop();
    }
    if (babyReaction === 'reach' && reactionUntil < now() + 300) {
      babyReaction = mood === 'sleepy' ? 'sleepy' : 'sit';
    }
  }

  function endPointer(e) {
    if (!drag || drag.pointerId !== e.pointerId) return;
    if (drag.kind === 'toy') finishToyDrag(toyById(drag.id));
    drag = null;
    try {
      canvas.releasePointerCapture?.(e.pointerId);
    } catch (err) {
      // Pointer capture may already be gone after an orientation change.
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  function updateBoy(dt, t) {
    if (activity === 'walking') {
      const distance = boyTarget - boyX;
      const step = CONFIG.boy.walkSpeed * dt;
      if (Math.abs(distance) <= step) {
        boyX = boyTarget;
        finishWalk();
      } else {
        boyX += Math.sign(distance) * step;
        walkPhase += dt * CONFIG.boy.bobHz;
        if (t >= stepAt) {
          audio.footstep();
          stepAt = t + 310;
        }
      }
    }

    if (activity === 'giving') {
      const age = t - activityStart;
      if (!giveTransferred && age >= 520) {
        giveTransferred = true;
        const toy = toyById(heldToyId);
        if (toy) babyReceives(toy, { modelled: !!demo });
        heldToyId = null;
      }
      if (age >= 1050) {
        setActivity('idle');
        demo = null;
      }
    }

    if (activity === 'magic' && t - activityStart > 1450) {
      setActivity('idle');
      sparkles = [];
    }

    if (activity === 'jumping') {
      const total = CONFIG.jump.count * CONFIG.jump.durationMs;
      const age = t - activityStart;
      const bounce = Math.floor(age / CONFIG.jump.durationMs);
      const local = (age % CONFIG.jump.durationMs) / CONFIG.jump.durationMs;
      if (bounce < CONFIG.jump.count && local > 0.78 && lastLaughBounce !== bounce) {
        lastLaughBounce = bounce;
        landingPuffs.push({ x: wx(CONFIG.stations.trampoline), born: t });
        audio.boing();
        if (cotSpot === 'outside') {
          babyReaction = 'laugh';
          reactionUntil = t + CONFIG.baby.laughMs;
          audio.babyLaugh();
        }
      }
      if (age >= total) setActivity('idle');
    }
  }

  function updateCot(t) {
    if (!cotMove) return;
    const progress = clamp01((t - cotMove.startedAt) / CONFIG.cot.moveMs);
    const eased = easeInOutCubic(progress);
    cotX = lerp(cotMove.from, cotMove.to, eased);
    boyX = cotX - cotMove.direction * (L.cotW / L.w) * 0.66;
    facing = cotMove.direction;
    wheelAngle += 0.16;
    cameraTarget = clamp(cotX - 0.36, 0, L.cameraMax);
    if (progress >= 1) finishCotMove();
  }

  function updateBaby(t) {
    if (babyReaction !== 'sleep' && t >= reactionUntil) {
      babyReaction = mood === 'sleepy' ? 'sleepy' : 'sit';
    }
    if (babyReaction === 'sleep') return;

    const moodAge = t - moodSince;
    if (mood === 'content' && moodAge >= CONFIG.baby.contentMs) {
      mood = 'wantsToy';
      moodSince = t;
      const available = toys.filter(toy => !toy.care && toy.owner !== 'baby');
      preferredToy = (available[(Math.random() * available.length) | 0] || { id: 'teddy' }).id;
    } else if (mood === 'wantsToy' && moodAge >= CONFIG.baby.toyWantMs) {
      mood = 'sleepy';
      moodSince = t;
      babyReaction = 'sleepy';
      reactionUntil = Infinity;
    }

    if (mood === 'wantsToy'
      && t - lastInputAt >= CONFIG.idleDemoMs
      && t - lastDemoAt >= CONFIG.idleDemoMs * 2) {
      startIdleDemo(t);
    }
  }

  function updateWeather(dt) {
    const drift = weather === 'windy' ? 3.1 : 1;
    for (const cloud of clouds) {
      cloud.x += cloud.v * dt * drift;
      if (cloud.x > 1.25) cloud.x = -0.25;
    }

    if (weather === 'rainy') {
      while (drops.length < CONFIG.weather.rainDrops) {
        drops.push({
          x: Math.random() * L.w,
          y: Math.random() * -L.h,
          speed: 0.75 + Math.random() * 0.65,
        });
      }
      for (const drop of drops) {
        drop.y += L.h * 1.45 * dt * drop.speed;
        if (drop.y > L.groundY) {
          drop.y = -Math.random() * L.h * 0.4;
          drop.x = Math.random() * L.w;
        }
      }
    } else {
      drops = [];
    }

    if (weather === 'snowy') {
      while (flakes.length < CONFIG.weather.snowFlakes) {
        flakes.push({
          x: Math.random() * L.w,
          y: Math.random() * -L.h,
          r: L.unit * (0.004 + Math.random() * 0.006),
          speed: 0.55 + Math.random() * 0.75,
          wobble: Math.random() * Math.PI * 2,
        });
      }
      for (const flake of flakes) {
        flake.y += L.h * 0.17 * dt * flake.speed;
        flake.wobble += dt * 1.5;
        flake.x += Math.sin(flake.wobble) * L.w * 0.025 * dt;
        if (flake.y > L.groundY) {
          flake.y = -Math.random() * L.h * 0.35;
          flake.x = Math.random() * L.w;
        }
      }
      snowDepth = Math.min(1, snowDepth + dt * 1000 / CONFIG.weather.snowSettleMs);
    } else {
      flakes = [];
      snowDepth = Math.max(0, snowDepth - dt * 1000 / CONFIG.weather.snowThawMs);
    }

    if (weather === 'windy') {
      while (leaves.length < CONFIG.weather.leafCount) {
        leaves.push({
          x: -0.2 - Math.random() * 0.4,
          y: 0.12 + Math.random() * 0.45,
          angle: Math.random() * Math.PI,
          speed: 0.45 + Math.random() * 0.35,
          color: CONFIG.colors.leaf[(Math.random() * CONFIG.colors.leaf.length) | 0],
        });
      }
      for (const leaf of leaves) {
        leaf.x += leaf.speed * dt;
        leaf.angle += dt * 5;
        if (leaf.x > 1.2) leaf.x = -0.2;
      }
    } else {
      leaves = [];
    }
  }

  function update(dt, t) {
    const cameraEase = 1 - Math.exp(-CONFIG.camera.ease * dt);
    cameraX = lerp(cameraX, cameraTarget, cameraEase);
    if (Math.abs(cameraTarget - cameraX) < 0.0005) cameraX = cameraTarget;

    updateBoy(dt, t);
    updateCot(t);
    updateBaby(t);
    updateWeather(dt);

    touchPulses = touchPulses.filter(p => t - p.born < 480);
    landingPuffs = landingPuffs.filter(p => t - p.born < 520);
  }

  function skyColors() {
    if (night) return [CONFIG.colors.skyNightTop, CONFIG.colors.skyNightBottom];
    if (weather === 'rainy') return [CONFIG.colors.skyRainTop, CONFIG.colors.skyRainBottom];
    if (weather === 'snowy') return [CONFIG.colors.skySnowTop, CONFIG.colors.skySnowBottom];
    return [CONFIG.colors.skyDayTop, CONFIG.colors.skyDayBottom];
  }

  function drawSky(t) {
    const [top, bottom] = skyColors();
    const gradient = g.createLinearGradient(0, 0, 0, L.horizonY);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    g.fillStyle = gradient;
    g.fillRect(0, 0, L.w, L.horizonY + 1);

    if (night) {
      for (const star of stars) {
        g.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t / 900 + star.tw));
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(star.x * L.w, star.y * L.horizonY, star.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }

    drawSunMoon(t);
    for (const cloud of clouds) drawCloud(cloud);
  }

  function drawSunMoon(t) {
    const x = L.sunX;
    const y = L.sunY;
    const r = L.sunR;
    g.save();
    if (night) {
      g.fillStyle = CONFIG.colors.moon;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = skyColors()[0];
      g.beginPath();
      g.arc(x + r * 0.38, y - r * 0.24, r * 0.86, 0, Math.PI * 2);
      g.fill();
    } else {
      if (weather === 'rainy' || weather === 'snowy') g.globalAlpha = 0.5;
      const glow = g.createRadialGradient(x, y, r * 0.2, x, y, r * 2);
      glow.addColorStop(0, 'rgba(255,243,176,.6)');
      glow.addColorStop(1, 'rgba(255,243,176,0)');
      g.fillStyle = glow;
      g.beginPath();
      g.arc(x, y, r * 2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = CONFIG.colors.sun;
      g.lineWidth = Math.max(2, r * 0.13);
      g.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const angle = i / 10 * Math.PI * 2 + t / 4200;
        g.beginPath();
        g.moveTo(x + Math.cos(angle) * r * 1.25, y + Math.sin(angle) * r * 1.25);
        g.lineTo(x + Math.cos(angle) * r * 1.58, y + Math.sin(angle) * r * 1.58);
        g.stroke();
      }
      g.fillStyle = CONFIG.colors.sun;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function drawCloud(cloud) {
    const x = cloud.x * L.w;
    const y = cloud.y * L.h;
    const s = cloud.s * L.unit * 0.055;
    g.save();
    g.globalAlpha = weather === 'rainy' ? 0.82 : 0.92;
    g.fillStyle = night ? '#8f9ccb' : '#ffffff';
    for (const [dx, dy, radius] of [[0, 0, 0.7], [0.65, -0.22, 0.9], [1.38, 0, 0.72]]) {
      g.beginPath();
      g.arc(x + dx * s, y + dy * s, radius * s, 0, Math.PI * 2);
      g.fill();
    }
    g.fillRect(x, y - s * 0.25, s * 1.4, s * 0.65);
    g.restore();
  }

  function drawGround() {
    g.fillStyle = night ? CONFIG.colors.grassNight : CONFIG.colors.grassDay;
    g.fillRect(0, L.horizonY, L.worldW, L.h - L.horizonY);
    g.globalAlpha = 0.16;
    g.fillStyle = CONFIG.colors.grassStripe;
    for (let x = 0; x < L.worldW; x += L.unit * 0.12) {
      g.beginPath();
      g.ellipse(x, L.groundY + L.unit * 0.025, L.unit * 0.09, L.unit * 0.02, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;

    if (snowDepth > 0) {
      g.fillStyle = CONFIG.colors.snow;
      g.globalAlpha = 0.35 + snowDepth * 0.65;
      g.fillRect(0, L.horizonY, L.worldW, L.h - L.horizonY);
      g.globalAlpha = 1;
    }
  }

  function drawHouse() {
    const h = L.house;
    const wallColor = night ? CONFIG.colors.wallNight : CONFIG.colors.wall;
    const interiorColor = night ? CONFIG.colors.interiorNight : CONFIG.colors.interior;

    // Interior cutaway: wide in the indoor rest, entirely off-screen except
    // for the final exterior sliver in the outdoor rest.
    g.fillStyle = interiorColor;
    g.fillRect(h.x, h.wallTop, h.interiorRight - h.x, L.groundY - h.wallTop);
    g.fillStyle = CONFIG.colors.floor;
    g.fillRect(h.x, L.groundY - L.unit * 0.035, h.interiorRight - h.x, L.unit * 0.035);

    // Threshold/exterior sliver with a real window to tap from the yard.
    g.fillStyle = wallColor;
    g.fillRect(h.interiorRight, h.wallTop, h.right - h.interiorRight, L.groundY - h.wallTop);
    const window = {
      x: wx(0.718),
      y: h.wallTop + L.unit * 0.12,
      w: wx(0.078),
      h: L.unit * 0.20,
    };
    g.fillStyle = night ? '#35507c' : '#9fe2ff';
    g.fillRect(window.x, window.y, window.w, window.h);
    g.strokeStyle = '#fffaf0';
    g.lineWidth = Math.max(4, L.unit * 0.014);
    g.strokeRect(window.x, window.y, window.w, window.h);
    g.beginPath();
    g.moveTo(window.x + window.w / 2, window.y);
    g.lineTo(window.x + window.w / 2, window.y + window.h);
    g.moveTo(window.x, window.y + window.h / 2);
    g.lineTo(window.x + window.w, window.y + window.h / 2);
    g.stroke();

    // A curtain and pillow glimpse give the little outdoor window a reason to
    // exist without placing a second fake bed behind it.
    g.fillStyle = 'rgba(255,255,255,.65)';
    g.beginPath();
    g.moveTo(window.x, window.y);
    g.lineTo(window.x + window.w * 0.25, window.y);
    g.lineTo(window.x + window.w * 0.16, window.y + window.h);
    g.lineTo(window.x, window.y + window.h);
    g.closePath();
    g.fill();

    g.fillStyle = CONFIG.colors.roof;
    g.strokeStyle = CONFIG.colors.roofDark;
    g.lineJoin = 'round';
    g.lineWidth = Math.max(4, L.unit * 0.02);
    g.beginPath();
    g.moveTo(h.x - L.unit * 0.035, h.wallTop + L.unit * 0.015);
    g.lineTo((h.x + h.right) / 2, h.roofPeak);
    g.lineTo(h.right + L.unit * 0.035, h.wallTop + L.unit * 0.015);
    g.stroke();

    if (snowDepth > 0) {
      g.strokeStyle = CONFIG.colors.snow;
      g.globalAlpha = snowDepth;
      g.lineWidth = L.unit * 0.025;
      g.beginPath();
      g.moveTo(h.x - L.unit * 0.03, h.wallTop + L.unit * 0.005);
      g.lineTo((h.x + h.right) / 2, h.roofPeak - L.unit * 0.008);
      g.lineTo(h.right + L.unit * 0.03, h.wallTop + L.unit * 0.005);
      g.stroke();
      g.globalAlpha = 1;
    }
  }

  function drawBed() {
    const b = L.bed;
    g.fillStyle = CONFIG.colors.bedFrame;
    roundRect(b.x, b.y + b.h * 0.48, b.w, b.h * 0.46, L.unit * 0.025);
    g.fill();
    g.fillRect(b.x + b.w * 0.04, b.y + b.h * 0.88, b.w * 0.06, b.h * 0.12);
    g.fillRect(b.x + b.w * 0.90, b.y + b.h * 0.88, b.w * 0.06, b.h * 0.12);

    g.fillStyle = CONFIG.colors.bedSheet;
    roundRect(b.x + b.w * 0.05, b.y + b.h * 0.35, b.w * 0.90, b.h * 0.35, L.unit * 0.02);
    g.fill();
    g.fillStyle = CONFIG.colors.bedBlanket;
    roundRect(b.x + b.w * 0.38, b.y + b.h * 0.40, b.w * 0.57, b.h * 0.34, L.unit * 0.018);
    g.fill();
    g.fillStyle = '#fffdf7';
    roundRect(b.x + b.w * 0.08, b.y + b.h * 0.38, b.w * 0.26, b.h * 0.20, L.unit * 0.02);
    g.fill();

    // The folded care blanket starts visibly on a low shelf beside the bed.
    const blanket = toyById('blanket');
    if (blanket && blanket.owner === 'loose') {
      drawContained(toyArt.blanket, wx(blanket.x), blanket.y * L.h, L.unit * 0.13, L.unit * 0.09);
    }
  }

  function drawWardrobe(t) {
    const w = L.wardrobe;
    g.fillStyle = CONFIG.colors.wardrobeDark;
    roundRect(w.x, w.y, w.w, w.h, L.unit * 0.025);
    g.fill();
    g.fillStyle = CONFIG.colors.wardrobe;
    roundRect(w.x + w.w * 0.04, w.y + w.h * 0.04, w.w * 0.92, w.h * 0.92, L.unit * 0.02);
    g.fill();

    const open = activity === 'wardrobe' || picker;
    const amount = open ? easeOutCubic(clamp01((t - activityStart) / 520)) : 0;
    const half = w.w * 0.44;
    g.fillStyle = CONFIG.colors.wardrobeDoor;
    roundRect(w.x + w.w * 0.06 - half * amount * 0.42, w.y + w.h * 0.07, half, w.h * 0.84, L.unit * 0.015);
    g.fill();
    roundRect(w.x + w.w * 0.50 + half * amount * 0.42, w.y + w.h * 0.07, half, w.h * 0.84, L.unit * 0.015);
    g.fill();
    g.fillStyle = '#e8c36b';
    g.beginPath();
    g.arc(w.x + w.w * 0.47 - half * amount * 0.42, w.y + w.h * 0.50, L.unit * 0.008, 0, Math.PI * 2);
    g.arc(w.x + w.w * 0.53 + half * amount * 0.42, w.y + w.h * 0.50, L.unit * 0.008, 0, Math.PI * 2);
    g.fill();
  }

  function drawBush() {
    drawShadow(L.bush.x + L.bush.w / 2, L.groundY, L.bush.w * 0.72, L.unit * 0.025, 0.16);
    drawContained(worldArt.bush, L.bush.x + L.bush.w / 2, L.bush.y + L.bush.h / 2, L.bush.w, L.bush.h);
  }

  function jumpState(t) {
    if (activity !== 'jumping') return { lift: 0, compress: 0 };
    const local = ((t - activityStart) % CONFIG.jump.durationMs) / CONFIG.jump.durationMs;
    const lift = Math.sin(Math.PI * local) * L.boyH * CONFIG.jump.heightFrac;
    const landing = Math.max(0, (local - 0.76) / 0.24);
    const compress = Math.sin(Math.PI * clamp01(landing)) * L.unit * 0.025;
    return { lift, compress };
  }

  function drawTrampoline(t) {
    const tr = L.tram;
    const jump = jumpState(t);
    const matY = tr.y + tr.h * 0.25 + jump.compress;

    g.strokeStyle = CONFIG.colors.tramSpring;
    g.lineWidth = Math.max(2, L.unit * 0.008);
    for (let i = 0; i < 7; i++) {
      const x = tr.x + tr.w * (0.12 + i * 0.125);
      g.beginPath();
      g.moveTo(x, matY);
      g.lineTo(x - tr.w * 0.025, tr.y + tr.h * 0.62);
      g.lineTo(x + tr.w * 0.025, tr.y + tr.h * 0.75);
      g.stroke();
    }
    g.strokeStyle = CONFIG.colors.tramFrame;
    g.lineWidth = Math.max(4, L.unit * 0.014);
    g.beginPath();
    g.moveTo(tr.x + tr.w * 0.13, matY);
    g.lineTo(tr.x + tr.w * 0.07, L.groundY);
    g.moveTo(tr.x + tr.w * 0.87, matY);
    g.lineTo(tr.x + tr.w * 0.93, L.groundY);
    g.stroke();

    g.fillStyle = CONFIG.colors.tramMat;
    g.beginPath();
    g.ellipse(tr.x + tr.w / 2, matY, tr.w / 2, tr.h * 0.18, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = CONFIG.colors.tramFrame;
    g.lineWidth = Math.max(3, L.unit * 0.012);
    g.stroke();
  }

  function drawToyBin() {
    const looseCount = toys.filter(toy => !toy.care && toy.owner === 'loose').length;
    const art = looseCount ? worldArt.binOpen : worldArt.binClosed;
    drawShadow(L.bin.x + L.bin.w / 2, L.groundY, L.bin.w * 0.68, L.unit * 0.024, 0.17);
    drawContained(art, L.bin.x + L.bin.w / 2, L.bin.y + L.bin.h / 2, L.bin.w, L.bin.h);
  }

  function drawShadow(x, y, rx, ry, alpha = 0.18) {
    g.save();
    g.fillStyle = `rgba(45,50,55,${alpha})`;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawCotBack(t) {
    const c = cotBox();
    const nudge = t < cotNudgeUntil ? Math.sin((cotNudgeUntil - t) / 45) * L.unit * 0.005 : 0;
    g.save();
    g.translate(nudge, 0);
    drawShadow(c.x + c.w / 2, L.groundY, c.w * 0.43, L.unit * 0.025, 0.20);

    g.strokeStyle = CONFIG.colors.cotDark;
    g.lineWidth = Math.max(4, L.unit * 0.012);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(c.x + c.w * 0.07, c.y + c.h * 0.36);
    g.lineTo(c.x - c.w * 0.13, c.y + c.h * 0.16);
    g.moveTo(c.x + c.w * 0.93, c.y + c.h * 0.36);
    g.lineTo(c.x + c.w * 1.13, c.y + c.h * 0.16);
    g.stroke();

    g.fillStyle = CONFIG.colors.cotDark;
    g.beginPath();
    g.arc(c.x + c.w * 0.21, L.groundY - L.unit * 0.012, L.unit * 0.032, 0, Math.PI * 2);
    g.arc(c.x + c.w * 0.79, L.groundY - L.unit * 0.012, L.unit * 0.032, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f5dba0';
    g.lineWidth = Math.max(2, L.unit * 0.006);
    for (const wheelX of [c.x + c.w * 0.21, c.x + c.w * 0.79]) {
      g.save();
      g.translate(wheelX, L.groundY - L.unit * 0.012);
      g.rotate(wheelAngle);
      g.beginPath();
      g.moveTo(-L.unit * 0.022, 0);
      g.lineTo(L.unit * 0.022, 0);
      g.moveTo(0, -L.unit * 0.022);
      g.lineTo(0, L.unit * 0.022);
      g.stroke();
      g.restore();
    }

    g.fillStyle = CONFIG.colors.cotFrame;
    roundRect(c.x, c.y + c.h * 0.16, c.w, c.h * 0.69, L.unit * 0.035);
    g.fill();
    g.fillStyle = CONFIG.colors.cotMat;
    roundRect(c.x + c.w * 0.07, c.y + c.h * 0.20, c.w * 0.86, c.h * 0.50, L.unit * 0.03);
    g.fill();
    g.restore();
  }

  function drawBaby(t) {
    const c = cotBox();
    const center = babyCenter();
    let kind = babyReaction;
    if (kind === 'sit' && mood === 'sleepy') kind = 'sleepy';
    const img = babyArt[kind] || babyArt.sit;
    const base = c.y + c.h * 0.76;
    const bob = kind === 'laugh' ? Math.sin(t / 75) * L.unit * 0.004 : 0;
    drawGrounded(img, center.x, base, L.babyH, { facing: 1, bob });

    const owned = toys.filter(toy => toy.owner === 'baby' && !toy.care);
    if (kind !== 'hugTeddy' && kind !== 'sleep') {
      owned.slice(-2).forEach((toy, index) => {
        const x = center.x + (index - (owned.length > 1 ? 0.5 : 0)) * L.unit * 0.055;
        const y = c.y + c.h * 0.47;
        drawContained(toyArt[toy.id], x, y, L.unit * 0.095, L.unit * 0.095);
      });
    }

    if (blanketOn) {
      g.save();
      g.globalAlpha = kind === 'sleep' ? 0.96 : 0.82;
      g.fillStyle = '#f8d7dd';
      roundRect(c.x + c.w * 0.22, c.y + c.h * 0.48, c.w * 0.58, c.h * 0.34, L.unit * 0.025);
      g.fill();
      g.strokeStyle = '#efb8c4';
      g.lineWidth = Math.max(2, L.unit * 0.006);
      g.stroke();
      g.restore();
    }

    drawBabyMoodBubble(t, center.x, c.y - L.unit * 0.03);
  }

  function drawBabyMoodBubble(t, x, y) {
    if (babyReaction === 'sleep') {
      g.fillStyle = CONFIG.colors.ink;
      g.globalAlpha = 0.55 + 0.25 * Math.sin(t / 400);
      g.font = `700 ${Math.max(18, L.unit * 0.055)}px system-ui`;
      g.fillText('Z', x + L.unit * 0.08, y - L.unit * 0.03);
      g.globalAlpha = 1;
      return;
    }
    if (mood === 'content') return;

    const bubbleY = y - L.unit * 0.06 + Math.sin(t / 500) * L.unit * 0.004;
    g.fillStyle = 'rgba(255,255,255,.94)';
    g.strokeStyle = 'rgba(58,51,87,.18)';
    g.lineWidth = Math.max(2, L.unit * 0.006);
    g.beginPath();
    g.arc(x, bubbleY, L.unit * 0.064, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.arc(x - L.unit * 0.045, bubbleY + L.unit * 0.063, L.unit * 0.016, 0, Math.PI * 2);
    g.fill();

    if (mood === 'wantsToy') {
      drawContained(toyArt[preferredToy], x, bubbleY, L.unit * 0.075, L.unit * 0.075);
    } else {
      g.fillStyle = CONFIG.colors.ink;
      g.font = `700 ${Math.max(14, L.unit * 0.045)}px system-ui`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Z', x, bubbleY);
      g.textBaseline = 'alphabetic';
    }
  }

  function drawCotFront(t) {
    const c = cotBox();
    const nudge = t < cotNudgeUntil ? Math.sin((cotNudgeUntil - t) / 45) * L.unit * 0.005 : 0;
    g.save();
    g.translate(nudge, 0);
    g.fillStyle = CONFIG.colors.cotFrame;
    roundRect(c.x + c.w * 0.03, c.y + c.h * 0.55, c.w * 0.94, c.h * 0.28, L.unit * 0.025);
    g.fill();
    g.strokeStyle = CONFIG.colors.cotRail;
    g.lineWidth = Math.max(3, L.unit * 0.009);
    for (let i = 1; i < 7; i++) {
      const x = c.x + c.w * (0.06 + i * 0.125);
      g.beginPath();
      g.moveTo(x, c.y + c.h * 0.26);
      g.lineTo(x, c.y + c.h * 0.68);
      g.stroke();
    }
    g.strokeStyle = CONFIG.colors.cotDark;
    g.lineWidth = Math.max(4, L.unit * 0.012);
    g.beginPath();
    g.moveTo(c.x + c.w * 0.04, c.y + c.h * 0.25);
    g.lineTo(c.x + c.w * 0.96, c.y + c.h * 0.25);
    g.stroke();

    // A soft pulse on the handles makes the physical verb discoverable.
    if (!drag && !cotMove && t - lastInputAt > 4500) {
      const alpha = 0.18 + 0.16 * Math.sin(t / 420);
      g.strokeStyle = `rgba(255,255,255,${alpha})`;
      g.lineWidth = L.unit * 0.012;
      g.beginPath();
      g.arc(c.x - c.w * 0.13, c.y + c.h * 0.16, L.unit * 0.035, 0, Math.PI * 2);
      g.arc(c.x + c.w * 1.13, c.y + c.h * 0.16, L.unit * 0.035, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  }

  function drawLooseToys(t) {
    for (const toy of toys) {
      if (toy.owner !== 'loose' && toy.owner !== 'drag') continue;
      if (toy.id === 'blanket') continue; // drawn beside the bed
      const x = wx(toy.x);
      const y = toy.y * L.h;
      const lift = toy.owner === 'drag' ? L.unit * 0.012 : 0;
      drawShadow(x, y + L.unit * 0.035, L.unit * toy.size * 0.45, L.unit * 0.012, toy.owner === 'drag' ? 0.24 : 0.13);
      drawContained(
        toyArt[toy.id],
        x,
        y - lift,
        L.unit * toy.size,
        L.unit * toy.size,
        { rotation: toy.owner === 'drag' ? Math.sin(t / 130) * 0.05 : 0 },
      );
    }
  }

  function drawBlanketIfDragged(t) {
    const blanket = toyById('blanket');
    if (!blanket || blanket.owner !== 'drag') return;
    const x = wx(blanket.x);
    const y = blanket.y * L.h;
    drawShadow(x, y + L.unit * 0.035, L.unit * 0.06, L.unit * 0.012, 0.20);
    drawContained(toyArt.blanket, x, y - L.unit * 0.012, L.unit * 0.13, L.unit * 0.10, {
      rotation: Math.sin(t / 140) * 0.04,
    });
  }

  function currentBoyPose(t) {
    if (activity === 'pushing') {
      return pose(Math.floor((t - activityStart) / 180) % 2 ? 'pushA' : 'pushB');
    }
    if (activity === 'giving') return pose('give');
    if (heldToyId) return pose('carry');
    if (activity === 'walking') return pose('walk');
    if (activity === 'jumping') return pose('jump');
    if (activity === 'sleeping') return pose('sleep');
    if (activity === 'magic') return pose('magic');
    return pose('stand');
  }

  function drawBoy(t) {
    if (activity === 'sleeping') {
      drawSleepingBoy(t);
      return;
    }
    const x = wx(boyX);
    const jump = jumpState(t);
    let base = L.groundY - jump.lift;
    let bob = 0;
    if (activity === 'walking') bob = Math.sin(walkPhase * Math.PI * 2) * L.boyH * 0.012;
    if (activity === 'pushing') bob = Math.sin((t - activityStart) / 90) * L.boyH * 0.007;

    drawShadow(x, L.groundY, L.boyH * 0.22 * (1 - jump.lift / (L.boyH * 0.8)), L.unit * 0.018, 0.18);
    const img = currentBoyPose(t);
    const height = activity === 'giving' ? L.boyH * 0.82 : L.boyH;
    drawGrounded(img, x, base, height, { facing, bob });

    if (heldToyId) drawHeldToy(t);
    if (activity === 'magic') drawMagic(t, x, base);
  }

  function drawHeldToy(t) {
    const toy = toyById(heldToyId);
    if (!toy) return;
    const progress = activity === 'giving'
      ? easeInOutCubic(clamp01((t - activityStart) / 720))
      : 0;
    const startX = wx(boyX) + facing * L.boyH * 0.20;
    const startY = L.groundY - L.boyH * (activity === 'giving' ? 0.42 : 0.46);
    const baby = babyCenter();
    const x = lerp(startX, baby.x - facing * L.unit * 0.025, progress);
    const y = lerp(startY, baby.y + L.unit * 0.03, progress) - Math.sin(progress * Math.PI) * L.unit * 0.035;
    drawContained(toyArt[toy.id], x, y, L.unit * 0.082, L.unit * 0.082);
  }

  function drawSleepingBoy(t) {
    const b = L.bed;
    const img = pose('sleep');
    const x = b.x + b.w * 0.52;
    const base = b.y + b.h * 0.68;
    drawGrounded(img, x, base, L.boyH * 0.57, { facing: 1 });
    g.fillStyle = CONFIG.colors.bedBlanket;
    g.globalAlpha = 0.92;
    roundRect(b.x + b.w * 0.34, b.y + b.h * 0.43, b.w * 0.60, b.h * 0.30, L.unit * 0.018);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = CONFIG.colors.ink;
    g.globalAlpha = 0.55 + 0.2 * Math.sin(t / 420);
    g.font = `700 ${Math.max(18, L.unit * 0.05)}px system-ui`;
    g.fillText('Z', b.x + b.w * 0.25, b.y + b.h * 0.20);
    g.globalAlpha = 1;
  }

  function drawMagic(t, x, base) {
    const age = clamp01((t - activityStart) / 1450);
    g.save();
    for (const sparkle of sparkles) {
      const radius = L.boyH * sparkle.distance * easeOutCubic(age);
      const sx = x + Math.cos(sparkle.angle) * radius;
      const sy = base - L.boyH * 0.54 + Math.sin(sparkle.angle) * radius;
      g.globalAlpha = Math.sin(age * Math.PI);
      g.fillStyle = sparkle.color;
      g.save();
      g.translate(sx, sy);
      g.rotate(sparkle.angle + age * 2);
      const size = L.unit * sparkle.size;
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        const r = i % 2 ? size * 0.35 : size;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.restore();
    }
    g.restore();
  }

  function drawLandingPuffs(t) {
    for (const puff of landingPuffs) {
      const age = clamp01((t - puff.born) / 520);
      g.save();
      g.globalAlpha = 1 - age;
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI + i / 4 * Math.PI;
        const distance = L.unit * 0.06 * age;
        g.beginPath();
        g.arc(
          puff.x + Math.cos(angle) * distance,
          L.tram.y + L.tram.h * 0.24 + Math.sin(angle) * distance * 0.35,
          L.unit * (0.016 - age * 0.007),
          0,
          Math.PI * 2,
        );
        g.fill();
      }
      g.restore();
    }
  }

  function pickerCards() {
    const width = L.w * CONFIG.picker.cardWidthFrac;
    const gap = L.w * CONFIG.picker.cardGapFrac;
    const height = L.h * CONFIG.picker.cardHeightFrac;
    const total = width * OUTFITS.length + gap * (OUTFITS.length - 1);
    return OUTFITS.map((outfit, index) => ({
      outfit,
      index,
      x: (L.w - total) / 2 + index * (width + gap),
      y: (L.h - height) / 2,
      w: width,
      h: height,
    }));
  }

  function pickerHit(x, y) {
    const pad = L.unit * 0.02;
    const card = pickerCards().find(c => x >= c.x - pad && x <= c.x + c.w + pad
      && y >= c.y - pad && y <= c.y + c.h + pad);
    return card ? card.index : -1;
  }

  function drawPicker(t) {
    if (!picker) return;
    const progress = easeOutCubic(clamp01((t - picker.openedAt) / CONFIG.picker.openMs));
    g.save();
    g.fillStyle = 'rgba(24,20,44,.68)';
    g.fillRect(0, 0, L.w, L.h);
    for (const card of pickerCards()) {
      const selected = card.index === outfitIndex;
      g.save();
      g.translate(card.x + card.w / 2, card.y + card.h / 2);
      g.scale(progress, progress);
      const x = -card.w / 2;
      const y = -card.h / 2;
      g.fillStyle = selected ? '#fff7cf' : '#ffffff';
      roundRect(x, y, card.w, card.h, L.unit * 0.035);
      g.fill();
      g.strokeStyle = selected ? '#ffd54a' : 'rgba(58,51,87,.18)';
      g.lineWidth = selected ? L.unit * 0.012 : L.unit * 0.006;
      g.stroke();
      const img = cards[card.outfit.id];
      drawContained(img, 0, 0, card.w * 0.78, card.h * 0.72);
      if (selected) {
        g.fillStyle = '#ffd54a';
        g.beginPath();
        g.arc(card.w * 0.34, -card.h * 0.36, L.unit * 0.025, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    g.restore();
  }

  function drawPrecipitation() {
    if (weather === 'rainy') {
      g.strokeStyle = CONFIG.colors.rain;
      g.lineWidth = Math.max(1.5, L.unit * 0.004);
      g.globalAlpha = 0.82;
      for (const drop of drops) {
        g.beginPath();
        g.moveTo(drop.x, drop.y);
        g.lineTo(drop.x - L.unit * 0.012, drop.y + L.unit * 0.036);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    if (weather === 'snowy') {
      g.fillStyle = CONFIG.colors.snow;
      for (const flake of flakes) {
        g.beginPath();
        g.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (weather === 'windy') {
      for (const leaf of leaves) {
        g.save();
        g.translate(leaf.x * L.w, leaf.y * L.h);
        g.rotate(leaf.angle);
        g.fillStyle = leaf.color;
        g.beginPath();
        g.ellipse(0, 0, L.unit * 0.012, L.unit * 0.006, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    }
  }

  function drawTouchFeedback(t) {
    for (const pulse of touchPulses) {
      const age = clamp01((t - pulse.born) / 480);
      g.strokeStyle = `rgba(255,255,255,${0.72 * (1 - age)})`;
      g.lineWidth = Math.max(2, L.unit * 0.008 * (1 - age * 0.5));
      g.beginPath();
      g.arc(pulse.x, pulse.y, L.unit * (0.018 + age * 0.05), 0, Math.PI * 2);
      g.stroke();
    }
  }

  function roundRect(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function drawRotatePrompt(t) {
    const c = CONFIG.colors;
    const cx = L.w / 2;
    const cy = L.h / 2;
    g.fillStyle = night ? c.skyNightTop : c.skyDayTop;
    g.fillRect(0, 0, L.w, L.h);
    g.save();
    g.translate(cx, cy - L.unit * 0.04);
    g.rotate(Math.sin(t / 650) * 0.18);
    g.strokeStyle = '#ffffff';
    g.lineWidth = Math.max(6, L.unit * 0.025);
    roundRect(-L.unit * 0.17, -L.unit * 0.28, L.unit * 0.34, L.unit * 0.56, L.unit * 0.045);
    g.stroke();
    g.restore();
    g.fillStyle = '#ffffff';
    g.font = `700 ${Math.max(20, L.unit * 0.07)}px system-ui`;
    g.textAlign = 'center';
    g.fillText('↻', cx, cy + L.unit * 0.34);
  }

  function draw(t) {
    if (L.portrait) {
      drawRotatePrompt(t);
      return;
    }

    drawSky(t);
    g.save();
    g.translate(-cameraX * L.w, 0);
    drawGround();
    drawHouse();
    drawBed();
    drawWardrobe(t);
    drawBush();
    drawToyBin();
    drawTrampoline(t);
    drawLandingPuffs(t);
    drawLooseToys(t);
    drawCotBack(t);
    drawBaby(t);
    drawCotFront(t);
    drawBoy(t);
    drawBlanketIfDragged(t);
    g.restore();

    drawPrecipitation();
    drawTouchFeedback(t);
    drawPicker(t);
  }

  function frame(t) {
    if (!alive) return;
    const dt = Math.min(0.05, Math.max(0, (t - lastFrame) / 1000));
    lastFrame = t;
    update(dt, t);
    g.clearRect(0, 0, L.w, L.h);
    draw(t);
    raf = requestAnimationFrame(frame);
  }

  function tryLockLandscape() {
    try {
      const result = screen.orientation?.lock?.('landscape');
      if (result?.catch) result.catch(() => {});
    } catch (e) {
      // Safari exposes the API inconsistently; the rotate gate is the fallback.
    }
  }

  function unlockOrientation() {
    try {
      screen.orientation?.unlock?.();
    } catch (e) {
      // Nothing to undo on browsers without the orientation API.
    }
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  tryLockLandscape();

  Promise.all([
    loadOutfit(0),
    preloadImages(BABY_ART, 0),
    preloadImages(WORLD_ART, 0),
    preloadImages(TOY_FILES, 0),
    preloadImages(Object.fromEntries(OUTFITS.map(o => [o.id, o.card])), 0),
  ]).then(([outfit, loadedBaby, loadedWorld, loadedToys, loadedCards]) => {
    if (!alive) return;
    images = outfit || {};
    babyArt = loadedBaby || {};
    worldArt = loadedWorld || {};
    toyArt = loadedToys || {};
    cards = loadedCards || {};
    loadOutfit(1);
  });

  resize();
  seedScenery();
  raf = requestAnimationFrame(frame);
  setReprompt(null);

  return () => {
    alive = false;
    drag = null;
    picker = null;
    cancelAnimationFrame(raf);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', endPointer);
    canvas.removeEventListener('pointercancel', endPointer);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    audio.stopWeatherBed();
    unlockOrientation();
  };
}

export default {
  id: 'playhouse',
  title: 'Play House',
  icon: ICON,
  start,
};
