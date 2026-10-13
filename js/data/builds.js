// Shape Builder blueprints for Puzzle Fit's Shapes mode. Each build is a
// familiar toy assembled from 3–6 chunky primitive shapes. Coordinates are in
// blueprint units and every part is placed by the centre of its bounding box,
// so a part's outline path doubles as its slot outline. Parts whose path
// strings are identical (a pair of wheels) are interchangeable.
//
// Part fields: shape primitive (`circle`, `oval`, `rect`, `semi`, `tri`) plus
// `x`, `y`, `color`, optional `stroke`, `art` (details drawn on top, in local
// coordinates), `under` (details drawn beneath), `bleed` (tray spacing for
// details that reach past the shape), and behaviour flags `spin`
// (wheels turn), `prop` (propeller flickers) and `door` (opens for a visitor).
//
// Build fields: `level` (1–3, adaptive difficulty), `scene` backdrop and
// `ground` line, `go` (how the finished toy comes alive), plus optional
// `base` art that is always visible, a static `backdrop`, an `extent` that
// widens the layout box, and anchor points for `flame`, `puff` and `peek`.

const INK = '#3a3357';

function circle(r) {
  return { shape: 'circle', w: r * 2, h: r * 2, d: `M${-r} 0A${r} ${r} 0 1 0 ${r} 0A${r} ${r} 0 1 0 ${-r} 0Z` };
}

function oval(rx, ry) {
  return { shape: 'oval', w: rx * 2, h: ry * 2, d: `M${-rx} 0A${rx} ${ry} 0 1 0 ${rx} 0A${rx} ${ry} 0 1 0 ${-rx} 0Z` };
}

function rect(w, h, r = 10) {
  const x = w / 2;
  const y = h / 2;
  return {
    shape: w === h ? 'square' : 'rectangle', w, h,
    d: `M${-x + r} ${-y}H${x - r}Q${x} ${-y} ${x} ${-y + r}V${y - r}Q${x} ${y} ${x - r} ${y}H${-x + r}Q${-x} ${y} ${-x} ${y - r}V${-y + r}Q${-x} ${-y} ${-x + r} ${-y}Z`,
  };
}

// Half circle, flat side down ('up' dome) or flat side up ('down' bowl).
function semi(r, dir = 'up') {
  const h = r / 2;
  return {
    shape: 'semicircle', w: r * 2, h: r,
    d: dir === 'up' ? `M${-r} ${h}A${r} ${r} 0 0 1 ${r} ${h}Z` : `M${-r} ${-h}A${r} ${r} 0 0 0 ${r} ${-h}Z`,
  };
}

// Triangle from points already centred on their bounding box.
function tri(...pts) {
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  return {
    shape: 'triangle',
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
    d: `M${pts.map(p => p.join(' ')).join('L')}Z`,
  };
}

const wheel = r => {
  const h = r * 0.45;
  return `<circle r="${h}" fill="#e3e8f4"/><path d="M0 ${-h}V${h}M${-h} 0H${h}" stroke="#9aa3bf" stroke-width="4" stroke-linecap="round"/><circle r="${r * 0.14}" fill="#9aa3bf"/>`;
};

const eye = (x, y, r) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="2.5"/>` +
  `<circle cx="${x + r * 0.2}" cy="${y + r * 0.1}" r="${r * 0.55}" fill="${INK}"/>` +
  `<circle cx="${x + r * 0.38}" cy="${y - r * 0.12}" r="${r * 0.18}" fill="#fff"/>`;

const smile = (x, y, w) =>
  `<path d="M${x - w / 2} ${y}Q${x} ${y + w * 0.55} ${x + w / 2} ${y}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;

const SNOW = { color: '#ffffff', stroke: '#a9c4e3' };

export const BUILDS = [
  {
    id: 'car', level: 1, scene: 'road', ground: 262,
    go: { kind: 'drive', sound: 'honk' },
    parts: [
      {
        ...semi(72), x: 192, y: 118, color: '#9fd3ff',
        art: '<path d="M0 -34V36" stroke="#fff" stroke-width="8"/><path d="M-46 22Q-42 -10 -16 -24" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".75"/>',
      },
      {
        ...rect(252, 74, 24), x: 200, y: 192, color: '#f04e3e',
        art: '<circle cx="104" cy="-12" r="10" fill="#fff3a0"/><rect x="-122" y="-20" width="10" height="16" rx="4" fill="#ffcf3d"/><path d="M-6 -30V26" stroke="#c23a2e" stroke-width="4" stroke-linecap="round"/><rect x="8" y="-14" width="22" height="7" rx="3.5" fill="#c23a2e"/>',
      },
      { ...circle(32), x: 128, y: 230, color: INK, art: wheel(32), spin: true },
      { ...circle(32), x: 272, y: 230, color: INK, art: wheel(32), spin: true },
    ],
  },
  {
    id: 'boat', level: 1, scene: 'sea', ground: 236,
    go: { kind: 'sail', sound: 'splash' },
    base: `<path d="M200 22V176" stroke="#8a5a3c" stroke-width="10" stroke-linecap="round"/><path d="M204 18L238 28L204 38Z" fill="#f04e3e" stroke="#c23a2e" stroke-width="3" stroke-linejoin="round"/>`,
    parts: [
      { ...tri([40, -50], [40, 50], [-40, 50]), x: 152, y: 112, color: '#73b9ff' },
      { ...tri([-50, -70], [-50, 70], [50, 70]), x: 258, y: 94, color: '#ffcf3d' },
      {
        ...semi(106, 'down'), x: 200, y: 222, color: '#f04e3e',
        art: '<path d="M-96 -32H96" stroke="#fff" stroke-width="8" opacity=".85"/><g fill="#fff" stroke="#c23a2e" stroke-width="3"><circle cx="-40" cy="0" r="10"/><circle cx="0" cy="0" r="10"/><circle cx="40" cy="0" r="10"/></g>',
      },
    ],
  },
  {
    id: 'fish', level: 1, scene: 'tank',
    go: { kind: 'swim', sound: 'glug' },
    extent: [34, 40, 334, 244],
    parts: [
      { ...tri([36, 0], [-36, -46], [-36, 46]), x: 86, y: 150, color: '#ffcf3d' },
      { ...semi(42), x: 214, y: 78, color: '#ffcf3d' },
      {
        ...oval(100, 64), x: 210, y: 150, color: '#ff8c2e',
        art: `<path d="M-6 -40Q14 0 -6 40M-40 -36Q-20 0 -40 36" fill="none" stroke="#ffb066" stroke-width="6" stroke-linecap="round"/>${eye(50, -16, 15)}<path d="M64 16Q76 26 88 12" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`,
      },
    ],
  },
  {
    id: 'snowman', level: 1, scene: 'snow', ground: 262,
    go: { kind: 'hop', sound: 'crunch' },
    extent: [100, -52, 300, 262],
    base: '<path d="M162 96L108 64M124 74L112 54M238 96L292 64M276 74L288 54" fill="none" stroke="#8a5a3c" stroke-width="7" stroke-linecap="round"/>',
    parts: [
      { ...circle(62), x: 200, y: 200, ...SNOW },
      { ...circle(46), x: 200, y: 102, ...SNOW, art: `<g fill="${INK}"><circle cy="-16" r="6"/><circle cy="6" r="6"/><circle cy="28" r="6"/></g>` },
      {
        ...circle(34), x: 200, y: 28, ...SNOW,
        art: `<g fill="${INK}"><circle cx="-12" cy="-8" r="5"/><circle cx="12" cy="-8" r="5"/><circle cx="-12" cy="17" r="3"/><circle cx="-4" cy="21" r="3"/><circle cx="4" cy="21" r="3"/><circle cx="12" cy="17" r="3"/></g><path d="M-2 0L28 6L-2 12Z" fill="#ff8c2e"/>`,
      },
      {
        ...rect(56, 46, 6), x: 200, y: -26, color: INK, bleed: 12,
        art: `<rect x="-28" y="2" width="56" height="10" fill="#f04e3e"/><rect x="-40" y="14" width="80" height="12" rx="6" fill="${INK}"/>`,
      },
    ],
  },
  {
    id: 'duck', level: 1, scene: 'sea', ground: 232,
    go: { kind: 'paddle', sound: 'animal:duck' },
    extent: [66, 84, 344, 252],
    parts: [
      {
        ...oval(96, 52), x: 186, y: 200, color: '#ffd23f', bleed: 24,
        under: '<path d="M-84 -18L-118 -40L-104 6Z" fill="#ffd23f" stroke="#c9a12a" stroke-width="4" stroke-linejoin="round"/>',
        art: '<path d="M-40 -6Q0 -34 44 -8Q4 26 -40 -6Z" fill="#ffbf1f" stroke="#e0a300" stroke-width="3" stroke-linejoin="round"/>',
      },
      { ...circle(44), x: 262, y: 132, color: '#ffd23f', art: `${eye(10, -10, 9)}<circle cx="-6" cy="16" r="8" fill="#ffab91" opacity=".75"/>` },
      { ...tri([-22, -13], [22, 0], [-22, 13]), x: 318, y: 138, color: '#ff8c2e' },
    ],
  },
  {
    id: 'turtle', level: 1, scene: 'grass', ground: 262,
    go: { kind: 'walk', sound: 'footstep' },
    parts: [
      { ...rect(36, 40, 12), x: 148, y: 240, color: '#9be07a' },
      { ...rect(36, 40, 12), x: 236, y: 240, color: '#9be07a' },
      { ...circle(30), x: 290, y: 196, color: '#9be07a', art: `${eye(6, -8, 8)}${smile(8, 8, 14)}` },
      {
        ...semi(88), x: 192, y: 196, color: '#4db84d', bleed: 20,
        under: '<path d="M-80 30L-110 40L-80 44Z" fill="#9be07a" stroke="#6aa94f" stroke-width="4" stroke-linejoin="round"/>',
        art: '<path d="M-86 38H86" stroke="#2f8f3a" stroke-width="8" stroke-linecap="round"/><path d="M-24 4L-12 -17L12 -17L24 4L12 25L-12 25Z" fill="#6fcf5f" stroke="#2f8f3a" stroke-width="4" stroke-linejoin="round"/><path d="M-24 4H-70M24 4H70M-12 -17L-26 -38M12 -17L26 -38M-12 25L-20 36M12 25L20 36" stroke="#2f8f3a" stroke-width="4" stroke-linecap="round"/>',
      },
    ],
  },
  {
    id: 'house', level: 1, scene: 'grass', ground: 262,
    go: { kind: 'peek' },
    peek: { x: 166, y: 262, size: 130 },
    base: '<rect x="236" y="22" width="28" height="56" rx="4" fill="#d94c43"/>',
    parts: [
      { ...rect(156, 156, 8), x: 200, y: 184, color: '#ffcf66', art: '<rect x="-61" y="-2" width="54" height="80" rx="8" fill="#5a3a2a"/>' },
      { ...tri([-104, 52], [0, -52], [104, 52]), x: 200, y: 60, color: '#f04e3e' },
      { ...rect(54, 80, 8), x: 166, y: 222, color: '#8a5a3c', art: '<circle cx="16" cy="4" r="5" fill="#ffcf3d"/>', door: true },
      { ...circle(24), x: 238, y: 170, color: '#9fd3ff', art: '<path d="M0 -22V22M-22 0H22" stroke="#fff" stroke-width="5"/>' },
    ],
  },
  {
    id: 'ladybug', level: 2, scene: 'grass', ground: 262,
    go: { kind: 'fly', sound: 'sparkle' },
    extent: [100, 30, 352, 262],
    backdrop: '<path d="M52 150Q190 -20 380 150Q190 320 52 150Z" fill="#8fd16a"/><path d="M60 150H372" stroke="#6fbf4a" stroke-width="6" stroke-linecap="round"/>',
    base: `<path d="M150 74L128 46M200 64V34M250 74L272 46M150 226L128 254M200 236V266M250 226L272 254" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>`,
    parts: [
      {
        ...circle(36), x: 290, y: 150, color: INK, bleed: 30,
        art: `<path d="M24 -24Q44 -50 60 -44M24 24Q44 50 60 44" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="-44" r="6" fill="${INK}"/><circle cx="60" cy="44" r="6" fill="${INK}"/><circle cx="14" cy="-14" r="7" fill="#fff"/><circle cx="14" cy="14" r="7" fill="#fff"/>`,
      },
      { ...circle(88), x: 200, y: 150, color: '#f04e3e', art: `<path d="M-86 0H86" stroke="${INK}" stroke-width="6"/>` },
      { ...circle(17), x: 160, y: 110, color: INK },
      { ...circle(17), x: 238, y: 110, color: INK },
      { ...circle(17), x: 160, y: 190, color: INK },
      { ...circle(17), x: 238, y: 190, color: INK },
    ],
  },
  {
    id: 'rocket', level: 2, scene: 'grass', ground: 256,
    go: { kind: 'launch' },
    flame: { x: 200, y: 244 },
    parts: [
      { ...tri([24, -38], [24, 38], [-24, 38]), x: 134, y: 214, color: '#f04e3e' },
      { ...tri([-24, -38], [24, 38], [-24, 38]), x: 266, y: 214, color: '#f04e3e' },
      {
        ...rect(96, 164, 30), x: 200, y: 168, color: '#f4f6fc', stroke: '#aab4d0',
        art: '<rect x="-48" y="30" width="96" height="14" fill="#73b9ff"/><rect x="-48" y="52" width="96" height="6" fill="#ffcf3d"/>',
      },
      { ...tri([-48, 36], [0, -36], [48, 36]), x: 200, y: 58, color: '#f04e3e' },
      { ...circle(26), x: 200, y: 140, color: '#73b9ff', art: '<circle r="18" fill="#9fd3ff"/><path d="M-10 -6Q-6 -14 4 -15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' },
    ],
  },
  {
    id: 'robot', level: 2, scene: 'grass', ground: 262,
    go: { kind: 'dance', sound: 'robot' },
    base: `<path d="M200 16V30" stroke="#7c86a6" stroke-width="6" stroke-linecap="round"/><rect x="186" y="110" width="28" height="16" fill="#7c86a6"/><path d="M176 234V250M224 234V250" stroke="#7c86a6" stroke-width="20" stroke-linecap="round"/><rect x="156" y="248" width="40" height="14" rx="7" fill="${INK}"/><rect x="204" y="248" width="40" height="14" rx="7" fill="${INK}"/>`,
    parts: [
      { ...rect(26, 84, 13), x: 126, y: 176, color: '#9b5fe0', bleed: 14, art: '<circle cy="44" r="12" fill="#ffcf3d" stroke="#d9a400" stroke-width="3"/>' },
      { ...rect(26, 84, 13), x: 274, y: 176, color: '#9b5fe0', bleed: 14, art: '<circle cy="44" r="12" fill="#ffcf3d" stroke="#d9a400" stroke-width="3"/>' },
      {
        ...rect(130, 116, 18), x: 200, y: 180, color: '#3d7ef0',
        art: '<rect x="-40" y="-40" width="80" height="44" rx="10" fill="#dff0ff"/><path d="M0 -6C-10 -14 -17 -22 -9 -29C-5 -32 0 -29 0 -25C0 -29 5 -32 9 -29C17 -22 10 -14 0 -6Z" fill="#ff7eb6"/><circle cx="-26" cy="32" r="8" fill="#ffcf3d"/><circle cx="0" cy="32" r="8" fill="#4db84d"/><circle cx="26" cy="32" r="8" fill="#f04e3e"/>',
      },
      {
        ...rect(92, 92, 20), x: 200, y: 72, color: '#7fb3ff', bleed: 8,
        art: `<circle cx="-46" r="7" fill="#ffcf3d"/><circle cx="46" r="7" fill="#ffcf3d"/>${eye(-20, -10, 14)}${eye(20, -10, 14)}<rect x="-24" y="14" width="48" height="16" rx="8" fill="${INK}"/><path d="M-12 14V30M0 14V30M12 14V30" stroke="#fff" stroke-width="3"/>`,
      },
      { ...circle(15), x: 200, y: 4, color: '#f04e3e', art: '<circle cx="-5" cy="-5" r="4" fill="#fff" opacity=".8"/>' },
    ],
  },
  {
    id: 'butterfly', level: 2, scene: 'grass', ground: 262,
    go: { kind: 'fly', sound: 'sparkle' },
    extent: [86, 28, 314, 262],
    parts: [
      { ...circle(56), x: 144, y: 108, color: '#ff7eb6', art: '<circle r="24" fill="#ffd1e6"/><circle r="10" fill="#fff"/>' },
      { ...circle(56), x: 256, y: 108, color: '#ff7eb6', art: '<circle r="24" fill="#ffd1e6"/><circle r="10" fill="#fff"/>' },
      { ...circle(40), x: 156, y: 194, color: '#9b5fe0', art: '<circle r="15" fill="#ffcf3d"/>' },
      { ...circle(40), x: 244, y: 194, color: '#9b5fe0', art: '<circle r="15" fill="#ffcf3d"/>' },
      {
        ...oval(18, 76), x: 200, y: 152, color: '#5b4a8a', bleed: 54,
        art: `<path d="M-6 -104Q-20 -130 -34 -124M6 -104Q20 -130 34 -124" fill="none" stroke="#5b4a8a" stroke-width="5" stroke-linecap="round"/><circle cx="-34" cy="-124" r="6" fill="#ff7eb6"/><circle cx="34" cy="-124" r="6" fill="#ff7eb6"/><circle cy="-92" r="20" fill="#5b4a8a"/><circle cx="-7" cy="-95" r="4" fill="#fff"/><circle cx="7" cy="-95" r="4" fill="#fff"/><path d="M-7 -84Q0 -78 7 -84" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
      },
    ],
  },
  {
    id: 'plane', level: 2, scene: 'sky',
    go: { kind: 'plane', sound: 'whoosh' },
    backdrop: '<g fill="#fff" opacity=".85"><circle cx="58" cy="236" r="22"/><circle cx="84" cy="226" r="28"/><circle cx="114" cy="238" r="20"/><circle cx="318" cy="60" r="18"/><circle cx="342" cy="50" r="24"/><circle cx="368" cy="62" r="16"/></g>',
    parts: [
      { ...tri([-28, -40], [28, 40], [-28, 40]), x: 106, y: 104, color: '#f04e3e' },
      {
        ...rect(240, 64, 32), x: 200, y: 152, color: '#f4f6fc', stroke: '#aab4d0',
        art: '<path d="M-110 14H110" stroke="#f04e3e" stroke-width="6"/><g fill="#73b9ff"><circle cx="-64" cy="-6" r="9"/><circle cx="-36" cy="-6" r="9"/><circle cx="-8" cy="-6" r="9"/><circle cx="20" cy="-6" r="9"/><path d="M76 -4Q84 -24 104 -14L106 -4Z"/></g>',
      },
      { ...oval(84, 20), x: 194, y: 168, color: '#3d7ef0' },
      { ...oval(10, 46), x: 330, y: 152, color: '#ffcf3d', art: `<circle r="8" fill="${INK}"/>`, prop: true },
    ],
  },
  {
    id: 'train', level: 3, scene: 'rails', ground: 262,
    go: { kind: 'chug', sound: 'toot' },
    puff: { x: 286, y: 80 },
    parts: [
      { ...rect(36, 52, 6), x: 286, y: 112, color: INK, bleed: 8, art: `<rect x="-24" y="-30" width="48" height="12" rx="5" fill="${INK}"/>` },
      {
        ...rect(152, 86, 22), x: 246, y: 176, color: '#f04e3e',
        art: '<path d="M-30 -43V43M10 -43V43" stroke="#ffcf3d" stroke-width="8"/><circle cx="56" cy="-14" r="10" fill="#fff3a0"/>',
      },
      {
        ...rect(106, 106, 10), x: 124, y: 162, color: '#3d7ef0', bleed: 10,
        art: `<rect x="-62" y="-64" width="124" height="16" rx="8" fill="${INK}"/><rect x="-34" y="-36" width="44" height="36" rx="6" fill="#dff0ff"/>`,
      },
      { ...circle(38), x: 120, y: 224, color: INK, art: wheel(38), spin: true },
      { ...circle(26), x: 230, y: 236, color: INK, art: wheel(26), spin: true },
      { ...circle(26), x: 292, y: 236, color: INK, art: wheel(26), spin: true },
    ],
  },
];

// Farm friends with an authentic recording who can answer the house's door.
export const VISITORS = ['dog', 'cat', 'cow', 'sheep', 'pig', 'bunny', 'horse', 'rooster'];
