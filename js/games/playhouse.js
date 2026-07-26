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
  // The world is wider than the screen and the camera rests in one of two
  // places. Everything horizontal below is a fraction of WORLD width, not
  // screen width — which is also what stops object spacing drifting against
  // unit-based sizing, the bug that made the playpen and trampoline collide
  // on tablet.
  world: {
    // 1.42 rather than a rounder 1.5+: the world is exactly as wide as it
    // needs to be to hold the house, the cot, the bin, open grass and the
    // trampoline without either rest showing a band of nothing. Any wider and
    // the outdoor rest ends in empty sky.
    scale: 1.42,                 // world width, in screen widths
    camIndoor: 0.0,              // camera left edge, in screen widths
    // Chosen so the cot (world 0.39, i.e. 0.55 screen-widths in) sits a
    // comfortable 15% from the left edge and the house wall still shows as a
    // sliver — the child can see the room he just came out of.
    camOutdoor: 0.40,
    easeMs: 500,
  },

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
    houseLeftLandscape: 0.028,
    houseRightLandscape: 0.310,
    houseHeightFrac: 0.52,       // of unit (portrait)
    // Lowered from 0.62: with the roof peak on top the old value put the house
    // through 77% of the canvas height for two pieces of furniture.
    houseHeightFracLandscape: 0.56,
    roofPeakFrac: 0.15,          // of unit, above the wall top
    trampolineXPortrait: 0.855,
    trampolineXLandscape: 0.860,
    trampolineWidthFrac: 0.23,   // of unit (portrait)
    trampolineWidthFracLandscape: 0.31,
    // The sun is screen-anchored, not world-anchored: it is the day/night
    // control, so it must stay reachable from either camera rest.
    sunXPortrait: 0.82, sunYPortrait: 0.13,
    sunXLandscape: 0.86, sunYLandscape: 0.20,
    sunRadiusFrac: 0.075,        // of unit
  },

  mascot: {
    heightFrac: 0.34,            // of unit (portrait)
    heightFracLandscape: 0.40,
    minHeight: 104,
    maxHeight: 240,
    // Of WORLD width per second. Lowered from 0.55 when positions moved from
    // screen fractions to world fractions, so his on-screen pace is unchanged.
    walkSpeedFrac: 0.39,
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
    bedLandscape: 0.104, wardrobeLandscape: 0.240, trampolineLandscape: 0.788,
    playpenLandscape: 0.500, homeLandscape: 0.480,
  },

  // The playpen sits on the one genuinely empty patch of grass, between the
  // house wall (ends ~0.45) and the trampoline (starts ~0.73).
  playpen: {
    // At the threshold, under the eave — inside the indoor rest AND inside the
    // outdoor rest, so she is always on screen and never teleports.
    xPortrait: 0.62, xLandscape: 0.387,
    widthFracPortrait: 0.20, widthFracLandscape: 0.125,   // of WORLD width
    heightFrac: 0.17,                                      // of unit
  },

  // Toys are the one thing in this world the child moves directly, rather than
  // by asking the boy to. They lie loose on the grass rather than inside the
  // bin: a container is one more idea to understand, and spreading them along
  // the open yard is what makes each one a finger-sized target instead of a
  // 30px sliver of a shared shelf. The bin stays as the scenery that explains
  // why they are all in one place.
  toys: {
    // The row starts clear of where the boy stands and ends clear of the
    // trampoline: the first layout had him permanently covering the teddy.
    rowStart: 0.535,           // world fraction of the leftmost toy
    rowStep: 0.050,            // and the gap to the next
    heightFrac: 0.105,         // of unit
    binX: 0.610, binHeightFrac: 0.15,
    // One bush only. The second sat between the cot and the toy row, which is
    // exactly where the boy walks, and read as clutter rather than scenery.
    bushLargeX: 0.962, bushLargeHeightFrac: 0.21,
    // Drop leniency. Deliberately large: a toddler dragging with a whole
    // fingertip is aiming at a person, not at a pixel.
    snapBabyFrac: 0.24,        // of unit
    snapBoyFrac: 0.19,
    tapSlopFrac: 0.035,        // movement below this counts as a tap, not a drag
    // Measured against the carry pose's hands, not guessed. 0.62 put the toy
    // squarely over his face.
    carryFrac: 0.46,           // height up the boy where a carried toy rides
    giveMs: 900,               // kneeling, before the toy changes hands
    givePoseScale: 0.84,       // the kneeling art is genuinely shorter
    // How long the boy waits, doing nothing, before he goes and does it
    // himself. Long enough that he never races the child to a toy, short
    // enough that a child who has not worked out what to do gets shown.
    modelDelayMs: 7000,
  },

  baby: {
    heightFrac: 0.58,          // of the boy's drawn height
    bobHz: 0.6,
    happyMs: 1600,
    // Idle wandering: sits still for a while, crawls a little, sits again.
    sitMinMs: 6000, sitMaxMs: 10000,
    crawlMs: 2200,
    crawlRangeFrac: 0.26,      // of playpen width, either side of centre
    // She drifts through moods and signals them with her body rather than with
    // any kind of prompt. There is no timer she can lose and no wrong answer:
    // a mood is a reason to give her something, never a demand.
    contentMs: 14000,
    wantsMs: 22000,
    sleepyMs: 26000,
  },

  // heightFrac was 0.55 — more than half his own body above the mat, which
  // reads as flight rather than as a bounce. A real toddler on a real
  // trampoline clears a fraction of that.
  jump: { count: 3, heightFrac: 0.30, durationMs: 620 },
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
  // A "Play Together" moment: fades in, holds long enough to actually look
  // at, fades out and clears itself — nothing to tap, nothing to get wrong.
  moment: {
    openMs: 320,
    holdMs: 1900,
    closeMs: 380,
    // Much darker than the wardrobe picker's scrim: the world behind it
    // includes the boy still finishing his walk toward the pen, and a
    // half-see-through scrim let him (and the baby's own in-pen sprite) show
    // through, doubling up oddly against the illustration of the same two
    // characters. Near-opaque hides that completely.
    scrimAlpha: 0.94,
    maxWidthFrac: 0.55,           // of canvas width, contain-fit within this box
    maxHeightFrac: 0.80,          // of canvas height
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
      carry: 'assets/mascot_winter_carry.PNG',
      give: 'assets/mascot_winter_give.PNG',
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
      carry: 'assets/mascot_rain_carry.PNG',
      give: 'assets/mascot_rain_give.PNG',
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
      carry: 'assets/mascot_summer_carry.PNG',
      give: 'assets/mascot_summer_give.PNG',
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
  // From the second sheet: reactions rather than idle states.
  reach: 'assets/baby_reach.PNG',
  hugteddy: 'assets/baby_hugteddy.PNG',
  sleepy: 'assets/baby_sleepy.PNG',
  content: 'assets/baby_content.PNG',
};

/* ---------------- toys and props ----------------
   Five toys, each one a thing the child picks up with a finger and gives to
   somebody. The word and the sound are what the giving *means* — they play
   when a toy changes hands, never when it is merely touched, so the reward is
   attached to the generous act rather than to the poking. */

const TOYS = [
  { id: 'teddy', file: 'assets/toy_teddy.PNG', word: 'Teddy!', sound: a => a.gentleGift() },
  { id: 'ball', file: 'assets/toy_ball.PNG', word: 'Ball!', sound: a => a.boing() },
  { id: 'duck', file: 'assets/toy_duck.PNG', word: 'Duck!', sound: a => a.quack() },
  { id: 'rattle', file: 'assets/toy_rattle.PNG', word: 'Rattle!', sound: a => a.rattleShake() },
  { id: 'blanket', file: 'assets/toy_blanket.PNG', word: 'Cosy!', sound: a => a.chime() },
];

const PROPS = {
  bin: 'assets/prop_bin_open.PNG',
  bushLarge: 'assets/prop_bush_large.PNG',
};

/* ---------------- "Play Together" moments ----------------
   Ten composite illustrations of the two of them playing, sliced from a 3x3
   grid plus one standalone image. Unlike every other pose in this file, each
   one shows both children together at a fixed relative pose — there is no
   independent boy-sprite/baby-sprite positioning to be done, so these are
   used whole, as a big illustrated moment that appears over the sandbox,
   plays a sound and a one-word cue, and fades back on its own. Triggered by
   tapping the playpen; cycled through in shuffled order so all ten are seen
   before any repeats. */

const MOMENTS = [
  { id: 'teddy', file: 'assets/moment_teddy.PNG', cue: 'Share!', sound: a => a.gentleGift() },
  { id: 'crawl', file: 'assets/moment_crawl.PNG', cue: 'Crawl!', sound: a => { a.footstep(); setTimeout(() => a.footstep(), 140); } },
  { id: 'hug', file: 'assets/moment_hug.PNG', cue: 'Cuddle!', sound: a => a.chime() },
  { id: 'rattle', file: 'assets/moment_rattle.PNG', cue: 'Shake!', sound: a => a.rattleShake() },
  { id: 'peekaboo', file: 'assets/moment_peekaboo.PNG', cue: 'Peekaboo!', sound: a => { a.pop(); setTimeout(() => a.chime(), 160); } },
  { id: 'clap', file: 'assets/moment_clap.PNG', cue: 'Clap!', sound: a => a.clapClap() },
  { id: 'duck', file: 'assets/moment_duck.PNG', cue: 'Duck!', sound: a => a.quack() },
  { id: 'bubbles', file: 'assets/moment_bubbles.PNG', cue: 'Bubbles!', sound: a => a.shimmer(783.99) },
  { id: 'ride', file: 'assets/moment_ride.PNG', cue: 'Ride!', sound: a => a.whoosh() },
  { id: 'lift', file: 'assets/moment_lift.PNG', cue: 'Up!', sound: a => { a.boing(); setTimeout(() => a.chime(), 180); } },
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
  let mascotX = 0.66;            // fraction of width; seeded properly in layout()
  let targetX = 0.66;
  let placed = false;             // has his opening position been set yet
  let facing = 1;                 // 1 = right, -1 = left
  let activity = 'idle';          // idle | walking | sleeping | jumping | waving | magic
  let pending = null;             // what to do once the walk finishes
  let activityStart = 0;
  let walkPhase = 0;              // drives the bob, only advances while moving
  let openPickerAt = 0;           // when the wardrobe finishes opening (0 = none)
  let camX = 0;                   // camera left edge, world pixels
  let camTarget = 0;              // where it is easing to
  let camFrom = 0;                // where the current ease started
  let camAt = 0;                  // when the current ease started (0 = settled)
  let baby = {};                  // pose id -> image, empty until loaded
  let babyPose = 'sit';           // sit | crawl | happy  (sleep is derived from night)
  let babyUntil = 0;              // when the current baby pose gives way
  let babyX = 0.5;                // position across the pen, 0..1
  let babyTargetX = 0.5;
  let babyFacing = 1;
  let mood = 'content';           // content | wants | sleepy
  let moodAt = 0;                 // when it next drifts (0 = not yet scheduled)
  let tucked = false;             // she has her blanket and has settled down
  let idleSince = 0;              // how long the boy has had nothing to do
  let modelling = false;          // ...and is now fetching something himself
  let bounceIndex = -1;           // which bounce of the current jump he is on
  let landedAt = 0;               // when he last hit the mat, for the puff
  // Toys. `owner` is the whole model: 'ground' (lying where it was left),
  // 'boy' (being carried), 'baby' (hers, and she keeps it), or 'hand' (under
  // the child's finger right now). x is a world fraction; lift is how far off
  // the ground it currently is, in pixels.
  let toyImages = {};
  let props = {};
  let toys = [];
  let drag = null;                // { toy, grabX, grabY, moved } while a finger is down
  let held = null;                // the toy the boy is carrying, or null
  let fetchToy = null;            // the toy he is walking over to pick up
  let giveAt = 0;                 // when the kneeling offer completes (0 = none)
  let picker = null;              // { openedAt } while the child is choosing
  let cards = {};                 // outfit id -> garment image (or missing)
  let moments = {};                // moment id -> illustration (or missing)
  let momentBag = [];              // shuffled ids still to show before a repeat
  let moment = null;                // { id, openedAt } while a moment is on screen
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
    // In portrait the rotate gate covers the screen, so the world collapses to
    // one screen width and the camera is irrelevant.
    const worldW = portrait ? w : w * CONFIG.world.scale;
    const groundY = h * (portrait ? cfg.groundLineYPortrait : cfg.groundLineYLandscape);
    const houseLeft = worldW * (portrait ? cfg.houseLeftPortrait : cfg.houseLeftLandscape);
    const houseRight = worldW * (portrait ? cfg.houseRightPortrait : cfg.houseRightLandscape);
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
    const tramX = worldW * (portrait ? cfg.trampolineXPortrait : cfg.trampolineXLandscape);

    L = {
      w, h, unit, portrait, worldW,
      maxCam: Math.max(0, worldW - w),
      horizonY: h * (portrait ? cfg.horizonYPortrait : cfg.horizonYLandscape),
      groundY,
      houseLeft, houseRight, wallTop, roofPeak,
      houseMidX: (houseLeft + houseRight) / 2,
      mascotH, mascotW: mascotH * aspect,
      tramX, tramW, tramH: tramW * 0.62,
      sunX: w * (portrait ? cfg.sunXPortrait : cfg.sunXLandscape),   // screen space
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

    const penW = worldW * (portrait ? CONFIG.playpen.widthFracPortrait : CONFIG.playpen.widthFracLandscape);
    const penH = unit * CONFIG.playpen.heightFrac;
    const penCx = worldW * (portrait ? CONFIG.playpen.xPortrait : CONFIG.playpen.xLandscape);
    L.pen = { x: penCx - penW / 2, y: groundY - penH, w: penW, h: penH };
    L.babyH = mascotH * CONFIG.baby.heightFrac;

    const tcfg = CONFIG.toys;
    L.toyH = unit * tcfg.heightFrac;
    L.binH = unit * tcfg.binHeightFrac;
    L.binX = worldW * tcfg.binX;
    L.bushes = [
      { key: 'bushLarge', x: worldW * tcfg.bushLargeX, h: unit * tcfg.bushLargeHeightFrac },
    ];
    // Seeded once, then left alone: a resize must never sweep toys the child
    // has already given away back into their opening row.
    if (!toys.length) {
      toys = TOYS.map((t, i) => ({
        id: t.id, owner: 'ground', lift: 0,
        x: tcfg.rowStart + i * tcfg.rowStep,
      }));
    }

    // Open beside the playpen rather than at a hard-coded fraction, which
    // otherwise leaves him standing inside it.
    if (!placed) {
      mascotX = targetX = L.station.home;
      // Open on the outdoor rest: that is where the yard, the cot and the
      // trampoline are, and where he starts.
      camX = camTarget = camRest('outdoor');
      placed = true;
    }
    // Re-clamp after a resize, so a rotation can never leave the camera
    // outside the new world bounds.
    camX = Math.min(camX, L.maxCam);
    camTarget = Math.min(camTarget, L.maxCam);

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
  // speech.speak() is a permanent no-op app-wide (how every other game's
  // descriptive narration was silenced); speech.speakWord() is the one real
  // channel, reserved for essential single-word cues. Weather words and these
  // moment cues are exactly that, so this calls the real one.
  /* ---- camera ----
     Two rest positions, and no control the child has to learn: the camera
     moves because of what they just did, never because they asked it to.
     A toddler does not navigate, so nothing here is a door or a swipe. */

  function camRest(which) {
    if (L.portrait) return 0;
    const c = CONFIG.world;
    return Math.min(L.maxCam, (which === 'indoor' ? c.camIndoor : c.camOutdoor) * L.w);
  }

  function lookAt(which) {
    const to = camRest(which);
    if (Math.abs(to - camTarget) < 1) return;
    camFrom = camX;
    camTarget = to;
    camAt = now();
  }

  // Which rest a world x belongs to, so an interaction can pull the camera
  // toward whatever it just touched.
  function restFor(worldX) {
    return worldX < L.houseRight + (L.pen ? L.pen.w : 0) ? 'indoor' : 'outdoor';
  }

  function updateCamera(t) {
    if (!camAt) { camX = camTarget; return; }
    const p = clamp01((t - camAt) / CONFIG.world.easeMs);
    camX = camFrom + (camTarget - camFrom) * easeInOutCubic(p);
    if (p >= 1) { camX = camTarget; camAt = 0; }
  }

  function say(word) { speech.speakWord(word, { interrupt: true }); }

  const WALK_MIN = 0.06, WALK_MAX = 0.94;

  function walkTo(frac, then) {
    openPickerAt = 0;            // any pending wardrobe opening is abandoned
    giveAt = 0;                  // and any offer that had not yet completed
    targetX = Math.max(WALK_MIN, Math.min(WALK_MAX, frac));
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
    if (next === 'pickup') {
      activity = 'idle';
      if (fetchToy) { boyTakes(fetchToy); fetchToy = null; }
      // Fetching it was only half of what he set out to do.
      if (modelling) { modelling = false; giveHeldToBaby(); return; }
    }
    // Kneeling to offer it. The toy changes hands partway through, not on
    // arrival, so the child sees the offer before the taking. He turns to face
    // her first: walking there set his facing from the direction of travel,
    // which had him kneeling and holding the toy out into empty grass.
    if (next === 'giving') {
      giveAt = activityStart + CONFIG.toys.giveMs * 0.55;
      facing = (L.pen.x + L.pen.w / 2) < mascotX * L.worldW ? -1 : 1;
    }
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

  // Her arms come up as a toy nears her — proximity, not a trigger. It is the
  // only feedback in the game that happens *during* a gesture rather than
  // after it, and it is what tells a child mid-drag that this is going to work.
  function babyReaching() {
    if (!drag || night || !L.pen) return false;
    const a = toyAnchor(drag.toy);
    const cx = L.pen.x + L.pen.w * (0.16 + babyX * 0.68);
    const cy = L.pen.y + L.pen.h * 0.55;
    return Math.hypot(a.x - cx, a.y - cy) <= L.unit * CONFIG.toys.snapBabyFrac * 1.7;
  }

  function babyImage() {
    if (tucked && babyPose !== 'happy') return baby.sleep || baby.sleepy || baby.sit || null;
    if (night && babyPose !== 'happy') return baby.sleep || baby.sit || null;
    if (babyReaching() && baby.reach) return baby.reach;
    // A mood is worn, not announced. Wanting is a reach toward the toys;
    // sleepy is rubbing her eyes. Neither is a prompt and neither expires.
    if (babyPose !== 'happy' && babyPose !== 'crawl') {
      if (mood === 'wants' && baby.reach) return baby.reach;
      if (mood === 'sleepy' && baby.sleepy) return baby.sleepy;
    }
    // What she has been given changes how she sits. The teddy has its own
    // hugging pose, and anything else settles her into the content one — so a
    // gift visibly leaves her different from how she was before it, which is
    // the entire reward for giving.
    if (babyPose === 'sit' && toys.length) {
      const owned = babyToys();
      if (owned.some(t => t.id === 'teddy') && baby.hugteddy) return baby.hugteddy;
      if (owned.length && baby.content) return baby.content;
    }
    return baby[babyPose] || baby.sit || null;
  }

  // Delighted to be noticed. Also wakes her at night, which is the one bit of
  // mischief the game allows.
  function delightBaby() {
    babyPose = 'happy';
    babyUntil = now() + CONFIG.baby.happyMs;
    audio.babble();
  }

  /* ---- toys ----
     The one part of this world the child's finger touches directly. Everything
     else is a request the boy carries out; a toy is a thing you actually pick
     up and hand to somebody. That is the whole point: the finger becomes the
     third character, and giving is the verb. */

  const toyEntry = id => TOYS.find(t => t.id === id);
  const babyToys = () => toys.filter(t => t.owner === 'baby');

  function toySize(toy) {
    const img = toyImages[toy.id];
    const h = L.toyH;
    const w = img && img.naturalHeight ? h * (img.naturalWidth / img.naturalHeight) : h;
    return { w, h };
  }

  // Centre of a toy in world pixels, derived from whoever owns it rather than
  // stored — so a toy she is holding follows her when she crawls, and one he
  // is carrying follows him when he walks, with no bookkeeping either side.
  function toyAnchor(toy) {
    const s = toySize(toy);
    if (toy.owner === 'boy') {
      return {
        x: mascotX * L.worldW + facing * L.mascotW * 0.12,
        y: L.groundY - L.mascotH * CONFIG.toys.carryFrac,
      };
    }
    if (toy.owner === 'baby') {
      // Fanned along the mat in front of her, so a second and third gift are
      // visibly still there rather than replacing the first.
      const owned = babyToys();
      const i = Math.max(0, owned.indexOf(toy));
      const n = Math.max(1, owned.length);
      const step = Math.min(s.w * 0.9, (L.pen.w * 0.62) / n);
      const cx = L.pen.x + L.pen.w * (0.16 + babyX * 0.68);
      return { x: cx + (i - (n - 1) / 2) * step, y: L.pen.y + L.pen.h * 0.86 - s.h / 2 };
    }
    return { x: toy.x * L.worldW, y: L.groundY - s.h / 2 - toy.lift };
  }

  // Generously padded, and hers are excluded on purpose: once a toy has been
  // given away it is the baby's, and taking it back is not a move this game
  // offers.
  function hitToy(px, py) {
    const pad = L.unit * 0.045;
    let best = null, bestD = Infinity;
    for (const toy of toys) {
      if (toy.owner === 'baby') continue;
      const a = toyAnchor(toy), s = toySize(toy);
      if (px < a.x - s.w / 2 - pad || px > a.x + s.w / 2 + pad) continue;
      if (py < a.y - s.h / 2 - pad || py > a.y + s.h / 2 + pad) continue;
      const d = Math.hypot(px - a.x, py - a.y);
      if (d < bestD) { bestD = d; best = toy; }
    }
    return best;
  }

  function babyTakes(toy) {
    toy.owner = 'baby';
    toy.lift = 0;
    const entry = toyEntry(toy.id);
    if (entry) { entry.sound(audio); say(entry.word); }

    // Everything is received warmly — there is no wrong gift. But answering
    // what she was actually asking for is *more* than warm, and that gap
    // between fine and wonderful is the whole motivation engine.
    const answered = mood === 'sleepy' ? toy.id === 'blanket' : mood === 'wants';
    if (mood === 'sleepy' && toy.id === 'blanket') {
      // The blanket is why sleepy exists as a mood at all: without it, sleepy
      // would be a want with no possible response. Covering her up is also the
      // most genuinely big-brotherly thing on offer here.
      tucked = true;
    } else {
      tucked = false;
      babyPose = 'happy';
      babyUntil = now() + CONFIG.baby.happyMs;
    }
    if (answered) setTimeout(() => { if (alive) audio.chime(); }, 260);
    mood = 'content';
    moodAt = now() + CONFIG.baby.contentMs;
  }

  // Content for a while, then wanting something, then sleepy. Nothing here is
  // a countdown: a mood she is left in simply carries on, and the world stays
  // exactly as safe as it was.
  function updateMood(t) {
    if (night) { moodAt = 0; return; }        // moods resume in the morning
    if (!moodAt) { moodAt = t + CONFIG.baby.contentMs; return; }
    if (t < moodAt) return;
    const cfg = CONFIG.baby;
    if (mood === 'content') {
      mood = 'wants';
      moodAt = t + cfg.wantsMs;
      audio.babble();
    } else if (mood === 'wants') {
      mood = 'sleepy';
      moodAt = t + cfg.sleepyMs;
    } else {
      // Nobody answered, and that is allowed. She perks up again by herself.
      mood = 'content';
      tucked = false;
      moodAt = t + cfg.contentMs;
    }
  }

  // Demonstration, then the chance to imitate — which is how a toddler learns
  // anything. When the child has left him alone long enough and his sister
  // wants something, he goes and does it himself, through exactly the same
  // code path a tap would have used.
  function maybeModel(t) {
    const busy = activity !== 'idle' || held || drag || picker || moment
      || night || fetchToy || L.portrait;
    if (busy || mood === 'content') { if (busy) idleSince = 0; return; }
    if (!idleSince) { idleSince = t; return; }
    if (t - idleSince < CONFIG.toys.modelDelayMs) return;
    idleSince = t;                            // re-arm either way
    // Sleepy has one right answer; wanting has five.
    const loose = toys.filter(x => x.owner === 'ground');
    if (!loose.length) return;
    const toy = (mood === 'sleepy' && loose.find(x => x.id === 'blanket')) || loose[0];
    modelling = true;
    tapToy(toy);
  }

  function boyTakes(toy) {
    // He has one pair of hands. Whatever he was already carrying goes down
    // where he stands rather than silently vanishing.
    if (held && held !== toy) {
      held.owner = 'ground';
      held.lift = 0;
      held.x = clamp01(mascotX + 0.02);
    }
    toy.owner = 'boy';
    toy.lift = 0;
    held = toy;
    audio.pop();
  }

  function dropToy(toy) {
    const cfg = CONFIG.toys;
    const a = toyAnchor(toy);          // measured before it settles
    toy.owner = 'ground';
    toy.lift = 0;

    const babyPt = {
      x: L.pen.x + L.pen.w * (0.16 + babyX * 0.68),
      y: L.pen.y + L.pen.h * 0.55,
    };
    if (Math.hypot(a.x - babyPt.x, a.y - babyPt.y) <= L.unit * cfg.snapBabyFrac) {
      babyTakes(toy);
      return;
    }
    if (activity !== 'sleeping') {
      const boyPt = { x: mascotX * L.worldW, y: L.groundY - L.mascotH * 0.5 };
      if (Math.hypot(a.x - boyPt.x, a.y - boyPt.y) <= L.unit * cfg.snapBoyFrac) {
        boyTakes(toy);
        return;
      }
    }
    // Anywhere else it simply stays where it was put. There is no wrong place.
    toy.x = Math.max(0.02, Math.min(0.98, a.x / L.worldW));
    audio.pop();
  }

  // A tap rather than a drag: the boy goes and fetches it, which is the same
  // journey the child could have made with a finger and teaches that the two
  // are interchangeable.
  function tapToy(toy) {
    if (toy.owner === 'boy') { giveHeldToBaby(); return; }
    toy.owner = 'ground';
    toy.lift = 0;
    fetchToy = toy;
    lookAt(restFor(toy.x * L.worldW));
    walkTo(toy.x, 'pickup');
  }

  function giveHeldToBaby() {
    if (!held) return;
    lookAt(restFor(L.station.playpen * L.worldW));
    walkTo(L.station.playpen, 'giving');
  }

  /* ---- "Play Together" moments ---- */

  // A shuffle bag rather than plain random: guarantees every one of the ten
  // is seen once before any of them repeats, instead of the same handful
  // showing up again and again by chance.
  function nextMomentId() {
    if (!momentBag.length) {
      momentBag = MOMENTS.map(m => m.id);
      for (let i = momentBag.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [momentBag[i], momentBag[j]] = [momentBag[j], momentBag[i]];
      }
    }
    return momentBag.pop();
  }

  // Opens immediately on the pen tap, rather than waiting for the walk-over
  // to finish: the illustration already shows the two of them together up
  // close, so waiting would just mean he visibly walks over in the
  // background while a static picture of the same thing plays in front.
  function showMoment() {
    const id = nextMomentId();
    const entry = MOMENTS.find(m => m.id === id);
    moment = { id, openedAt: now() };
    entry.sound(audio);
    say(entry.cue);
  }

  function updateBaby(dt, t) {
    if (night && babyPose !== 'happy') return;      // asleep: no wandering
    // While she is signalling something, she stays put and signals it. Idle
    // wandering on top of a mood pose just made the mood unreadable.
    if ((mood !== 'content' || tucked) && babyPose !== 'happy') {
      if (babyPose === 'crawl') babyPose = 'sit';
      return;
    }
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

  function hit(px, py, sx) {
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
    if (Math.hypot(sx - L.sunX, py - L.sunY) <= L.sunR * 1.8) return 'sun';
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
    // The child acting is always the point. Anything he was about to do off
    // his own bat waits until they have gone quiet again.
    idleSince = 0;
    modelling = false;

    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left, py = e.clientY - r.top;
    const px = sx + camX;          // world space; sx stays screen space

    // While the wardrobe is open it takes every tap: a card is a choice,
    // anywhere else closes without changing anything. Nothing in the world
    // behind it can be triggered by accident.
    if (picker) {
      const i = pickerHit(px, py);
      if (i >= 0) choose(i);
      else closePicker();
      return;
    }

    // A moment is a beat to watch, not a choice to make — it clears itself,
    // and nothing else can trigger underneath it while it's showing.
    if (moment) return;

    // Asleep, every tap simply wakes him. A child who wants him up should not
    // have to find him under the covers to do it.
    if (activity === 'sleeping') {
      activity = 'idle';
      audio.pop();
      return;
    }

    // Toys are tested before everything else, and are the only thing here that
    // can begin a drag. A toy lying at the boy's feet must belong to the
    // finger, not to the furniture behind it.
    const grabbed = hitToy(px, py);
    if (grabbed) {
      const a = toyAnchor(grabbed);
      const wasHeld = grabbed === held;
      if (wasHeld) held = null;
      fetchToy = null;
      grabbed.owner = 'hand';
      drag = { toy: grabbed, ox: px, oy: py, dx: a.x - px, dy: a.y - py, moved: false, wasHeld };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not fatal */ }
      return;
    }

    switch (hit(px, py, sx)) {
      case 'sun': toggleNight(); break;
      case 'sky': cycleWeather(); break;
      case 'bed': lookAt('indoor'); walkTo(L.station.bed, 'sleeping'); break;
      case 'wardrobe': lookAt('indoor'); walkTo(L.station.wardrobe, 'wardrobe'); break;
      case 'trampoline': lookAt('outdoor'); walkTo(L.station.trampoline, 'jumping'); break;
      case 'playpen':
        // The cot straddles the threshold, so looking at it works from either
        // side; keep whichever rest the child is already in.
        // Carrying something turns the tap into an errand: this is the second
        // route to giving, for a child who would rather point than drag.
        if (held) { giveHeldToBaby(); break; }
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
        // Tapping open ground brings him there, and the camera follows to
        // whichever half of the world was touched.
        lookAt(restFor(px));
        walkTo(clamp01(px / L.worldW));
    }
  }
  function onPointerMove(e) {
    if (!drag || !L) return;
    const r = canvas.getBoundingClientRect();
    const sx = e.clientX - r.left, py = e.clientY - r.top;
    const px = sx + camX;
    if (!drag.moved
        && Math.hypot(px - drag.ox, py - drag.oy) > L.unit * CONFIG.toys.tapSlopFrac) {
      drag.moved = true;
    }
    const s = toySize(drag.toy);
    drag.toy.x = (px + drag.dx) / L.worldW;
    drag.toy.lift = Math.max(0, L.groundY - (py + drag.dy) - s.h / 2);
    // Carrying a toy toward an edge of the screen brings the rest of the world
    // into view — the one time the camera moves during a gesture rather than
    // after it, because otherwise a toy can be dragged somewhere unreachable.
    // Only at the genuine edge. An earlier 16% trigger fired while the child
    // was dragging toward the cot, which is already on screen near the left of
    // the outdoor rest — so aiming at the baby scrolled the baby away.
    if (sx < L.w * 0.06) lookAt('indoor');
    else if (sx > L.w * 0.94) lookAt('outdoor');
  }

  function onPointerUp() {
    if (!drag) return;
    const { toy, moved, wasHeld } = drag;
    drag = null;
    if (moved) { dropToy(toy); return; }
    // A tap, not a drag. Tapping what he is already carrying is the request to
    // hand it over; tapping a toy on the grass sends him to fetch it.
    toy.lift = 0;
    if (wasHeld) { toy.owner = 'boy'; held = toy; giveHeldToBaby(); }
    else { toy.owner = 'ground'; tapToy(toy); }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  // A cancelled pointer (a phone call, a second finger, the browser taking
  // over) must still put the toy down. Losing one mid-air would leave it
  // hovering forever with nothing able to grab it.
  canvas.addEventListener('pointercancel', onPointerUp);

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

    updateCamera(t);
    updateMood(t);
    updateBaby(dt, t);
    maybeModel(t);

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
    // Each landing gets its own boing, its own puff, and — the point of the
    // whole trampoline — a laugh from his sister. This reframes bouncing from
    // "a thing to make him do" into "how you make her laugh".
    if (activity === 'jumping') {
      const n = Math.floor((t - activityStart) / CONFIG.jump.durationMs);
      if (n !== bounceIndex) {
        bounceIndex = n;
        landedAt = t;
        if (n > 0) audio.boing();
        if (!night) {
          babyPose = 'happy';
          babyUntil = t + CONFIG.baby.happyMs;
          babyFacing = 1;                 // she turns to watch him
          audio.giggle();
        }
      }
    }
    if (activity === 'jumping' && t - activityStart > CONFIG.jump.count * CONFIG.jump.durationMs) {
      activity = 'idle';
      bounceIndex = -1;
    }
    if (activity === 'giving') {
      if (giveAt && t >= giveAt) {
        giveAt = 0;
        if (held) { const toy = held; held = null; babyTakes(toy); }
      }
      if (t - activityStart > CONFIG.toys.giveMs) activity = 'idle';
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
        drops.push({ x: Math.random() * L.worldW, y: Math.random() * -L.h, v: 0.8 + Math.random() * 0.5 });
      }
      const fall = CONFIG.weather.rainSpeedFrac * L.h * dt;
      for (const d of drops) {
        d.y += fall * d.v;
        // Rain stops at the roof: that is the whole point of the house.
        const roof = roofYAt(d.x);
        if (d.y >= Math.min(roof, L.groundY)) {
          d.y = Math.random() * -L.h * 0.4;
          d.x = Math.random() * L.worldW;
        }
      }
    } else if (drops.length) {
      drops = [];
    }

    // Snow: falls slowly, wanders sideways, and settles on what it lands on.
    if (weather === 'snowy') {
      while (flakes.length < CONFIG.weather.snowFlakes) {
        flakes.push({
          x: Math.random() * L.worldW, y: Math.random() * -L.h,
          v: 0.6 + Math.random() * 0.8,
          r: L.unit * (0.004 + Math.random() * 0.007),
          wob: Math.random() * Math.PI * 2,
        });
      }
      const fall = CONFIG.weather.snowSpeedFrac * L.h * dt;
      for (const f of flakes) {
        f.y += fall * f.v;
        f.wob += dt * 1.4;
        f.x += Math.sin(f.wob) * CONFIG.weather.snowDriftFrac * L.worldW * dt;
        // Like rain, snow stops at the roof rather than falling through it.
        const roof = roofYAt(f.x);
        if (f.y >= Math.min(roof, L.groundY)) {
          f.y = Math.random() * -L.h * 0.3;
          f.x = Math.random() * L.worldW;
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
    g.fillRect(0, 0, L.worldW, L.horizonY + 1);

    if (night) {
      for (const s of stars) {
        const a = 0.45 + 0.55 * Math.abs(Math.sin(t / 900 + s.tw));
        g.globalAlpha = a;
        g.fillStyle = CONFIG.colors.star;
        g.beginPath();
        g.arc(s.x * L.worldW, s.y * L.horizonY, s.r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
    // The sun/moon is drawn later, in screen space, so it stays reachable
    // from either camera rest.
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
    const x = c.x * L.worldW, y = c.y * L.horizonY, s = c.s * L.unit * 0.07;
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
    g.fillRect(0, L.horizonY, L.worldW, L.h - L.horizonY);
    // A soft band of lighter grass at the horizon gives the ground some depth.
    const grad = g.createLinearGradient(0, L.horizonY, 0, L.groundY);
    grad.addColorStop(0, night ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.28)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, L.horizonY, L.worldW, L.groundY - L.horizonY);
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
      const x = (i / bumps) * L.worldW;
      const wave = Math.sin(i * 1.7) * L.unit * 0.012 * snowDepth;
      g.lineTo(x, topY + wave);
    }
    g.lineTo(L.worldW, L.h);
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

    contactShadow(x, pen.y + pen.h * 0.92, drawW * 0.72, 0.16);
    g.save();
    g.translate(x, y);
    if (babyFacing < 0) g.scale(-1, 1);
    g.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
    g.restore();

    if (asleep) drawBabyZzz(t, x, y - drawH);
  }

  /* ---- toys and the props around them ---- */

  // A soft ellipse under anything standing on the grass. Cheap, and the single
  // biggest thing separating a sprite that sits in the world from one that
  // floats above a photograph of it.
  function contactShadow(x, y, w, alpha) {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = night ? '#1c2b3a' : '#4e7a4e';
    g.beginPath();
    g.ellipse(x, y, w * 0.5, w * 0.16, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawProp(key, x, h) {
    const img = props[key];
    if (!img || !img.naturalHeight) return;
    const w = h * (img.naturalWidth / img.naturalHeight);
    contactShadow(x, L.groundY, w * 0.8, 0.14);
    g.drawImage(img, x - w / 2, L.groundY - h, w, h);
  }

  function drawScenery() {
    for (const bush of L.bushes) drawProp(bush.key, bush.x, bush.h);
    drawProp('bin', L.binX, L.binH);
  }

  function drawToy(toy, shadow) {
    const img = toyImages[toy.id];
    if (!img) return;
    const a = toyAnchor(toy), s = toySize(toy);
    if (shadow) {
      // The shadow stays on the ground and shrinks as the toy is lifted, which
      // is what makes a dragged toy read as held up rather than slid along.
      const k = 1 / (1 + toy.lift / (L.unit * 0.35));
      contactShadow(a.x, L.groundY, s.w * 0.85 * k, 0.20 * k);
    }
    g.drawImage(img, a.x - s.w / 2, a.y - s.h / 2, s.w, s.h);
  }

  // Loose on the grass, behind whoever is walking past them.
  function drawLooseToys() {
    for (const toy of toys) if (toy.owner === 'ground') drawToy(toy, true);
  }

  function drawCarriedToy() {
    if (held) drawToy(held, false);
  }

  function drawBabyToys() {
    // The teddy is baked into her hugging pose, so drawing it again would give
    // her two of them.
    const hugging = babyImage() === baby.hugteddy;
    for (const toy of babyToys()) {
      if (hugging && toy.id === 'teddy') continue;
      // Tucked in, the blanket stops being a folded thing beside her and
      // becomes a thing over her — which is the only visible difference
      // between owning it and being covered by it.
      if (tucked && toy.id === 'blanket') { drawBlanketOver(); continue; }
      drawToy(toy, false);
    }
  }

  function drawBlanketOver() {
    const img = toyImages.blanket;
    if (!img || !img.naturalHeight) return;
    const w = L.babyH * 1.15;
    const h = w * (img.naturalHeight / img.naturalWidth);
    const cx = L.pen.x + L.pen.w * (0.16 + babyX * 0.68);
    g.drawImage(img, cx - w / 2, L.pen.y + L.pen.h * 0.9 - h, w, h);
  }

  function drawDraggedToy() {
    if (drag) drawToy(drag.toy, true);
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
    const x = bodyX();
    let y = L.groundY;
    if (activity === 'jumping') y = matY() - jumpOffset(now());
    return { x: x - L.mascotW / 2, y: y - L.mascotH, w: L.mascotW, h: L.mascotH };
  }

  // Bouncing happens on the mat, not wherever the walk happened to stop. The
  // station is beside the trampoline so he steps up onto it rather than
  // standing through the middle of it while idle.
  function bodyX() {
    return activity === 'jumping' ? L.tram.x + L.tram.w / 2 : mascotX * L.worldW;
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
    // Carrying overrides the neutral poses but not the ones that are about
    // something else: he keeps bouncing on the trampoline with the toy in hand.
    if (held && (activity === 'idle' || activity === 'walking')) {
      img = images.carry || img;
    }
    if (activity === 'giving') img = poseFor('give');
    if (!img) return;

    // Every pose is framed differently inside its file — some fill it, some
    // leave a wide margin — so scale by the boy himself, not by the PNG. That
    // keeps him the same size and standing on the same line in every pose.
    const bb = boundsOf(img);
    // Kneeling really is shorter than standing — measured at 0.84x off the
    // sliced sheet — and normalising every pose to one height would have stood
    // him back up again.
    const h = L.mascotH * (activity === 'giving' ? CONFIG.toys.givePoseScale : 1);
    const drawH = h / (bb.y1 - bb.y0);
    const drawW = drawH * (img.naturalWidth / img.naturalHeight);

    let x = bodyX();
    let y = L.groundY;
    let rot = 0;

    // Grounding shadow, cast before he is drawn. In the air it stays on the
    // mat and shrinks, which is the cheapest possible way to make height read
    // as height rather than as the sprite simply moving up the screen.
    if (activity === 'jumping') {
      const lift = jumpOffset(t) / (L.mascotH * CONFIG.jump.heightFrac || 1);
      contactShadow(x, matY(), L.mascotW * (0.78 - lift * 0.34), 0.22 - lift * 0.12);
    } else {
      contactShadow(x, L.groundY, L.mascotW * 0.78, 0.20);
    }

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

  // A ring of dust flicking outward from the mat on each landing. Short enough
  // that it never becomes an effect in its own right — it exists only so the
  // landing has a moment of impact instead of the arc simply reversing.
  function drawLandingPuff(t) {
    if (activity !== 'jumping' || !landedAt) return;
    const age = t - landedAt;
    const life = 260;
    if (age > life) return;
    const p = age / life;
    const cx = bodyX();
    const cy = matY();
    g.save();
    g.globalAlpha = (1 - p) * 0.5;
    g.strokeStyle = '#ffffff';
    g.lineWidth = Math.max(1.5, L.unit * 0.006);
    g.beginPath();
    g.ellipse(cx, cy, L.mascotW * (0.30 + p * 0.55), L.mascotW * (0.09 + p * 0.16),
      0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  function drawMagic(t) {
    if (activity !== 'magic' || !sparkles.length) return;
    const p = clamp01((t - activityStart) / CONFIG.magicMs);
    const cx = mascotX * L.worldW;
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

  function drawMoment(t) {
    if (!moment) return;
    const cfg = CONFIG.moment;
    const c = CONFIG.colors;
    const age = t - moment.openedAt;

    // Fades in, holds fully visible, fades out, then clears itself — no tap
    // needed to dismiss it, since it's something to watch rather than choose.
    let alpha;
    if (age < cfg.openMs) {
      alpha = easeOutCubic(clamp01(age / cfg.openMs));
    } else if (age < cfg.openMs + cfg.holdMs) {
      alpha = 1;
    } else if (age < cfg.openMs + cfg.holdMs + cfg.closeMs) {
      alpha = 1 - clamp01((age - cfg.openMs - cfg.holdMs) / cfg.closeMs);
    } else {
      moment = null;
      return;
    }

    const entry = MOMENTS.find(m => m.id === moment.id);
    const img = moments[moment.id];

    g.save();
    g.fillStyle = `rgba(24,20,44,${cfg.scrimAlpha * alpha})`;
    g.fillRect(0, 0, L.w, L.h);
    g.globalAlpha = alpha;

    const maxW = L.w * cfg.maxWidthFrac, maxH = L.h * cfg.maxHeightFrac;
    if (img && img.naturalWidth) {
      // Contain-fit: these illustrations are native-resolution "hero" art,
      // not a small in-world sprite, so they are never stretched larger than
      // their own pixels warrant.
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      const dx = (L.w - dw) / 2, dy = (L.h - dh) / 2 - L.h * 0.03;
      g.drawImage(img, dx, dy, dw, dh);

      g.fillStyle = c.ink;
      g.font = `700 ${Math.max(16, L.unit * 0.07)}px ${getComputedStyle(document.body).fontFamily}`;
      g.textAlign = 'center';
      g.fillText(entry.cue, L.w / 2, dy + dh + L.unit * 0.08);
    } else {
      // A moment whose art failed to load still says its cue rather than
      // showing nothing at all.
      g.fillStyle = '#fffaf0';
      g.fillText(entry.cue, L.w / 2, L.h / 2);
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
      const x = lf.x * L.worldW;
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

    // Everything in the world is drawn through the camera. Only the sun/moon
    // and the overlays live in screen space.
    g.save();
    g.translate(-camX, 0);
    drawSky(t);
    drawGround();
    drawScenery();
    drawTrampoline(t);
    // The house first: the cot stands on the grass just outside the wall,
    // under the eave, so it has to draw in front of the house rather than
    // behind it — otherwise the wall hides the baby from the outdoor rest,
    // which is the one thing the threshold position exists to prevent.
    drawHouse(t);
    drawPenBack();
    drawBaby(t);
    drawBabyToys();
    drawPenFront(t);
    // Toys on the grass sit behind him: he walks in front of what is lying
    // there, and what he is carrying is in his arms, so it draws in front.
    drawLooseToys();
    drawMascot(t);
    drawLandingPuff(t);
    drawCarriedToy();
    drawMagic(t);
    drawRain();
    drawSnowfall();
    drawLeaves();
    // Whatever is under the finger is above everything, including the weather:
    // it is the one object the child is directly touching.
    drawDraggedToy();
    g.restore();

    drawSunOrMoon(t);
    drawPicker(t);
    drawMoment(t);

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

  preloadImages(Object.fromEntries(TOYS.map(t => [t.id, t.file])), 0)
    .then(loaded => { if (alive) toyImages = loaded || {}; });

  preloadImages(PROPS, 0).then(loaded => { if (alive) props = loaded || {}; });

  preloadImages(Object.fromEntries(MOMENTS.map(m => [m.id, m.file])), 0)
    .then(loaded => { if (alive) moments = loaded || {}; });

  raf = requestAnimationFrame(frame);
  setReprompt(null);      // free play: never nag

  return () => {
    alive = false;
    picker = null;
    moment = null;
    cancelAnimationFrame(raf);
    audio.stopWeatherBed();  // leaving must never leave weather playing
    unlockOrientation();     // leave the rest of the app free to rotate
    drag = null;
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerUp);
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
