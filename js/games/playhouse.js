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
  stations: {
    bedPortrait: 0.17, wardrobePortrait: 0.44, trampolinePortrait: 0.855, homePortrait: 0.615,
    bedLandscape: 0.15, wardrobeLandscape: 0.36, trampolineLandscape: 0.80, homeLandscape: 0.60,
  },

  jump: { count: 3, heightFrac: 0.55, durationMs: 620 },
  sleep: { fadeMs: 420, zzzMs: 2200, widthFrac: 0.74, headFrac: 0.10, sinkFrac: 0.17 },
  wardrobeOpenMs: 1500,
  outfitChangeAtFrac: 0.55,       // through the door-opening animation
  waveMs: 1400,

  weather: {
    order: ['sunny', 'rainy', 'windy'],
    rainDrops: 90,
    rainSpeedFrac: 1.5,          // of canvas height per second
    leafCount: 14,
    windSpeedFrac: 0.55,         // of canvas width per second
    cloudCountSunny: 2,
    cloudCountElse: 5,
  },

  colors: {
    skyDayTop: '#8ed6ff', skyDayBottom: '#eafaff',
    skyNightTop: '#2b3570', skyNightBottom: '#5a6bab',
    skyRainTop: '#9fb4c4', skyRainBottom: '#d6e2e8',
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
    ink: '#3a3357',
  },
};

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
    poses: {
      stand: 'assets/mascot_idle.PNG',
      walk: 'assets/mascot_walking.PNG',
      wave: 'assets/mascot_waving.PNG',
      jump: 'assets/mascot_winter_jump.PNG',
      sleep: 'assets/mascot_winter_sleep.PNG',
    },
  },
  {
    id: 'rain', label: 'Rain coat',
    poses: {
      stand: 'assets/mascot_rain_stand.PNG',
      walk: 'assets/mascot_rain_walk.PNG',
      jump: 'assets/mascot_rain_jump.PNG',
      sleep: 'assets/mascot_rain_sleep.PNG',
    },
  },
  {
    id: 'summer', label: 'T-shirt',
    poses: {
      stand: 'assets/mascot_summer_stand.PNG',
      walk: 'assets/mascot_summer_walk.PNG',
      jump: 'assets/mascot_summer_jump.PNG',
      sleep: 'assets/mascot_summer_sleep.PNG',
    },
  },
];

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
  let mascotX = 0.66;            // fraction of width
  let targetX = 0.66;
  let facing = 1;                 // 1 = right, -1 = left
  let activity = 'idle';          // idle | walking | sleeping | jumping | waving
  let pending = null;             // what to do once the walk finishes
  let activityStart = 0;
  let walkPhase = 0;              // drives the bob, only advances while moving
  let changeOutfitAt = 0;         // when the pending wardrobe change lands (0 = none)
  let stepAt = 0;                 // next footstep sound

  let drops = [];
  let leaves = [];
  let clouds = [];
  let stars = [];
  let zzz = [];

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
  }

  /* ---- roof line, so rain lands on the house instead of inside it ---- */
  function roofYAt(x) {
    if (x < L.houseLeft || x > L.houseRight) return Infinity;
    const half = (L.houseRight - L.houseLeft) / 2;
    const d = Math.abs(x - L.houseMidX) / half;      // 0 at the peak, 1 at the eaves
    return lerp(L.roofPeak, L.wallTop, clamp01(d));
  }

  /* ---- interactions ---- */
  function say(word) { speech.speak(word, { interrupt: true }); }

  function walkTo(frac, then) {
    changeOutfitAt = 0;          // any pending wardrobe change is abandoned
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
      changeOutfitAt = activityStart + CONFIG.wardrobeOpenMs * CONFIG.outfitChangeAtFrac;
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

  function cycleOutfit() {
    wearOutfit((outfitIndex + 1) % OUTFITS.length);
    say(OUTFITS[outfitIndex].label);
  }

  // Resolves an upright pose to whatever art is actually available, so a
  // missing or still-loading file degrades to a sensible neighbour rather than
  // nothing. Deliberately excludes `sleep`, which is drawn lying down and would
  // look broken standing on the grass.
  function poseFor(kind) {
    return images[kind] || images.stand || images.walk || images.jump || null;
  }

  function cycleWeather() {
    const order = CONFIG.weather.order;
    weather = order[(order.indexOf(weather) + 1) % order.length];
    seedScenery();
    audio.pop();
    say(weather === 'sunny' ? 'Sunny!' : weather === 'rainy' ? 'Rain!' : 'Windy!');
  }

  function toggleNight() {
    night = !night;
    audio.chime();
    say(night ? 'Night time!' : 'Morning!');
  }

  function hit(px, py) {
    // Specific objects first; the sky is the catch-all underneath them.
    // Every box is generously padded: these are small pieces of furniture on a
    // phone screen, and a toddler aiming near one clearly means it.
    const pad = L.unit * 0.05;
    const inBox = (b) => px >= b.x - pad && px <= b.x + b.w + pad
                      && py >= b.y - pad && py <= b.y + b.h + pad;
    const m = mascotBox();
    if (inBox(m)) return 'mascot';
    if (Math.hypot(px - L.sunX, py - L.sunY) <= L.sunR * 1.8) return 'sun';
    if (inBox(L.bed)) return 'bed';
    if (inBox(L.wardrobe)) return 'wardrobe';
    // The trampoline is short, so it also claims the space above its mat —
    // that is where a child aiming at "the bouncy thing" will actually tap.
    if (px >= L.tram.x - pad && px <= L.tram.x + L.tram.w + pad
        && py >= L.tram.y - L.mascotH * 0.7 && py <= L.tram.y + L.tram.h + pad) {
      return 'trampoline';
    }
    if (py < L.horizonY) return 'sky';
    return 'ground';
  }

  function onPointerDown(e) {
    if (!alive || !L) return;
    if (L.portrait) return;        // the rotate screen is not interactive
    const r = canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    switch (hit(px, py)) {
      case 'sun': toggleNight(); break;
      case 'sky': cycleWeather(); break;
      case 'bed': walkTo(L.station.bed, 'sleeping'); break;
      case 'wardrobe': walkTo(L.station.wardrobe, 'wardrobe'); break;
      case 'trampoline': walkTo(L.station.trampoline, 'jumping'); break;
      case 'mascot':
        if (activity === 'sleeping') { activity = 'idle'; audio.pop(); }
        else { activity = 'waving'; activityStart = now(); audio.greet(); }
        break;
      default:
        // Tapping open ground wakes him and brings him back outside.
        if (activity === 'sleeping') { activity = 'idle'; audio.pop(); }
        else walkTo(L.station.home);
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

    // Timed activities return to idle on their own.
    if (activity === 'waving' && t - activityStart > CONFIG.waveMs) activity = 'idle';
    if (activity === 'wardrobe') {
      if (changeOutfitAt && t >= changeOutfitAt) { changeOutfitAt = 0; cycleOutfit(); }
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
      if (weather === 'rainy') g.globalAlpha = 0.45;
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
  }

  function drawHouse(t) {
    const c = CONFIG.colors;
    const left = L.houseLeft, right = L.houseRight;
    const w = right - left;

    // Interior: warm light at night so the house reads as somewhere to go.
    g.fillStyle = night ? c.interiorNight : c.interiorDay;
    g.fillRect(left, L.wallTop, w, L.groundY - L.wallTop);
    if (night) {
      const glow = g.createRadialGradient(L.houseMidX, L.wallTop + (L.groundY - L.wallTop) * 0.4,
        w * 0.05, L.houseMidX, L.wallTop + (L.groundY - L.wallTop) * 0.4, w * 0.8);
      glow.addColorStop(0, 'rgba(255,214,120,0.55)');
      glow.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = glow;
      g.fillRect(left, L.wallTop, w, L.groundY - L.wallTop);
    }

    // Floor
    g.fillStyle = c.floor;
    g.fillRect(left, L.groundY - (L.groundY - L.wallTop) * 0.07, w, (L.groundY - L.wallTop) * 0.07);

    drawBed();
    drawWardrobe(t);

    // Side walls, drawn after the contents so they frame the cutaway.
    const wallT = Math.max(5, L.unit * 0.022);
    g.fillStyle = night ? c.wallNight : c.wallDay;
    g.fillRect(left - wallT, L.wallTop, wallT, L.groundY - L.wallTop);
    g.fillRect(right, L.wallTop, wallT, L.groundY - L.wallTop);

    // Roof
    g.fillStyle = c.roof;
    g.beginPath();
    g.moveTo(left - wallT * 2.2, L.wallTop);
    g.lineTo(L.houseMidX, L.roofPeak);
    g.lineTo(right + wallT * 2.2, L.wallTop);
    g.closePath();
    g.fill();
    g.fillStyle = c.roofDark;
    g.beginPath();
    g.moveTo(left - wallT * 2.2, L.wallTop);
    g.lineTo(L.houseMidX, L.roofPeak);
    g.lineTo(L.houseMidX, L.roofPeak + wallT * 0.7);
    g.lineTo(left - wallT * 2.2, L.wallTop + wallT * 0.7);
    g.closePath();
    g.fill();
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
  }

  // Top of the trampoline mat: where a bouncing child's feet actually leave.
  // Matches the mat ellipse drawn in drawTrampoline: rimY + ry * 0.35.
  function matY() {
    return L.tram.y + L.tram.h * 0.37;
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
    drawHouse(t);
    drawMascot(t);
    drawRain();
    drawLeaves();

    raf = requestAnimationFrame(frame);
  }

  /* ---- boot ---- */
  resize();
  tryLockLandscape();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  wearOutfit(0);

  raf = requestAnimationFrame(frame);
  setReprompt(null);      // free play: never nag

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
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
