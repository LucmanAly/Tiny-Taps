// Play House: an open-ended little world rather than a round-based game.
// The child controls the weather and the time of day, and sends the mascot to
// the bed, the wardrobe or the trampoline. Nothing can be answered wrongly.
//
// The world itself is entirely procedural: the house, furniture, trampoline,
// sky, sun, moon, rain, wind and grass are all drawn on canvas, so the only
// artwork this game costs is the mascot himself.
//
// The mascot now has three outfits (winter / rain / summer), each with its own
// stand, walk, jump and sleep poses. Tapping the wardrobe cycles them. Poses
// are loaded per outfit rather than all at once, and the next outfit is
// prefetched quietly in the background so a change never shows a gap.

import { preloadImages } from '../engine/intro.js';

/* ---------------- configuration ---------------- */

const CONFIG = {
  // Everything is a fraction: of canvas width (x), canvas height (y), or of
  // `unit` (= the smaller edge) for anything whose size should feel the same
  // in portrait and landscape.
  layout: {
    // This world is landscape-only (see the rotate gate below): a phone held
    // upright cannot fit a house, a wardrobe and a playground side by side
    // without everything becoming cramped. The portrait numbers remain only
    // as a safety net for the brief moment during an orientation change.
    horizonYPortrait: 0.56,
    horizonYLandscape: 0.50,
    groundLineYPortrait: 0.86,   // feet, house floor and trampoline base
    groundLineYLandscape: 0.88,
    houseLeftPortrait: 0.03,
    houseRightPortrait: 0.52,
    houseLeftLandscape: 0.035,
    houseRightLandscape: 0.44,
    houseHeightFrac: 0.52,       // of unit (portrait)
    houseHeightFracLandscape: 0.62,
    roofPeakFrac: 0.15,          // of unit, above the wall top
    trampolineXPortrait: 0.855,
    trampolineXLandscape: 0.80,
    trampolineWidthFrac: 0.23,   // of unit (portrait)
    trampolineWidthFracLandscape: 0.31,
    sunXPortrait: 0.82, sunYPortrait: 0.13,
    sunXLandscape: 0.84, sunYLandscape: 0.23,
    sunRadiusFrac: 0.075,        // of unit
  },

  mascot: {
    heightFrac: 0.34,            // of unit (portrait)
    heightFracLandscape: 0.40,
    minHeight: 104,
    maxHeight: 240,
    walkSpeedFrac: 0.55,         // of canvas width per second
    bobFrac: 0.03,               // of mascot height
    bobHz: 3.2,
    tiltDegrees: 2.4,
    windLeanDegrees: 5,
  },

  // Where the mascot stands for each station, as a fraction of canvas width.
  // Where the mascot stands for each station, as a fraction of canvas width.
  // `home` doubles as the playpen station: the old 0.60 sat exactly where the
  // playpen now goes, and standing beside his brother is a nicer neutral spot
  // than a cramped gap between the pen and the trampoline.
  stations: {
    bedPortrait: 0.17, wardrobePortrait: 0.44, trampolinePortrait: 0.855,
    playpenPortrait: 0.60, homePortrait: 0.60,
    bedLandscape: 0.15, wardrobeLandscape: 0.36, trampolineLandscape: 0.80,
    playpenLandscape: 0.47, homeLandscape: 0.47,
  },

  // The playpen sits on the one genuinely empty patch of grass, between the
  // house wall (ends ~0.45) and the trampoline (starts ~0.73).
  playpen: {
    xPortrait: 0.62, xLandscape: 0.625,
    widthFracPortrait: 0.20, widthFracLandscape: 0.145,   // of canvas width
    heightFrac: 0.17,                                      // of unit
  },

  baby: {
    heightFrac: 0.58,          // of the boy's drawn height
    bobHz: 0.6,
    happyMs: 1600,
    // Idle wandering: sits still for a while, crawls a little, sits again.
    sitMinMs: 6000, sitMaxMs: 10000,
    crawlMs: 2200,
    crawlRangeFrac: 0.26,      // of playpen width, either side of centre
  },

  jump: { count: 3, heightFrac: 0.55, durationMs: 620 },
  sleep: { fadeMs: 420, zzzMs: 2200, widthFrac: 0.74, headFrac: 0.10, sinkFrac: 0.17 },
  wardrobeOpenMs: 1500,
  outfitOpenAtFrac: 0.5,          // through the door-opening animation
  picker: {
    openMs: 260,                  // cards scale up as the panel appears
    cardWidthFrac: 0.26,          // of canvas width, per card
    cardGapFrac: 0.03,
    cardHeightFrac: 0.80,         // of canvas height
    scrimAlpha: 0.55,
  },
  waveMs: 1400,
  magicMs: 1500,

  weather: {
    order: ['sunny', 'rainy', 'windy', 'snowy'],
    rainDrops: 90,
    rainSpeedFrac: 1.5,          // of canvas height per second
    leafCount: 14,
    windSpeedFrac: 0.55,         // of canvas width per second
    cloudCountSunny: 2,
    cloudCountElse: 5,
    snowFlakes: 110,
    snowSpeedFrac: 0.16,         // of canvas height per second: much slower than rain
    snowDriftFrac: 0.05,         // sideways wander, of canvas width per second
    // Settling and thawing are deliberately unequal: snow arrives gradually
    // and goes away a little faster, so cycling the weather never feels stuck.
    snowSettleMs: 4000,
    snowThawMs: 2500,
    snowCapFrac: 0.022,          // depth of a full covering, of unit
  },

  colors: {
    skyDayTop: '#8ed6ff', skyDayBottom: '#eafaff',
    skyNightTop: '#2b3570', skyNightBottom: '#5a6bab',
    skyRainTop: '#9fb4c4', skyRainBottom: '#d6e2e8',
    skySnowTop: '#b9c6d4', skySnowBottom: '#eef3f7',
    snow: '#ffffff', snowShade: '#dfe9f2',
    grassDay: '#7ed67e', grassNight: '#3f6b52',
    sun: '#ffd54a', sunGlow: '#fff3b0',
    moon: '#fdf6d8',
    star: '#ffffff',
    cloudDay: '#ffffff', cloudNight: '#8f9ccb',
    rain: '#a9dcf5',
    leaf: ['#7ed67e', '#ffcf6f', '#ff9fce'],
    wallDay: '#ffe6c4', wallNight: '#c9a983',
    roof: '#e0685a', roofDark: '#c04a3e',
    floor: '#c99a6a',
    interiorDay: '#fff6e8', interiorNight: '#ffdda0',
    bedFrame: '#8a5a3c', bedSheet: '#ffffff', blanket: '#7fb3ff', pillow: '#fffaf0',
    wardrobe: '#a3714a', wardrobeDark: '#7d5334', wardrobeDoor: '#b98352',
    tramFrame: '#8a8098', tramMat: '#5aa8e0', tramSpring: '#c9c3d6',
    penRail: '#e08a5a', penRailDark: '#bd6a3e', penBar: '#f6c177', penMat: '#8fd9c4',
    ink: '#3a3357',
  },
};

const WEATHER_WORD = { sunny: 'Sunny!', rainy: 'Rain!', windy: 'Windy!', snowy: 'Snow!' };

const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ph-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8ed6ff"/><stop offset="100%" stop-color="#eafaff"/>
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="88" height="88" rx="18" fill="url(#ph-sky)"/>
  <circle cx="74" cy="26" r="10" fill="#ffd54a"/>
  <rect x="6" y="70" width="88" height="24" fill="#7ed67e"/>
  <path d="M16 70 V44 L38 28 L60 44 V70 Z" fill="#ffe6c4" stroke="#c04a3e" stroke-width="0"/>
  <path d="M12 46 L38 24 L64 46 L58 46 L38 31 L18 46 Z" fill="#e0685a"/>
  <rect x="24" y="54" width="12" height="16" rx="2" fill="#7fb3ff"/>
  <rect x="42" y="52" width="12" height="18" rx="2" fill="#a3714a"/>
</svg>`;

/* ---------------- outfits ----------------
   One entry per outfit, each with the poses this world can show. The winter
   set reuses the three poses the opening sequence already loads, so the first
   outfit is normally warm in the browser cache before this game even opens.
   Rain and summer have no dedicated wave pose; `poseFor` falls back to their
   stand pose, which is already an arms-out greeting. */

const OUTFITS = [
  {
    id: 'winter', label: 'Winter coat',
    card: 'assets/mascot_outfit_winter.PNG', tint: '#a9713f',
    poses: {
      stand: 'assets/mascot_idle.PNG',
      walk: 'assets/mascot_walking.PNG',
      wave: 'assets/mascot_waving.PNG',
      magic: 'assets/mascot_magic.PNG',
      jump: 'assets/mascot_winter_jump.PNG',
      sleep: 'assets/mascot_winter_sleep.PNG',
    },
  },
  {
    id: 'rain', label: 'Rain coat',
    card: 'assets/mascot_outfit_rain.PNG', tint: '#f2c318',
    poses: {
      stand: 'assets/mascot_rain_stand.PNG',
      walk: 'assets/mascot_rain_walk.PNG',
      jump: 'assets/mascot_rain_jump.PNG',
      sleep: 'assets/mascot_rain_sleep.PNG',
    },
  },
  {
    id: 'summer', label: 'T-shirt',
    card: 'assets/mascot_outfit_summer.PNG', tint: '#d8c6a4',
    poses: {
      stand: 'assets/mascot_summer_stand.PNG',
      walk: 'assets/mascot_summer_walk.PNG',
      jump: 'assets/mascot_summer_jump.PNG',
      sleep: 'assets/mascot_summer_sleep.PNG',
    },
  },
];

/* ---------------- the baby ----------------
   One look only, unlike her brother: four poses, no outfits. Sliced from a
   single sprite sheet at import, uniformly scaled and cropped tight to the
   artwork, so at runtime they are ordinary images that need no measuring. */

const BABY_POSES = {
  sit: 'assets/baby_sit.PNG',
  happy: 'assets/baby_happy.PNG',
  crawl: 'assets/baby_crawl.PNG',
  sleep: 'assets/baby_sleep.PNG',
};

function start(ctx) {
  const { stage, audio, speech, setReprompt } = ctx;
  let alive = true;
  let raf = 0;

  // Loaded pose sets, keyed by outfit id. Only outfits actually worn get
  // fetched, and a set that is still in flight simply isn't in here yet.
  const wardrobeCache = new Map();
  let outfitIndex = 0;
  // Only ever reassigned to a set that has finished loading, so a slow switch
  // keeps showing the previous outfit instead of blanking the mascot.
  let images = {};

  const canvas = document.createElement('canvas');
  canvas.className = 'playhouse-canvas';
  stage.appendChild(canvas);
  const g = canvas.getContext('2d');

  /* ---- world state ---- */
  let night = false;
  let weather = 'sunny';
  let mascotX = 0.66;            // fraction of width; seeded properly in layout()
  let targetX = 0.66;
  let placed = false;             // has his opening position been set yet
  let facing = 1;                 // 1 = right, -1 = left
  let activity = 'idle';          // idle | walking | sleeping | jumping | waving | magic
  let pending = null;             // what to do once the walk finishes
  let activityStart = 0;
  let walkPhase = 0;              // drives the bob, only advances while moving
  let openPickerAt = 0;           // when the wardrobe finishes opening (0 = none)
  let baby = {};                  // pose id -> image, empty until loaded
  let babyPose = 'sit';           // sit | crawl | happy  (sleep is derived from night)
  let babyUntil = 0;              // when the current baby pose gives way
  let babyX = 0.5;                // position across the pen, 0..1
  let babyTargetX = 0.5;
  let babyFacing = 1;
  let picker = null;              // { openedAt } while the child is choosing
  let cards = {};                 // outfit id -> garment image (or missing)
  let stepAt = 0;                 // next footstep sound

  let drops = [];
  let flakes = [];
  let snowDepth = 0;              // 0 = bare, 1 = fully covered
  let leaves = [];
  let clouds = [];
  let stars = [];
  let zzz = [];
  let sparkles = [];

  const now = () => performance.now();

  /* ---- sizing ---- */
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let L = null;

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
    const cfg = CONFIG.layout;
    const unit = Math.min(w, h);
    const portrait = h >= w;
    const groundY = h * (portrait ? cfg.groundLineYPortrait : cfg.groundLineYLandscape);
    const houseLeft = w * (portrait ? cfg.houseLeftPortrait : cfg.houseLeftLandscape);
    const houseRight = w * (portrait ? cfg.houseRightPortrait : cfg.houseRightLandscape);
    const houseH = unit * (portrait ? cfg.houseHeightFrac : cfg.houseHeightFracLandscape);
    const wallTop = groundY - houseH;
    const roofPeak = wallTop - unit * cfg.roofPeakFrac;

    const mascotH = Math.max(CONFIG.mascot.minHeight,
      Math.min(CONFIG.mascot.maxHeight,
        unit * (portrait ? CONFIG.mascot.heightFrac : CONFIG.mascot.heightFracLandscape)));
    // Hit-testing wants the boy's own width, not the pose file's, for the same
    // reason drawMascot normalises: the margins around him vary by pose.
    const ref = poseFor('stand');
    let aspect = 0.52;
    if (ref && ref.naturalWidth) {
      const bb = boundsOf(ref);
      aspect = (ref.naturalWidth * (bb.x1 - bb.x0)) / (ref.naturalHeight * (bb.y1 - bb.y0));
    }

    const tramW = unit * (portrait ? cfg.trampolineWidthFrac : cfg.trampolineWidthFracLandscape);
    const tramX = w * (portrait ? cfg.trampolineXPortrait : cfg.trampolineXLandscape);

    L = {
      w, h, unit, portrait,
      horizonY: h * (portrait ? cfg.horizonYPortrait : cfg.horizonYLandscape),
      groundY,
      houseLeft, houseRight, wallTop, roofPeak,
      houseMidX: (houseLeft + houseRight) / 2,
      mascotH, mascotW: mascotH * aspect,
      tramX, tramW, tramH: tramW * 0.62,
      sunX: w * (portrait ? cfg.sunXPortrait : cfg.sunXLandscape),
      sunY: h * (portrait ? cfg.sunYPortrait : cfg.sunYLandscape),
      sunR: unit * cfg.sunRadiusFrac,
      station: {
        bed: portrait ? CONFIG.stations.bedPortrait : CONFIG.stations.bedLandscape,
        wardrobe: portrait ? CONFIG.stations.wardrobePortrait : CONFIG.stations.wardrobeLandscape,
        trampoline: portrait ? CONFIG.stations.trampolinePortrait : CONFIG.stations.trampolineLandscape,
        playpen: portrait ? CONFIG.stations.playpenPortrait : CONFIG.stations.playpenLandscape,
        home: portrait ? CONFIG.stations.homePortrait : CONFIG.stations.homeLandscape,
      },
    };

    // Interior furniture boxes, used for drawing and for hit-testing.
    const inW = houseRight - houseLeft;
    L.bed = {
      x: houseLeft + inW * 0.06, y: groundY - houseH * 0.42,
      w: inW * 0.42, h: houseH * 0.42,
    };
    // Shorter than the wall and standing on legs, so it reads as furniture
    // rather than a front door set into the house.
    L.wardrobe = {
      x: houseLeft + inW * 0.58, y: groundY - houseH * 0.62,
      w: inW * 0.34, h: houseH * 0.62,
    };
    L.tram = { x: tramX - L.tramW / 2, y: groundY - L.tramH, w: L.tramW, h: L.tramH };

    const penW = w * (portrait ? CONFIG.playpen.widthFracPortrait : CONFIG.playpen.widthFracLandscape);
    const penH = unit * CONFIG.playpen.heightFrac;
    const penCx = w * (portrait ? CONFIG.playpen.xPortrait : CONFIG.playpen.xLandscape);
    L.pen = { x: penCx - penW / 2, y: groundY - penH, w: penW, h: penH };
    L.babyH = mascotH * CONFIG.baby.heightFrac;

    // Open beside the playpen rather than at a hard-coded fraction, which
    // otherwise leaves him standing inside it.
    if (!placed) {
      mascotX = targetX = L.station.home;
      placed = true;
    }

    // Roof geometry, shared by the drawing and by roofYAt().
    L.wallT = Math.max(5, unit * 0.022);
    const overhang = L.wallT * 3.2;
    L.eaveLeft = houseLeft - overhang;
    L.eaveRight = houseRight + overhang;
    L.eaveY = wallTop + unit * 0.018;      // eaves hang a little below the wall top
    L.chimney = {
      x: houseLeft + inW * 0.70,
      w: inW * 0.10,
      // Stands proud of the ridge, but never so high that it — or its smoke —
      // runs off the top of a short landscape canvas.
      top: Math.max(unit * 0.14, roofPeak - unit * 0.075),
    };
  }

  /* ---- scenery seeding ---- */
  function seedScenery() {
    const count = weather === 'sunny' ? CONFIG.weather.cloudCountSunny : CONFIG.weather.cloudCountElse;
    clouds = Array.from({ length: count }, () => ({
      x: Math.random(), y: 0.06 + Math.random() * 0.3,
      s: 0.6 + Math.random() * 0.8, v: 0.008 + Math.random() * 0.02,
    }));
    stars = Array.from({ length: 34 }, () => ({
      x: Math.random(), y: Math.random() * 0.44,
      r: 0.6 + Math.random() * 1.6, tw: Math.random() * Math.PI * 2,
    }));
    drops = [];
    leaves = [];
    flakes = [];
  }

  /* ---- roof line, so rain lands on the house instead of inside it ----
     Measured to the eaves, not the walls. The roof overhangs, and weather
     falling through the overhang would undo the one piece of cause and effect
     this world has. Both this and drawRoof() read L.eaveLeft/L.eaveRight. */
  function roofYAt(x) {
    if (x < L.eaveLeft || x > L.eaveRight) return Infinity;
    const half = (L.eaveRight - L.eaveLeft) / 2;
    const d = Math.abs(x - L.houseMidX) / half;      // 0 at the peak, 1 at the eaves
    return lerp(L.roofPeak, L.eaveY, clamp01(d));
  }

  /* ---- interactions ---- */
  function say(word) { speech.speak(word, { interrupt: true }); }

  function walkTo(frac, then) {
    openPickerAt = 0;            // any pending wardrobe opening is abandoned
    targetX = frac;
    pending = then || null;
    if (Math.abs(targetX - mascotX) < 0.01) { finishWalk(); return; }
    facing = targetX > mascotX ? 1 : -1;
    activity = 'walking';
  }

  function finishWalk() {
    const next = pending;
    pending = null;
    activity = 'idle';
    if (!next) return;
    activity = next;
    activityStart = now();
    if (next === 'sleeping') zzz = [];
    if (next === 'jumping') audio.boing();
    if (next === 'wardrobe') {
      audio.pop();
      // Change once the doors have swung most of the way open, so the new
      // outfit appears to come out of the wardrobe rather than through it.
      openPickerAt = activityStart + CONFIG.wardrobeOpenMs * CONFIG.outfitOpenAtFrac;
    }
  }

  /* ---- outfits ---- */

  // Normalised bounding box of the non-transparent pixels in a pose, cached on
  // the image itself. The poses are framed inconsistently — some fill the file,
  // some leave a wide margin — and scaling by the file would make him change
  // size and hover off the ground as he changed pose. Measured on a small
  // downsample, which is plenty for a placement fraction and costs about a
  // millisecond once per image.
  const BOUNDS = new WeakMap();
  const FULL_BOUNDS = { x0: 0, x1: 1, y0: 0, y1: 1 };

  function boundsOf(img) {
    const cached = BOUNDS.get(img);
    if (cached) return cached;
    let box = FULL_BOUNDS;
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
      // A fully transparent (or unreadable) image falls back to the whole frame
      // rather than producing a zero-height box and a division by zero.
      if (x1 >= x0 && y1 >= y0) {
        box = { x0: x0 / cw, x1: (x1 + 1) / cw, y0: y0 / ch, y1: (y1 + 1) / ch };
      }
    } catch (e) {
      // Never let a measurement problem stop the world from drawing.
    }
    BOUNDS.set(img, box);
    return box;
  }

  // Loads an outfit's poses at most once. Never rejects: a pose that fails to
  // load is simply absent, and `poseFor` falls back to something that isn't.
  function loadOutfit(index) {
    const outfit = OUTFITS[index];
    if (!wardrobeCache.has(outfit.id)) {
      // No budget here: unlike the opening sequence there is no deadline to
      // race, and a partially loaded outfit would look like a costume change
      // that half happened.
      wardrobeCache.set(outfit.id, preloadImages(outfit.poses, 0));
    }
    return wardrobeCache.get(outfit.id);
  }

  // Warm the outfit after this one so the first wardrobe tap is instant. Kept
  // strictly sequential so it can never compete with the outfit on screen.
  function prefetchNextOutfit() {
    const next = (outfitIndex + 1) % OUTFITS.length;
    if (!alive || wardrobeCache.has(OUTFITS[next].id)) return;
    loadOutfit(next);
  }

  function wearOutfit(index) {
    outfitIndex = index;
    const outfit = OUTFITS[index];
    loadOutfit(index).then(loaded => {
      // Ignore a set that finished after the child moved on to another outfit.
      if (!alive || OUTFITS[outfitIndex].id !== outfit.id) return;
      images = loaded || {};
      if (L) layout(canvas.clientWidth, canvas.clientHeight);   // aspect may differ
      prefetchNextOutfit();
    });
  }

  // Card rectangles, recomputed each time rather than cached, so a rotation
  // mid-choice can never leave the hit boxes pointing at the old layout.
  function pickerCards() {
    const cfg = CONFIG.picker;
    const cw = L.w * cfg.cardWidthFrac;
    const gap = L.w * cfg.cardGapFrac;
    const chh = L.h * cfg.cardHeightFrac;
    const total = cw * OUTFITS.length + gap * (OUTFITS.length - 1);
    const x0 = (L.w - total) / 2;
    const y = (L.h - chh) / 2;
    return OUTFITS.map((o, i) => ({
      outfit: o, index: i,
      x: x0 + i * (cw + gap), y, w: cw, h: chh,
    }));
  }

  function pickerHit(px, py) {
    const pad = L.unit * 0.02;
    for (const card of pickerCards()) {
      if (px >= card.x - pad && px <= card.x + card.w + pad
          && py >= card.y - pad && py <= card.y + card.h + pad) return card.index;
    }
    return -1;
  }

  function openPicker() {
    picker = { openedAt: now() };
    audio.chime();
  }

  function closePicker() {
    picker = null;
  }

  function choose(index) {
    closePicker();
    if (index === outfitIndex) { audio.pop(); return; }   // already wearing it
    wearOutfit(index);
    audio.pop();
    say(OUTFITS[index].label);
  }

  // Resolves an upright pose to whatever art is actually available, so a
  // missing or still-loading file degrades to a sensible neighbour rather than
  // nothing. Deliberately excludes `sleep`, which is drawn lying down and would
  // look broken standing on the grass.
  function poseFor(kind) {
    return images[kind] || images.stand || images.walk || images.jump || null;
  }

  // Rain and wind get a quiet looping bed; sunny and snow are deliberately
  // silent, snow because falling snow makes no sound.
  const WEATHER_BED = { rainy: 'rain', windy: 'wind' };

  function applyWeatherBed() {
    audio.setWeatherBed(WEATHER_BED[weather] || null);
  }

  /* ---- the baby ---- */

  function babyImage() {
    if (night && babyPose !== 'happy') return baby.sleep || baby.sit || null;
    return baby[babyPose] || baby.sit || null;
  }

  // Delighted to be noticed. Also wakes her at night, which is the one bit of
  // mischief the game allows.
  function delightBaby() {
    babyPose = 'happy';
    babyUntil = now() + CONFIG.baby.happyMs;
    audio.babble();
  }

  function updateBaby(dt, t) {
    if (night && babyPose !== 'happy') return;      // asleep: no wandering
    if (t < babyUntil) {
      if (babyPose === 'crawl') {
        const speed = dt * 0.32;
        const dx = babyTargetX - babyX;
        if (Math.abs(dx) > speed) {
          babyX += Math.sign(dx) * speed;
          babyFacing = dx > 0 ? 1 : -1;
        }
      }
      return;
    }
    // Alternate between sitting still and a short crawl to somewhere else in
    // the pen, so she is never quite a static prop.
    const cfg = CONFIG.baby;
    if (babyPose === 'crawl') {
      babyPose = 'sit';
      babyUntil = t + cfg.sitMinMs + Math.random() * (cfg.sitMaxMs - cfg.sitMinMs);
    } else {
      babyPose = 'crawl';
      babyUntil = t + cfg.crawlMs;
      babyTargetX = 0.5 + (Math.random() * 2 - 1) * cfg.crawlRangeFrac;
    }
  }

  function cycleWeather() {
    const order = CONFIG.weather.order;
    weather = order[(order.indexOf(weather) + 1) % order.length];
    seedScenery();
    audio.pop();
    applyWeatherBed();
    say(WEATHER_WORD[weather] || '');
  }

  function toggleNight() {
    night = !night;
    audio.chime();
    say(night ? 'Night time!' : 'Morning!');
  }

  function hit(px, py) {
    // Furniture is tested before the mascot, and deliberately so: he stands in
    // front of whatever he has walked to, and checking him first meant that
    // tapping the wardrobe he was standing at only ever got you a wave. The
    // fixed thing you aimed at should be the thing that answers; he stays
    // tappable everywhere he is not covering a station.
    // Every box is generously padded, because these are small pieces of
    // furniture on a phone and a toddler aiming near one clearly means it.
    const pad = L.unit * 0.05;
    const inBox = (b) => px >= b.x - pad && px <= b.x + b.w + pad
                      && py >= b.y - pad && py <= b.y + b.h + pad;
    if (Math.hypot(px - L.sunX, py - L.sunY) <= L.sunR * 1.8) return 'sun';
    if (inBox(L.bed)) return 'bed';
    if (inBox(L.wardrobe)) return 'wardrobe';
    // The trampoline is short, so it also claims the space above its mat —
    // that is where a child aiming at "the bouncy thing" will actually tap.
    if (px >= L.tram.x - pad && px <= L.tram.x + L.tram.w + pad
        && py >= L.tram.y - L.mascotH * 0.7 && py <= L.tram.y + L.tram.h + pad) {
      return 'trampoline';
    }
    if (px >= L.pen.x - pad && px <= L.pen.x + L.pen.w + pad
        && py >= L.pen.y - L.babyH * 0.8 && py <= L.pen.y + L.pen.h + pad) {
      return 'playpen';
    }
    if (inBox(mascotBox())) return 'mascot';
    if (py < L.horizonY) return 'sky';
    return 'ground';
  }

  function onPointerDown(e) {
    if (!alive || !L) return;
    if (L.portrait) return;        // the rotate screen is not interactive
    // Any tap is a user gesture, which is the only thing that can start audio.
    // Re-asserting the bed here covers a weather change made while the context
    // was still suspended, which would otherwise stay silent forever.
    if (audio.tryResume()) applyWeatherBed();

    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;

    // While the wardrobe is open it takes every tap: a card is a choice,
    // anywhere else closes without changing anything. Nothing in the world
    // behind it can be triggered by accident.
    if (picker) {
      const i = pickerHit(px, py);
      if (i >= 0) choose(i);
      else closePicker();
      return;
    }

    // Asleep, every tap simply wakes him. A child who wants him up should not
    // have to find him under the covers to do it.
    if (activity === 'sleeping') {
      activity = 'idle';
      audio.pop();
      return;
    }

    switch (hit(px, py)) {
      case 'sun': toggleNight(); break;
      case 'sky': cycleWeather(); break;
      case 'bed': walkTo(L.station.bed, 'sleeping'); break;
      case 'wardrobe': walkTo(L.station.wardrobe, 'wardrobe'); break;
      case 'trampoline': walkTo(L.station.trampoline, 'jumping'); break;
      case 'playpen':
        // The baby reacts straight away; her brother comes over to join in.
        delightBaby();
        walkTo(L.station.playpen, 'waving');
        break;
      case 'mascot':
        // The winter set includes the wand pose used by the opening sequence.
        // Other outfits keep their own stand pose, but get the same forgiving
        // burst of magic rather than unexpectedly changing clothes.
        activity = 'magic';
        activityStart = now();
        sparkles = Array.from({ length: 22 }, (_, i) => ({
          angle: (i / 22) * Math.PI * 2 + Math.random() * 0.25,
          distance: 0.25 + Math.random() * 0.55,
          size: 0.012 + Math.random() * 0.018,
          color: CONFIG.colors.leaf[i % CONFIG.colors.leaf.length],
        }));
        audio.chime();
        break;
      default:
        walkTo(L.station.home);       // tapping open ground brings him outside
    }
  }
  canvas.addEventListener('pointerdown', onPointerDown);

  /* ---- update ---- */
  function update(dt, t) {
    // Walking
    if (activity === 'walking') {
      const speed = CONFIG.mascot.walkSpeedFrac * dt;
      const dx = targetX - mascotX;
      if (Math.abs(dx) <= speed) { mascotX = targetX; finishWalk(); }
      else {
        mascotX += Math.sign(dx) * speed;
        walkPhase += dt * CONFIG.mascot.bobHz;
        if (t > stepAt) { audio.footstep(); stepAt = t + 300; }
      }
    }

    updateBaby(dt, t);

    // Timed activities return to idle on their own.
    if (activity === 'waving' && t - activityStart > CONFIG.waveMs) activity = 'idle';
    if (activity === 'magic' && t - activityStart > CONFIG.magicMs) {
      activity = 'idle';
      sparkles = [];
    }
    if (activity === 'wardrobe') {
      if (openPickerAt && t >= openPickerAt) { openPickerAt = 0; openPicker(); }
      if (t - activityStart > CONFIG.wardrobeOpenMs) activity = 'idle';
    }
    if (activity === 'jumping' && t - activityStart > CONFIG.jump.count * CONFIG.jump.durationMs) {
      activity = 'idle';
    }

    // Clouds drift; wind pushes them along.
    const drift = weather === 'windy' ? 3.2 : 1;
    for (const c of clouds) {
      c.x += c.v * dt * drift;
      if (c.x > 1.25) c.x = -0.25;
    }

    // Rain
    if (weather === 'rainy') {
      while (drops.length < CONFIG.weather.rainDrops) {
        drops.push({ x: Math.random() * L.w, y: Math.random() * -L.h, v: 0.8 + Math.random() * 0.5 });
      }
      const fall = CONFIG.weather.rainSpeedFrac * L.h * dt;
      for (const d of drops) {
        d.y += fall * d.v;
        // Rain stops at the roof: that is the whole point of the house.
        const roof = roofYAt(d.x);
        if (d.y >= Math.min(roof, L.groundY)) {
          d.y = Math.random() * -L.h * 0.4;
          d.x = Math.random() * L.w;
        }
      }
    } else if (drops.length) {
      drops = [];
    }

    // Snow: falls slowly, wanders sideways, and settles on what it lands on.
    if (weather === 'snowy') {
      while (flakes.length < CONFIG.weather.snowFlakes) {
        flakes.push({
          x: Math.random() * L.w, y: Math.random() * -L.h,
          v: 0.6 + Math.random() * 0.8,
          r: L.unit * (0.004 + Math.random() * 0.007),
          wob: Math.random() * Math.PI * 2,
        });
      }
      const fall = CONFIG.weather.snowSpeedFrac * L.h * dt;
      for (const f of flakes) {
        f.y += fall * f.v;
        f.wob += dt * 1.4;
        f.x += Math.sin(f.wob) * CONFIG.weather.snowDriftFrac * L.w * dt;
        // Like rain, snow stops at the roof rather than falling through it.
        const roof = roofYAt(f.x);
        if (f.y >= Math.min(roof, L.groundY)) {
          f.y = Math.random() * -L.h * 0.3;
          f.x = Math.random() * L.w;
        }
      }
      snowDepth = Math.min(1, snowDepth + dt * 1000 / CONFIG.weather.snowSettleMs);
    } else {
      if (flakes.length) flakes = [];
      snowDepth = Math.max(0, snowDepth - dt * 1000 / CONFIG.weather.snowThawMs);
    }

    // Wind-blown leaves
    if (weather === 'windy') {
      while (leaves.length < CONFIG.weather.leafCount) {
        leaves.push({
          // Kept mostly above the horizon so they blow across the sky rather
          // than appearing to swirl around inside the house.
          x: Math.random() * -0.3, y: 0.12 + Math.random() * 0.42,
          r: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 6,
          c: CONFIG.colors.leaf[(Math.random() * CONFIG.colors.leaf.length) | 0],
          s: 0.6 + Math.random() * 0.8, wob: Math.random() * Math.PI * 2,
        });
      }
      for (const lf of leaves) {
        lf.x += CONFIG.weather.windSpeedFrac * dt * lf.s;
        lf.wob += dt * 3;
        lf.r += lf.spin * dt;
        if (lf.x > 1.2) { lf.x = -0.2; lf.y = 0.12 + Math.random() * 0.42; }
      }
    } else if (leaves.length) {
      leaves = [];
    }

    // Zzz while sleeping
    if (activity === 'sleeping') {
      if (!zzz.length || t - zzz[zzz.length - 1].born > 700) {
        zzz.push({ born: t });
      }
      zzz = zzz.filter(z => t - z.born < CONFIG.sleep.zzzMs);
    } else if (zzz.length) {
      zzz = [];
    }
  }

  /* ---- drawing ---- */

  function skyColors() {
    if (night) return [CONFIG.colors.skyNightTop, CONFIG.colors.skyNightBottom];
    if (weather === 'rainy') return [CONFIG.colors.skyRainTop, CONFIG.colors.skyRainBottom];
    if (weather === 'snowy') return [CONFIG.colors.skySnowTop, CONFIG.colors.skySnowBottom];
    return [CONFIG.colors.skyDayTop, CONFIG.colors.skyDayBottom];
  }

  function drawSky(t) {
    const [top, bottom] = skyColors();
    const grad = g.createLinearGradient(0, 0, 0, L.horizonY);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, L.w, L.horizonY + 1);

    if (night) {
      for (const s of stars) {
        const a = 0.45 + 0.55 * Math.abs(Math.sin(t / 900 + s.tw));
        g.globalAlpha = a;
        g.fillStyle = CONFIG.colors.star;
        g.beginPath();
        g.arc(s.x * L.w, s.y * L.horizonY, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    drawSunOrMoon(t);
    for (const c of clouds) drawCloud(c);
  }

  // Cached because the cut only changes when the radius does.
  let moonCache = null;
  function moonSprite(r) {
    const size = Math.ceil(r * 2.2);
    if (moonCache && moonCache.r === r) return moonCache.canvas;
    const c = document.createElement('canvas');
    c.width = c.height = Math.max(1, Math.ceil(size * dpr));
    const mg = c.getContext('2d');
    mg.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = size / 2, cy = size / 2;
    mg.fillStyle = CONFIG.colors.moon;
    mg.beginPath();
    mg.arc(cx, cy, r, 0, Math.PI * 2);
    mg.fill();
    mg.globalCompositeOperation = 'destination-out';
    mg.beginPath();
    mg.arc(cx + r * 0.42, cy - r * 0.26, r * 0.92, 0, Math.PI * 2);
    mg.fill();
    c.style.width = size + 'px';
    moonCache = { r, canvas: c, size };
    return c;
  }

  function drawSunOrMoon(t) {
    const x = L.sunX, y = L.sunY, r = L.sunR;
    g.save();
    if (night) {
      // The crescent is cut on its own offscreen canvas and then stamped on.
      // Punching it directly with destination-out would erase the sky behind
      // it too, leaving a hole through to the page background.
      // Explicit size: the sprite's backing store is devicePixelRatio-scaled.
      g.drawImage(moonSprite(r), x - r * 1.1, y - r * 1.1, r * 2.2, r * 2.2);
    } else {
      // In rain the sun sits behind the weather: dimmed so the grey sky reads
      // honestly, but never hidden, because it is also the day/night control.
      if (weather === 'rainy' || weather === 'snowy') g.globalAlpha = 0.45;
      const glow = g.createRadialGradient(x, y, r * 0.2, x, y, r * 2.1);
      glow.addColorStop(0, 'rgba(255,243,176,0.55)');
      glow.addColorStop(1, 'rgba(255,243,176,0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(x, y, r * 2.1, 0, Math.PI * 2); g.fill();

      g.strokeStyle = CONFIG.colors.sun;
      g.lineWidth = Math.max(2, r * 0.13);
      g.lineCap = 'round';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + t / 4200;
        g.beginPath();
        g.moveTo(x + Math.cos(a) * r * 1.28, y + Math.sin(a) * r * 1.28);
        g.lineTo(x + Math.cos(a) * r * 1.62, y + Math.sin(a) * r * 1.62);
        g.stroke();
      }
      g.fillStyle = CONFIG.colors.sun;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = CONFIG.colors.sunGlow;
      g.beginPath(); g.arc(x - r * 0.25, y - r * 0.28, r * 0.42, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  function drawCloud(c) {
    const x = c.x * L.w, y = c.y * L.horizonY, s = c.s * L.unit * 0.07;
    g.fillStyle = night ? CONFIG.colors.cloudNight : CONFIG.colors.cloudDay;
    g.globalAlpha = weather === 'rainy' ? 0.95 : 0.85;
    g.beginPath();
    g.arc(x, y, s, 0, Math.PI * 2);
    g.arc(x + s * 0.9, y + s * 0.15, s * 0.78, 0, Math.PI * 2);
    g.arc(x - s * 0.9, y + s * 0.2, s * 0.66, 0, Math.PI * 2);
    g.arc(x, y + s * 0.45, s * 0.8, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }

  function drawGround() {
    g.fillStyle = night ? CONFIG.colors.grassNight : CONFIG.colors.grassDay;
    g.fillRect(0, L.horizonY, L.w, L.h - L.horizonY);
    // A soft band of lighter grass at the horizon gives the ground some depth.
    const grad = g.createLinearGradient(0, L.horizonY, 0, L.groundY);
    grad.addColorStop(0, night ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, L.horizonY, L.w, L.groundY - L.horizonY);
    drawSnowOnGround();
  }

  // Full width of the world, from the horizon down, with a gently undulating
  // top edge so the covering reads as settled snow and not a painted stripe.
  function drawSnowOnGround() {
    if (snowDepth <= 0.001) return;
    // Creeps up from the foreground and reaches the horizon when fully settled,
    // so a covered world is genuinely white rather than white with a green
    // field still showing behind it.
    // Overshoot the horizon a little so the undulating edge cannot leave a
    // sliver of green showing along it at full depth.
    const topY = lerp(L.h, L.horizonY - L.unit * 0.02, clamp01(snowDepth));
    g.save();
    g.fillStyle = night ? CONFIG.colors.snowShade : CONFIG.colors.snow;
    g.beginPath();
    g.moveTo(0, L.h);
    g.lineTo(0, topY);
    const bumps = 7;
    for (let i = 0; i <= bumps; i++) {
      const x = (i / bumps) * L.w;
      const wave = Math.sin(i * 1.7) * L.unit * 0.012 * snowDepth;
      g.lineTo(x, topY + wave);
    }
    g.lineTo(L.w, L.h);
    g.closePath();
    g.fill();
    g.restore();
  }

  function drawHouse(t) {
    const c = CONFIG.colors;
    const left = L.houseLeft, right = L.houseRight;
    const w = right - left;
    const wallH = L.groundY - L.wallTop;

    // Interior: warm light at night so the house reads as somewhere to go.
    g.fillStyle = night ? c.interiorNight : c.interiorDay;
    g.fillRect(left, L.wallTop, w, wallH);
    if (night) {
      const glow = g.createRadialGradient(L.houseMidX, L.wallTop + wallH * 0.4,
        w * 0.05, L.houseMidX, L.wallTop + wallH * 0.4, w * 0.8);
      glow.addColorStop(0, 'rgba(255,214,120,0.55)');
      glow.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = glow;
      g.fillRect(left, L.wallTop, w, wallH);
    }

    // A window high on the back wall, above the bed rather than between the
    // furniture, where there is barely a tenth of the interior to spare. It is
    // filled with the live sky, so the weather is visible from indoors too.
    drawWindow();

    // Floor, with a few board seams so it is not a flat slab.
    const floorH = wallH * 0.07;
    const floorY = L.groundY - floorH;
    g.fillStyle = c.floor;
    g.fillRect(left, floorY, w, floorH);
    g.strokeStyle = 'rgba(0,0,0,0.13)';
    g.lineWidth = Math.max(1, L.unit * 0.003);
    for (let i = 1; i < 6; i++) {
      const x = left + (w * i) / 6;
      g.beginPath();
      g.moveTo(x, floorY);
      g.lineTo(x - w * 0.012, L.groundY);
      g.stroke();
    }
    // Skirting board where the wall meets the floor.
    g.fillStyle = 'rgba(0,0,0,0.10)';
    g.fillRect(left, floorY - wallH * 0.035, w, wallH * 0.035);

    // A rug under the bed, so that corner of the room is not bare.
    g.fillStyle = 'rgba(224,104,90,0.22)';
    g.beginPath();
    roundRect(L.bed.x + L.bed.w * 0.06, floorY + floorH * 0.15,
      L.bed.w * 0.88, floorH * 0.6, floorH * 0.3);
    g.fill();

    drawBed();
    drawWardrobe(t);

    // Side walls, drawn after the contents so they frame the cutaway.
    const wallT = L.wallT;
    g.fillStyle = night ? c.wallNight : c.wallDay;
    g.fillRect(left - wallT, L.wallTop, wallT, wallH);
    g.fillRect(right, L.wallTop, wallT, wallH);

    // Stone foundation the walls stand on.
    g.fillStyle = '#9d9384';
    g.fillRect(left - wallT, L.groundY - wallH * 0.045, w + wallT * 2, wallH * 0.045);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 9; i++) {
      const x = left - wallT + ((w + wallT * 2) * i) / 9;
      g.fillRect(x, L.groundY - wallH * 0.045, Math.max(1, L.unit * 0.003), wallH * 0.045);
    }

    drawChimney(t);
    drawRoof();
  }

  function drawWindow() {
    const wallH = L.groundY - L.wallTop;
    const wx = L.bed.x + L.bed.w * 0.12;
    const ww = L.bed.w * 0.62;
    const wy = L.wallTop + wallH * 0.10;
    const wh = wallH * 0.24;
    const frame = Math.max(2, L.unit * 0.008);

    // Panes show the current sky, so the weather reads from inside.
    const [top, bottom] = skyColors();
    const grad = g.createLinearGradient(0, wy, 0, wy + wh);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    g.fillStyle = grad;
    g.fillRect(wx, wy, ww, wh);

    // Snow piles on the outside of the sill, visible through the glass.
    if (snowDepth > 0.001) {
      g.fillStyle = CONFIG.colors.snow;
      g.fillRect(wx, wy + wh - wh * 0.16 * snowDepth, ww, wh * 0.16 * snowDepth);
    }

    g.strokeStyle = '#8a5a3c';
    g.lineWidth = frame;
    g.strokeRect(wx, wy, ww, wh);
    g.beginPath();
    g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh);
    g.moveTo(wx, wy + wh / 2); g.lineTo(wx + ww, wy + wh / 2);
    g.stroke();
    // Sill
    g.fillStyle = '#8a5a3c';
    g.fillRect(wx - frame * 1.6, wy + wh, ww + frame * 3.2, frame * 1.4);
  }

  function drawChimney(t) {
    const ch = L.chimney;
    const c = CONFIG.colors;
    // Base sits on the roof slope; roofYAt gives the exact height there.
    const baseY = roofYAt(ch.x + ch.w / 2);
    g.fillStyle = c.roofDark;
    g.fillRect(ch.x, ch.top, ch.w, baseY - ch.top);
    g.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 1; i < 4; i++) {
      const y = ch.top + ((baseY - ch.top) * i) / 4;
      g.fillRect(ch.x, y, ch.w, Math.max(1, L.unit * 0.003));
    }
    // Cap
    g.fillStyle = '#7a6a60';
    g.fillRect(ch.x - ch.w * 0.14, ch.top - ch.w * 0.16, ch.w * 1.28, ch.w * 0.16);

    if (snowDepth > 0.001) {
      g.fillStyle = CONFIG.colors.snow;
      g.fillRect(ch.x - ch.w * 0.14, ch.top - ch.w * (0.16 + 0.20 * snowDepth),
        ch.w * 1.28, ch.w * 0.20 * snowDepth);
    }

    // Smoke, when the fire would be lit: after dark or in the cold.
    if (night || weather === 'snowy') {
      const cx = ch.x + ch.w / 2;
      g.save();
      g.fillStyle = 'rgba(226,226,232,0.42)';
      for (let i = 0; i < 4; i++) {
        const p = ((t / 2600) + i / 4) % 1;
        const r = ch.w * (0.28 + p * 0.7);
        g.globalAlpha = 0.42 * (1 - p);
        g.beginPath();
        g.arc(cx + Math.sin(p * 3.4 + i) * ch.w * 0.7,
          ch.top - ch.w * 0.3 - p * L.unit * 0.15, r, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
  }

  function drawRoof() {
    const c = CONFIG.colors;
    const L_ = L.eaveLeft, R_ = L.eaveRight, peakY = L.roofPeak, eaveY = L.eaveY;

    g.save();
    // Clip to the roof triangle so the shingle rows and the snow cap can be
    // drawn as plain bands without any per-row trigonometry.
    g.beginPath();
    g.moveTo(L_, eaveY);
    g.lineTo(L.houseMidX, peakY);
    g.lineTo(R_, eaveY);
    g.closePath();
    g.clip();

    g.fillStyle = c.roof;
    g.fillRect(L_, peakY, R_ - L_, eaveY - peakY);

    // Shingle rows.
    g.strokeStyle = 'rgba(0,0,0,0.16)';
    g.lineWidth = Math.max(1.5, L.unit * 0.005);
    const rows = 5;
    for (let i = 1; i <= rows; i++) {
      const y = peakY + ((eaveY - peakY) * i) / (rows + 1);
      g.beginPath();
      g.moveTo(L_, y);
      g.lineTo(R_, y);
      g.stroke();
    }
    // The left slope is turned away from the light.
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.beginPath();
    g.moveTo(L_, eaveY);
    g.lineTo(L.houseMidX, peakY);
    g.lineTo(L.houseMidX, eaveY);
    g.closePath();
    g.fill();

    // Settled snow: fill the (clipped) roof white, then paint the roof back
    // over it shifted down by the depth. What is left is a clean band lying
    // along both slopes — no per-slope trigonometry needed.
    if (snowDepth > 0.001) {
      const cap = L.unit * CONFIG.weather.snowCapFrac * snowDepth;
      g.fillStyle = CONFIG.colors.snow;
      g.fillRect(L_, peakY, R_ - L_, eaveY - peakY);
      g.fillStyle = c.roof;
      g.beginPath();
      g.moveTo(L_, eaveY + cap);
      g.lineTo(L.houseMidX, peakY + cap);
      g.lineTo(R_, eaveY + cap);
      g.lineTo(R_, eaveY + cap * 40);
      g.lineTo(L_, eaveY + cap * 40);
      g.closePath();
      g.fill();
      // Redraw the shading on the left slope so it survives the repaint.
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.beginPath();
      g.moveTo(L_, eaveY + cap);
      g.lineTo(L.houseMidX, peakY + cap);
      g.lineTo(L.houseMidX, eaveY + cap * 40);
      g.lineTo(L_, eaveY + cap * 40);
      g.closePath();
      g.fill();
    }
    g.restore();

    // Ridge cap along the peak, outside the clip so it reads as a raised edge.
    g.strokeStyle = c.roofDark;
    g.lineWidth = Math.max(2.5, L.unit * 0.010);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(L.houseMidX, peakY + L.unit * 0.004);
    g.lineTo(L.houseMidX, peakY - L.unit * 0.004);
    g.stroke();
    g.beginPath();
    g.moveTo(L_, eaveY);
    g.lineTo(L.houseMidX, peakY);
    g.lineTo(R_, eaveY);
    g.stroke();
  }

  function drawBed() {
    const c = CONFIG.colors, b = L.bed;
    const legH = b.h * 0.16;
    // Frame
    g.fillStyle = c.bedFrame;
    g.fillRect(b.x, b.y + b.h * 0.42, b.w, b.h * 0.24);
    g.fillRect(b.x, b.y + b.h * 0.1, b.w * 0.07, b.h * 0.9);              // headboard
    g.fillRect(b.x + b.w - b.w * 0.06, b.y + b.h * 0.34, b.w * 0.06, b.h * 0.66);
    // Mattress + blanket
    g.fillStyle = c.bedSheet;
    g.fillRect(b.x + b.w * 0.07, b.y + b.h * 0.36, b.w * 0.88, b.h * 0.2);
    g.fillStyle = c.blanket;
    g.fillRect(b.x + b.w * 0.36, b.y + b.h * 0.34, b.w * 0.59, b.h * 0.24);
    // Pillow
    g.fillStyle = c.pillow;
    g.beginPath();
    const pr = b.h * 0.07;
    roundRect(b.x + b.w * 0.10, b.y + b.h * 0.30, b.w * 0.24, b.h * 0.14, pr);
    g.fill();
    // Legs
    g.fillStyle = c.bedFrame;
    g.fillRect(b.x + b.w * 0.02, b.y + b.h - legH, b.w * 0.06, legH);
    g.fillRect(b.x + b.w * 0.90, b.y + b.h - legH, b.w * 0.06, legH);
  }

  function drawWardrobe(t) {
    const c = CONFIG.colors, wd = L.wardrobe;
    const legH = wd.h * 0.06;
    const bodyH = wd.h - legH;

    // Legs, then a body that stops short of the floor.
    g.fillStyle = c.wardrobeDark;
    g.fillRect(wd.x + wd.w * 0.08, wd.y + bodyH, wd.w * 0.10, legH);
    g.fillRect(wd.x + wd.w * 0.82, wd.y + bodyH, wd.w * 0.10, legH);

    g.fillStyle = c.wardrobeDark;
    roundRect(wd.x, wd.y, wd.w, bodyH, wd.w * 0.06); g.fill();
    g.fillStyle = c.wardrobe;
    roundRect(wd.x + wd.w * 0.04, wd.y + bodyH * 0.06, wd.w * 0.92, bodyH * 0.92, wd.w * 0.05); g.fill();
    // Overhanging cornice reads instantly as a piece of furniture.
    g.fillStyle = c.wardrobeDark;
    roundRect(wd.x - wd.w * 0.05, wd.y - bodyH * 0.04, wd.w * 1.10, bodyH * 0.10, wd.w * 0.04);
    g.fill();

    // Doors swing open while he is at the wardrobe.
    let open = 0;
    if (activity === 'wardrobe') {
      const p = clamp01((t - activityStart) / CONFIG.wardrobeOpenMs);
      open = Math.sin(p * Math.PI);                    // open then close again
    }
    const halfW = wd.w * 0.44;
    const doorY = wd.y + bodyH * 0.12;
    const doorH = bodyH * 0.80;
    if (open > 0.02) {
      // Interior when open: a hint of hanging clothes.
      g.fillStyle = '#5c3d26';
      g.fillRect(wd.x + wd.w * 0.06, doorY, wd.w * 0.88, doorH);
      const colors = ['#ff9fce', '#a9dcf5', '#ffd54a'];
      colors.forEach((col, i) => {
        g.fillStyle = col;
        const cx = wd.x + wd.w * (0.20 + i * 0.24);
        g.fillRect(cx, doorY + doorH * 0.12, wd.w * 0.14, doorH * 0.5);
      });
    }
    g.fillStyle = c.wardrobeDoor;
    // Left and right doors, narrowing as they swing.
    const shrink = 1 - open * 0.92;
    g.fillRect(wd.x + wd.w * 0.06, doorY, halfW * shrink, doorH);
    g.fillRect(wd.x + wd.w * 0.94 - halfW * shrink, doorY, halfW * shrink, doorH);
    // Handles
    g.fillStyle = '#f0d9a8';
    const hr = Math.max(1.5, wd.w * 0.035);
    g.beginPath();
    g.arc(wd.x + wd.w * 0.06 + halfW * shrink - hr * 2, doorY + doorH * 0.5, hr, 0, Math.PI * 2);
    g.arc(wd.x + wd.w * 0.94 - halfW * shrink + hr * 2, doorY + doorH * 0.5, hr, 0, Math.PI * 2);
    g.fill();
  }

  function drawTrampoline(t) {
    const c = CONFIG.colors, tr = L.tram;
    const cx = tr.x + tr.w / 2;
    const rimY = tr.y + tr.h * 0.30;      // the rim sits high; legs splay below
    const rx = tr.w * 0.5, ry = tr.h * 0.20;

    // Mat dips while he is in the air and snaps back as he lands.
    let dip = 0;
    if (activity === 'jumping') {
      const p = ((t - activityStart) % CONFIG.jump.durationMs) / CONFIG.jump.durationMs;
      dip = Math.max(0, Math.cos(p * Math.PI * 2)) * tr.h * 0.26;
    }

    // Four splayed legs, drawn first so the rim overlaps their tops.
    g.strokeStyle = c.tramFrame;
    g.lineWidth = Math.max(3.5, tr.w * 0.055);
    g.lineCap = 'round';
    g.beginPath();
    [[-0.86, -1.05], [-0.34, -0.52], [0.34, 0.52], [0.86, 1.05]].forEach(([a, b]) => {
      g.moveTo(cx + rx * a, rimY + ry * 0.5);
      g.lineTo(cx + rx * b, tr.y + tr.h);
    });
    g.stroke();

    // Mat: a darker well, then the sagging surface on top of it.
    g.fillStyle = '#3f7fae';
    g.beginPath();
    g.ellipse(cx, rimY + ry * 0.35, rx * 0.9, ry * 0.85, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = c.tramMat;
    g.beginPath();
    g.ellipse(cx, rimY + dip, rx * 0.9, ry * 0.85, 0, 0, Math.PI * 2);
    g.fill();
    // A highlight so the surface reads as taut fabric.
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.beginPath();
    g.ellipse(cx - rx * 0.28, rimY + dip - ry * 0.22, rx * 0.34, ry * 0.24, -0.3, 0, Math.PI * 2);
    g.fill();

    // Padded rim with spring ticks.
    g.strokeStyle = c.tramSpring;
    g.lineWidth = Math.max(3, tr.w * 0.07);
    g.beginPath();
    g.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = Math.max(1, tr.w * 0.014);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * rx * 0.9, rimY + Math.sin(a) * ry * 0.9);
      g.lineTo(cx + Math.cos(a) * rx * 1.02, rimY + Math.sin(a) * ry * 1.02);
      g.stroke();
    }

    // Snow gathers along the far half of the rim, where it would actually
    // rest — capping the whole ellipse would read as a white ring.
    if (snowDepth > 0.001) {
      g.strokeStyle = CONFIG.colors.snow;
      g.lineWidth = Math.max(1.5, tr.h * 0.10 * snowDepth);
      g.lineCap = 'round';
      g.beginPath();
      g.ellipse(cx, rimY, rx, ry, 0, Math.PI, Math.PI * 2);
      g.stroke();
    }
  }

  // Top of the trampoline mat: where a bouncing child's feet actually leave.
  // Matches the mat ellipse drawn in drawTrampoline: rimY + ry * 0.35.
  function matY() {
    return L.tram.y + L.tram.h * 0.37;
  }

  // Drawn in two halves around the baby: the mat and back rail behind her, the
  // front rail and bars in front, so she genuinely sits inside the pen.
  function drawPenBack() {
    const c = CONFIG.colors, pen = L.pen;
    const rail = Math.max(3, pen.h * 0.13);
    // Mat
    g.fillStyle = c.penMat;
    g.beginPath();
    g.ellipse(pen.x + pen.w / 2, pen.y + pen.h * 0.92, pen.w * 0.48, pen.h * 0.20, 0, 0, Math.PI * 2);
    g.fill();
    // Back wall: bars first, then its rail on top, both in the shaded tone so
    // the pen reads as something you see through rather than a flat panel.
    g.strokeStyle = c.penRailDark;
    g.lineWidth = Math.max(1.5, pen.w * 0.011);
    g.lineCap = 'round';
    const bars = 8;
    for (let i = 0; i <= bars; i++) {
      const x = pen.x + (pen.w * i) / bars;
      g.beginPath();
      g.moveTo(x, pen.y + rail * 0.5);
      g.lineTo(x, pen.y + pen.h * 0.72);
      g.stroke();
    }
    g.fillStyle = c.penRailDark;
    g.beginPath();
    roundRect(pen.x, pen.y, pen.w, rail, rail * 0.5);
    g.fill();
  }

  function drawPenFront(t) {
    const c = CONFIG.colors, pen = L.pen;
    const rail = Math.max(3, pen.h * 0.13);
    const frontY = pen.y + pen.h * 0.34;

    // Bars
    g.strokeStyle = c.penBar;
    g.lineWidth = Math.max(2, pen.w * 0.016);
    g.lineCap = 'round';
    const bars = 8;
    for (let i = 0; i <= bars; i++) {
      const x = pen.x + (pen.w * i) / bars;
      g.beginPath();
      g.moveTo(x, frontY + rail * 0.5);
      g.lineTo(x, pen.y + pen.h);
      g.stroke();
    }
    // Front rail, and the feet it stands on
    g.fillStyle = c.penRail;
    g.beginPath();
    roundRect(pen.x - pen.w * 0.02, frontY, pen.w * 1.04, rail, rail * 0.5);
    g.fill();
    g.fillStyle = c.penRailDark;
    g.fillRect(pen.x + pen.w * 0.02, pen.y + pen.h, pen.w * 0.05, pen.h * 0.07);
    g.fillRect(pen.x + pen.w * 0.93, pen.y + pen.h, pen.w * 0.05, pen.h * 0.07);

    // Snow gathers along the top rail, as it does on the trampoline.
    if (snowDepth > 0.001) {
      g.fillStyle = CONFIG.colors.snow;
      g.beginPath();
      roundRect(pen.x - pen.w * 0.02, frontY - rail * 0.55 * snowDepth,
        pen.w * 1.04, rail * 0.7 * snowDepth, rail * 0.35);
      g.fill();
    }
  }

  function drawBaby(t) {
    const img = babyImage();
    if (!img) return;               // art missing: the pen simply stands empty
    const pen = L.pen;
    const asleep = night && babyPose !== 'happy';

    // The four frames were sliced at one common scale and cropped tight to
    // their content, so their relative proportions are already right. Drawing
    // every pose at the same factor keeps a crawling baby lower and longer
    // than a sitting one — which per-pose height normalisation, as used for
    // her brother, would have flattened out.
    const ref = baby.sit || baby.happy || img;
    const k = L.babyH / ref.naturalHeight;
    const drawW = img.naturalWidth * k;
    const drawH = img.naturalHeight * k;

    const x = pen.x + pen.w * (0.16 + babyX * 0.68);
    // The crop bottom is the content bottom, so this rests her on the mat.
    let y = pen.y + pen.h * 0.92;
    if (!asleep) y -= Math.abs(Math.sin(t / 900 * CONFIG.baby.bobHz)) * drawH * 0.03;

    g.save();
    g.translate(x, y);
    if (babyFacing < 0) g.scale(-1, 1);
    g.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
    g.restore();

    if (asleep) drawBabyZzz(t, x, y - drawH);
  }

  function drawBabyZzz(t, x, y) {
    g.save();
    g.fillStyle = CONFIG.colors.ink;
    g.font = `700 ${Math.max(10, L.unit * 0.035)}px ${getComputedStyle(document.body).fontFamily}`;
    g.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const p = ((t / 2400) + i / 3) % 1;
      g.globalAlpha = (1 - p) * 0.75;
      g.fillText('z', x + p * L.unit * 0.05, y - p * L.unit * 0.11);
    }
    g.restore();
  }

  function mascotBox() {
    const x = mascotX * L.w;
    let y = L.groundY;
    if (activity === 'jumping') y = matY() - jumpOffset(now());
    return { x: x - L.mascotW / 2, y: y - L.mascotH, w: L.mascotW, h: L.mascotH };
  }

  function jumpOffset(t) {
    const p = ((t - activityStart) % CONFIG.jump.durationMs) / CONFIG.jump.durationMs;
    return Math.sin(p * Math.PI) * L.mascotH * CONFIG.jump.heightFrac;
  }

  // Asleep he lies on the bed rather than standing on the ground, so this pose
  // is placed against the mattress instead of the usual walking baseline. All
  // three sleep poses face head-left, matching the pillow.
  function drawSleeping(t) {
    // No upright fallback here — if the sleep pose is missing he is simply
    // tucked out of sight and only the Zzz shows, as in phase 1.
    const img = images.sleep || null;
    const b = L.bed;
    if (img) {
      const bb = boundsOf(img);
      const drawW = (b.w * CONFIG.sleep.widthFrac) / (bb.x1 - bb.x0);
      const drawH = drawW * (img.naturalHeight / img.naturalWidth);
      // Sunk slightly into the bedding rather than balanced on the very top
      // edge of it, so he reads as lying in the bed and not above it.
      const restY = b.y + b.h * (0.36 + CONFIG.sleep.sinkFrac);
      const breathe = Math.sin(t / 1400) * L.unit * 0.004;
      g.drawImage(img,
        b.x + b.w * CONFIG.sleep.headFrac - bb.x0 * drawW,
        restY - bb.y1 * drawH + breathe,
        drawW, drawH);
    }
    drawZzz(t);
  }

  function drawMascot(t) {
    if (activity === 'sleeping') { drawSleeping(t); return; }

    let img = poseFor('stand');
    if (activity === 'walking') img = poseFor('walk');
    if (activity === 'waving') img = poseFor('wave');
    if (activity === 'magic') img = images.magic || poseFor('stand');
    if (activity === 'jumping') img = poseFor('jump');
    if (!img) return;

    // Every pose is framed differently inside its file — some fill it, some
    // leave a wide margin — so scale by the boy himself, not by the PNG. That
    // keeps him the same size and standing on the same line in every pose.
    const bb = boundsOf(img);
    const drawH = L.mascotH / (bb.y1 - bb.y0);
    const drawW = drawH * (img.naturalWidth / img.naturalHeight);
    const h = L.mascotH;

    let x = mascotX * L.w;
    let y = L.groundY;
    let rot = 0;

    if (activity === 'walking') {
      const swing = Math.sin(walkPhase * Math.PI * 2);
      y -= Math.abs(swing) * h * CONFIG.mascot.bobFrac;
      rot = swing * CONFIG.mascot.tiltDegrees * (Math.PI / 180);
    } else if (activity === 'jumping') {
      // The pose is already airborne, so the arc alone carries the bounce — no
      // squash-and-stretch, which would only distort the artwork. He bounces
      // off the mat surface rather than the ground line the legs stand on.
      y = matY() - jumpOffset(t);
    } else if (activity === 'waving') {
      const p = (t - activityStart) / CONFIG.waveMs;
      rot = Math.sin(p * Math.PI * 4) * 2 * (Math.PI / 180);
    } else {
      y -= Math.abs(Math.sin(t / 900)) * h * 0.008;      // gentle idle breathing
    }

    // Wind leans him downwind.
    if (weather === 'windy') {
      rot += Math.sin(t / 420) * 1.2 * (Math.PI / 180)
        + CONFIG.mascot.windLeanDegrees * (Math.PI / 180) * 0.5;
    }

    // Pivot at mid-body so the walk tilt swings from the waist, then place the
    // art so his feet land on `y` and his middle sits on `x`.
    g.save();
    g.translate(x, y - h / 2);
    if (rot) g.rotate(rot);
    if (facing < 0) g.scale(-1, 1);
    g.drawImage(img,
      -((bb.x0 + bb.x1) / 2) * drawW,
      h / 2 - bb.y1 * drawH,
      drawW, drawH);
    g.restore();
  }

  function drawMagic(t) {
    if (activity !== 'magic' || !sparkles.length) return;
    const p = clamp01((t - activityStart) / CONFIG.magicMs);
    const cx = mascotX * L.w;
    const cy = L.groundY - L.mascotH * 0.62;
    g.save();
    for (const sparkle of sparkles) {
      const distance = L.mascotH * sparkle.distance * easeOutCubic(p);
      const x = cx + Math.cos(sparkle.angle) * distance;
      const y = cy + Math.sin(sparkle.angle) * distance - p * L.mascotH * 0.12;
      const radius = L.unit * sparkle.size * (1 - p);
      g.globalAlpha = 1 - p;
      g.fillStyle = sparkle.color;
      g.translate(x, y);
      g.rotate(sparkle.angle + p * Math.PI);
      g.beginPath();
      for (let point = 0; point < 8; point++) {
        const r = point % 2 ? radius * 0.35 : radius;
        const a = point * Math.PI / 4;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (point === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
      g.fill();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    g.restore();
  }

  function drawPicker(t) {
    if (!picker) return;
    const cfg = CONFIG.picker;
    const c = CONFIG.colors;
    // Cards scale up from the middle as the panel appears.
    const p = clamp01((t - picker.openedAt) / cfg.openMs);
    const grow = 0.86 + 0.14 * easeOutCubic(p);

    g.save();
    g.fillStyle = `rgba(24,20,44,${cfg.scrimAlpha * p})`;
    g.fillRect(0, 0, L.w, L.h);

    for (const card of pickerCards()) {
      const cx = card.x + card.w / 2, cy = card.y + card.h / 2;
      const w = card.w * grow, h = card.h * grow;
      const x = cx - w / 2, y = cy - h / 2;
      const worn = card.index === outfitIndex;
      const radius = Math.min(w, h) * 0.10;

      g.globalAlpha = p;
      g.fillStyle = '#fffaf0';
      g.beginPath();
      roundRect(x, y, w, h, radius);
      g.fill();

      // The outfit he has on is ringed, so the choice has some context.
      g.strokeStyle = worn ? '#ffb300' : 'rgba(0,0,0,0.12)';
      g.lineWidth = Math.max(2, L.unit * (worn ? 0.016 : 0.005));
      g.beginPath();
      roundRect(x, y, w, h, radius);
      g.stroke();

      const labelH = h * 0.16;
      const img = cards[card.outfit.id];
      const padX = w * 0.08, padY = h * 0.06;
      const boxW = w - padX * 2, boxH = h - labelH - padY * 2;
      if (img && img.naturalWidth) {
        // Contain, so a garment is never cropped or stretched.
        const scale = Math.min(boxW / img.naturalWidth, boxH / img.naturalHeight);
        const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
        g.drawImage(img, cx - dw / 2, y + padY + (boxH - dh) / 2, dw, dh);
      } else {
        // A card whose art failed to load still reads as that outfit rather
        // than as an empty box.
        g.fillStyle = card.outfit.tint;
        g.beginPath();
        roundRect(cx - boxW / 2, y + padY, boxW, boxH, radius * 0.6);
        g.fill();
      }

      g.fillStyle = c.ink;
      g.font = `700 ${Math.max(13, L.unit * 0.055)}px ${getComputedStyle(document.body).fontFamily}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(card.outfit.label, cx, y + h - labelH / 2);
    }
    g.restore();
  }

  function drawZzz(t) {
    const b = L.bed;
    // Above and behind his head rather than on top of him, now that the sleep
    // pose actually occupies the bed.
    const x = b.x + b.w * 0.34, y = b.y - b.h * 0.06;
    g.save();
    g.fillStyle = CONFIG.colors.ink;
    g.font = `700 ${Math.max(12, L.unit * 0.05)}px ${getComputedStyle(document.body).fontFamily}`;
    g.textAlign = 'center';
    zzz.forEach(z => {
      const p = clamp01((t - z.born) / CONFIG.sleep.zzzMs);
      g.globalAlpha = (1 - p) * 0.9;
      g.fillText('z', x + p * L.unit * 0.06, y - p * L.unit * 0.16);
    });
    g.restore();
  }

  function drawSnowfall() {
    if (weather !== 'snowy' || !flakes.length) return;
    g.save();
    g.fillStyle = CONFIG.colors.snow;
    g.globalAlpha = 0.9;
    for (const f of flakes) {
      g.beginPath();
      g.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function drawRain() {
    if (weather !== 'rainy') return;
    g.strokeStyle = CONFIG.colors.rain;
    g.lineWidth = Math.max(1.2, L.unit * 0.006);
    g.lineCap = 'round';
    g.globalAlpha = 0.75;
    const len = L.unit * 0.045;
    for (const d of drops) {
      g.beginPath();
      g.moveTo(d.x, d.y);
      g.lineTo(d.x - len * 0.18, d.y + len);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  function drawLeaves() {
    if (weather !== 'windy') return;
    for (const lf of leaves) {
      const x = lf.x * L.w;
      const y = (lf.y + Math.sin(lf.wob) * 0.03) * L.h;
      const s = L.unit * 0.018 * lf.s;
      g.save();
      g.translate(x, y);
      g.rotate(lf.r);
      g.fillStyle = lf.c;
      g.beginPath();
      g.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }

  function roundRect(x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) { g.roundRect(x, y, w, h, r); return; }
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* ---- rotate gate ----
     A phone held upright cannot fit a house, a wardrobe and a playground side
     by side. Where the browser lets us we simply lock to landscape; everywhere
     else (notably iOS, which has no orientation lock at all) we ask, with a
     tilting phone the parent can read at a glance. */

  function drawRotatePrompt(t) {
    const w = L.w, h = L.h, u = L.unit;
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fffaf2';
    g.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h * 0.44;
    const tilt = -Math.PI / 2 * easeInOutCubic(clamp01((Math.sin(t / 900) + 1) / 2));
    const pw = u * 0.30, ph = pw * 1.85, r = pw * 0.14;

    g.save();
    g.translate(cx, cy);
    g.rotate(tilt);
    g.fillStyle = '#3a3357';
    roundRect(-pw / 2, -ph / 2, pw, ph, r); g.fill();
    g.fillStyle = '#8ed6ff';
    roundRect(-pw / 2 + pw * 0.07, -ph / 2 + pw * 0.16, pw * 0.86, ph - pw * 0.32, r * 0.6);
    g.fill();
    g.restore();

    // Curved arrow hinting at the turn.
    g.strokeStyle = '#ffb627';
    g.lineWidth = Math.max(4, u * 0.022);
    g.lineCap = 'round';
    const ar = u * 0.30;
    g.beginPath();
    g.arc(cx, cy, ar, Math.PI * 1.15, Math.PI * 1.75);
    g.stroke();
    const ae = Math.PI * 1.75;
    const ax = cx + Math.cos(ae) * ar, ay = cy + Math.sin(ae) * ar;
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(ax - u * 0.045, ay - u * 0.035);
    g.moveTo(ax, ay);
    g.lineTo(ax - u * 0.012, ay + u * 0.052);
    g.stroke();

    g.fillStyle = '#2f3557';
    g.textAlign = 'center';
    g.font = `800 ${Math.max(16, u * 0.075)}px ${getComputedStyle(document.body).fontFamily}`;
    g.fillText('Turn me sideways!', cx, h * 0.80);
  }

  // Best effort: succeeds on installed Android PWAs, silently refused
  // elsewhere. Never awaited, never allowed to throw.
  function tryLockLandscape() {
    try {
      const o = screen.orientation;
      if (o && typeof o.lock === 'function') o.lock('landscape').catch(() => {});
    } catch (e) { /* unsupported: the prompt covers it */ }
  }

  function unlockOrientation() {
    try {
      const o = screen.orientation;
      if (o && typeof o.unlock === 'function') o.unlock();
    } catch (e) { /* nothing to undo */ }
  }

  /* ---- loop ---- */
  let last = 0;
  function frame(t) {
    if (!alive) return;
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0.016;
    last = t;

    if (L.portrait) {
      drawRotatePrompt(t);
      raf = requestAnimationFrame(frame);
      return;
    }

    update(dt, t);

    g.clearRect(0, 0, L.w, L.h);
    drawSky(t);
    drawGround();
    drawTrampoline(t);
    drawPenBack();
    drawBaby(t);
    drawPenFront(t);
    drawHouse(t);
    drawMascot(t);
    drawMagic(t);
    drawRain();
    drawSnowfall();
    drawLeaves();
    drawPicker(t);

    raf = requestAnimationFrame(frame);
  }

  /* ---- boot ---- */
  resize();
  tryLockLandscape();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  wearOutfit(0);

  // The garment cards are small and the picker must never open empty, so they
  // load once up front rather than when the wardrobe is first tapped.
  preloadImages(Object.fromEntries(OUTFITS.map(o => [o.id, o.card])), 0)
    .then(loaded => { if (alive) cards = loaded || {}; });

  preloadImages(BABY_POSES, 0).then(loaded => {
    if (!alive) return;
    baby = loaded || {};
    if (L) layout(canvas.clientWidth, canvas.clientHeight);
  });

  raf = requestAnimationFrame(frame);
  setReprompt(null);      // free play: never nag

  return () => {
    alive = false;
    picker = null;
    cancelAnimationFrame(raf);
    audio.stopWeatherBed();  // leaving must never leave weather playing
    unlockOrientation();     // leave the rest of the app free to rotate
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('resize', resize);
    window.removeEventListener('orientationchange', resize);
  };
}

export default {
  id: 'playhouse',
  title: 'Play House',
  icon: ICON,
  start,
};
