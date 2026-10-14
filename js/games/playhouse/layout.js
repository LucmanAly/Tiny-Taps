// Play House world geometry, sizes and timings.
//
// Everything is in world units (wu). The design band is 800 wu tall: y = 800
// is always the bottom of the screen, and taller screens simply reveal more
// sky (and the roof) above y = 0. The world is one continuous strip — the
// house on the left, the garden on the right — that the child pans across.

export const WORLD = {
  W: 4720,
  H: 800,
  // Interior of the house (inside both side walls) and the garden beyond,
  // which ends in the vegetable patch past the apple tree.
  home: { x0: 44, x1: 1600 },
  garden: { x0: 1660, x1: 4720 },
  doorX: 1630,              // centre of the doorway in the right-hand wall
  // Where feet, toys and furniture bases may rest. Furniture sits at the back
  // of the floor and everything that moves stays in front of it, so the
  // painted furniture never has to be sorted around a character.
  floor: {
    home: { y0: 662, y1: 786, x0: 80, x1: 1585 },
    garden: { y0: 650, y1: 786, x0: 1690, x1: 4660 },
  },
  horizonY: 470,            // where the lawn meets the fence
};

// How a view of the world is fitted to the screen.
export const VIEW = {
  // Landscape screens show (up to) a whole room; portrait shows a window this
  // wide and the child pans, rather than everything shrinking to a sliver.
  landscapeW: 1600,
  portraitW: 620,
  dprCap: 2,
  // Pre-rendered backdrops are soft and painterly; they do not need the full
  // device resolution, and on large iPads full resolution costs a lot of RAM.
  backdropDprCap: 1.5,
};

export const SIZE = {
  boyH: 350,          // standing height at the front of the floor
  babyH: 205,         // sitting height
  toyH: 112,
  depthNear: 1.0,     // scale at the front of the floor band
  depthFar: 0.86,     // scale at the back
};

// Scale for something standing at depth `y`, so things further back read as
// further away rather than just higher up.
export function depthAt(y) {
  const t = Math.max(0, Math.min(1, (y - 650) / 136));
  return SIZE.depthFar + (SIZE.depthNear - SIZE.depthFar) * t;
}

export function roomAt(x) {
  return x < WORLD.doorX ? 'home' : 'garden';
}

export function floorFor(x) {
  return WORLD.floor[roomAt(x)];
}

// Clamp a resting point into the walkable floor. The doorway is open from
// front to back, so the two rooms join into one continuous band.
export function clampToFloor(x, y) {
  const fx0 = WORLD.floor.home.x0, fx1 = WORLD.floor.garden.x1;
  const cx = Math.max(fx0, Math.min(fx1, x));
  const f = floorFor(cx);
  return { x: cx, y: Math.max(f.y0, Math.min(f.y1, y)) };
}

// Fixed places in the world. Furniture lives at the back of the floor.
export const PLACES = {
  nightstand: { x: 112, y: 612 },
  bed: { x: 420, y: 642, w: 480 },
  window: { x0: 250, x1: 560, y0: 118, y1: 352 },
  wardrobe: { x: 830, y: 612, w: 270, h: 486 },
  toybox: { x: 1150, y: 664 },
  photos: { x0: 1054, y0: 116, cols: 5, rows: 2, size: 86, gap: 18 },
  rug: { x: 1372, y: 712, rx: 215, ry: 50 },
  babyHome: { x: 1372, y: 714 },
  // The baby's cot, against the back wall under the photo frames.
  cot: { x: 1350, y: 652 },
  boyHome: { x: 1000, y: 742 },
  door: { x: 1600, y0: 330, y1: 790 },
  stroller: { x: 1830, y: 744 },
  birdcage: { x: 2200, y: 690 },
  bushes: [
    { x: 2020, y: 575, art: 'bushBig', w: 300 },
    { x: 2905, y: 566, art: 'bushMedium', w: 250 },
    { x: 3140, y: 596, art: 'bushSmall', w: 210 },
  ],
  trampoline: { x: 2470, y: 742, w: 430 },
  tree: { x: 3330, y: 586 },
  snowman: { x: 2160, y: 744 },
  puddles: [
    { x: 1990, y: 760, r: 92 },
    { x: 2230, y: 712, r: 70 },
    { x: 2780, y: 768, r: 100 },
    { x: 3020, y: 718, r: 78 },
    { x: 3270, y: 772, r: 86 },
    // On the path along the vegetable patch.
    { x: 3640, y: 752, r: 78 },
    { x: 4250, y: 748, r: 80 },
  ],
  cloud: { x: 2290, y: 150 },
  sun: { x: 2760, y: 120 },
  porchLight: { x: 1684, y: 300 },
  // The vegetable patch: a seed stand, a raised bed of four plots (offsets
  // from its centre), the watering can's resting spot and the harvest basket.
  seeds: { x: 3540, y: 676 },
  veg: { x: 3990, y: 680, plots: [-210, -70, 70, 210], soilY: 612 },
  can: { x: 4400, y: 704 },
  basket: { x: 4590, y: 770 },
};

export const TIMING = {
  dayNightMs: 2400,       // a full sunset or sunrise
  photoGapMs: 9000,       // at most one snapshot this often
  wantEveryMs: [11000, 17000],
  wantLastsMs: 16000,
  hintAfterMs: 7000,
  hintEveryMs: 5200,
};
