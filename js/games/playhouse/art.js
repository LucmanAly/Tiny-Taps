// Play House scenery, drawn as SVG and rasterized once per screen size.
//
// The characters are soft, painted illustrations with warm brown pencil
// lines, so the world is drawn the same way: muted storybook colours, a thin
// ink outline, a slight hand-drawn wobble (an SVG displacement filter) and a
// faint paper grain. Each piece is a plain SVG string; rasterize() turns it
// into a canvas at exactly the pixel density the screen needs, so the frame
// loop only ever blits ready-made bitmaps.
//
// Coordinates are world units. A definition is { vb: [x, y, w, h], body }:
// the SVG viewBox in the piece's own local space, where (0, 0) is the point
// the game positions it by (the middle of its base, for furniture).

const INK = '#6b4a3a';
const C = {
  ink: INK,
  cream: '#fff6e8',
  wall: '#fbe7cd', wallStripe: '#f6ddbf', wallDot: '#efc7a3',
  sage: '#d0e2c3', sageDark: '#b6cda5', sagePanel: '#d8e8cc',
  rail: '#fff2de',
  floor: ['#d9a46b', '#d19a60', '#dead77', '#d5a066'],
  floorSeam: '#a46f3f',
  wood: '#c98d55', woodDark: '#a26a3c', woodLight: '#dcab76', woodDeep: '#8a5733',
  roof: '#d9705a', roofDark: '#b5513e', roofLight: '#ec8d73',
  pink: '#f4a7b9', pinkDark: '#e2879f', rose: '#f6b7c3',
  sky: '#cfe9f5',
  leaf: ['#7dbd66', '#91cb78', '#6aa958', '#a6d88a'],
  flowers: ['#ffffff', '#ffd6e0', '#fff0a8', '#e3d0ff', '#ffc9a8'],
};

/* ---------------- shared defs and the "painted" wrapper ---------------- */

const DEFS = `
<defs>
  <filter id="wob" x="-4%" y="-4%" width="108%" height="108%">
    <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="2" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed="3" result="t"/>
    <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.32  0 0 0 0 0.22  0 0 0 0 0.14  1.25 0 0 0 -0.52" result="g"/>
    <feComposite in="g" in2="SourceAlpha" operator="in"/>
  </filter>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="6"/>
  </filter>
</defs>`;

// Wraps artwork so it gets the wobble and, on top, a grain pass clipped to
// the artwork's own alpha. `id` keeps the <use> target unique per document.
function painted(body, { wobble = true, grain = true } = {}) {
  const art = `<g id="art">${body}</g>`;
  const g = grain ? `<use xlink:href="#art" href="#art" filter="url(#grain)" opacity="0.42"/>` : '';
  return wobble ? `<g filter="url(#wob)">${art}${g}</g>` : `${art}${g}`;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = n => Math.round(n * 10) / 10;
const ink = (w = 3, o = 0.75) => `stroke="${INK}" stroke-width="${w}" stroke-opacity="${o}" stroke-linejoin="round" stroke-linecap="round"`;

/* ---------------- rasterizing ---------------- */

function svgDoc(def, pw, ph) {
  const [x, y, w, h] = def.vb;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `
    + `width="${pw}" height="${ph}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none">`
    + DEFS + def.body + '</svg>';
}

function loadSvg(markup) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup);
  });
}

// Resolves to { canvas, vb } or null. Never rejects: a piece that fails to
// render is simply skipped by the drawing code.
export async function rasterize(def, pxPerWu) {
  const [, , w, h] = def.vb;
  const pw = Math.max(1, Math.ceil(w * pxPerWu));
  const ph = Math.max(1, Math.ceil(h * pxPerWu));
  const img = await loadSvg(svgDoc(def, pw, ph));
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = pw;
  canvas.height = ph;
  try {
    canvas.getContext('2d').drawImage(img, 0, 0, pw, ph);
  } catch (e) {
    return null;
  }
  return { canvas, vb: def.vb };
}

// Draws a rasterized piece with its local origin at the current transform's
// origin, in world units.
export function blit(g, sprite, x = 0, y = 0) {
  if (!sprite) return;
  const [vx, vy, vw, vh] = sprite.vb;
  g.drawImage(sprite.canvas, x + vx, y + vy, vw, vh);
}

/* ---------------- the house ---------------- */

function roof() {
  const L = -90, R = 1750, base = 46, apexX = 830, apexY = -332;
  const slope = (base - apexY) / (R - apexX);
  let rows = '';
  for (let y = apexY + 30, r = 0; y < base; y += 34, r++) {
    let d = '';
    for (let x = L - 40 + (r % 2) * 20; x < R + 40; x += 40) d += `M${x},${y} a20,18 0 0 0 40,0 `;
    rows += `<path d="${d}" fill="none" stroke="${C.roofDark}" stroke-width="3" stroke-opacity="0.55"/>`;
    rows += `<path d="${d}" transform="translate(0,-4)" fill="none" stroke="${C.roofLight}" stroke-width="2" stroke-opacity="0.45"/>`;
  }
  const chimneyY = x => apexY + slope * (x - apexX);
  return `
  <clipPath id="roofClip"><polygon points="${L},${base} ${apexX},${apexY} ${R},${base}"/></clipPath>
  <linearGradient id="roofG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.roofLight}"/><stop offset="1" stop-color="${C.roof}"/>
  </linearGradient>
  <g>
    <polygon points="1262,-252 1352,-252 1352,${f1(chimneyY(1352))} 1262,${f1(chimneyY(1262))}" fill="#c96b54" ${ink(3)}/>
    <path d="M1262,-222 H1352 M1262,-192 H1352 M1262,-162 H1352 M1300,-252 V-222 M1325,-222 V-192 M1285,-192 V-162" stroke="#a14f3e" stroke-width="2.5" stroke-opacity="0.6"/>
    <rect x="1250" y="-270" width="114" height="22" rx="6" fill="#8f7d74" ${ink(3)}/>
  </g>
  <polygon points="${L},${base} ${apexX},${apexY} ${R},${base}" fill="url(#roofG)"/>
  <g clip-path="url(#roofClip)">${rows}
    <polygon points="${L},${base} ${apexX},${apexY} ${apexX},${base}" fill="#7a2f20" opacity="0.10"/>
  </g>
  <polyline points="${L - 10},${base + 4} ${apexX},${apexY - 8} ${R + 10},${base + 4}" fill="none" stroke="${C.cream}" stroke-width="22" stroke-linejoin="round"/>
  <polyline points="${L - 10},${base + 4} ${apexX},${apexY - 8} ${R + 10},${base + 4}" fill="none" ${ink(3)}/>
  <polyline points="${L + 12},${base + 2} ${apexX},${apexY + 16} ${R - 12},${base + 2}" fill="none" ${ink(2, 0.4)}/>
  <circle cx="${apexX}" cy="-150" r="62" fill="${C.cream}" ${ink(3)}/>
  <circle cx="${apexX}" cy="-150" r="46" fill="#bfe1f1"/>
  <path d="M${apexX - 30},-170 a40,40 0 0 1 38,-22" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
  <path d="M${apexX},-196 V-104 M${apexX - 46},-150 H${apexX + 46}" stroke="${C.cream}" stroke-width="9"/>
  <circle cx="${apexX}" cy="-150" r="46" fill="none" ${ink(2.5, 0.6)}/>
  <rect x="${L}" y="${base - 2}" width="${R - L}" height="14" fill="${C.woodDark}" ${ink(2.5, 0.5)}/>`;
}

function garland() {
  const pins = [62, 440, 820, 1200, 1578];
  const colors = ['#f7a8b8', '#ffd27a', '#a9d8ea', '#b9e0a8', '#d8bdf2'];
  let out = '', ci = 0;
  for (let i = 0; i < pins.length - 1; i++) {
    const x0 = pins[i], x1 = pins[i + 1], y = 76, sag = 24;
    out += `<path d="M${x0},${y} Q${(x0 + x1) / 2},${y + sag * 2} ${x1},${y}" fill="none" stroke="#8a6a55" stroke-width="2.5"/>`;
    for (let k = 1; k < 7; k++) {
      const t = k / 7;
      const fx = x0 + (x1 - x0) * t;
      const fy = y + sag * 2 * 2 * t * (1 - t);
      const ang = Math.atan2(sag * 2 * 2 * (1 - 2 * t), x1 - x0) * 180 / Math.PI;
      out += `<path transform="translate(${f1(fx)},${f1(fy)}) rotate(${f1(ang)})" d="M-17,0 L17,0 L0,36 Z" fill="${colors[ci++ % colors.length]}" ${ink(2, 0.55)}/>`;
    }
    out += `<circle cx="${x0}" cy="${y}" r="5" fill="#e0b25c" ${ink(1.5, 0.6)}/>`;
  }
  return out + `<circle cx="${pins[pins.length - 1]}" cy="76" r="5" fill="#e0b25c" ${ink(1.5, 0.6)}/>`;
}

function crayonDrawing() {
  return `
  <g transform="translate(640,222) rotate(-5)">
    <rect x="-48" y="-58" width="96" height="116" rx="3" fill="#fffdf7" ${ink(2, 0.4)}/>
    <circle cx="24" cy="-32" r="11" fill="#ffd54a"/>
    <path d="M24,-50 V-46 M40,-32 H44 M24,-14 V-18 M8,-32 H4 M36,-44 l3,-3 M36,-20 l3,3" stroke="#f2b02e" stroke-width="3" stroke-linecap="round"/>
    <polygon points="-36,-4 -14,-26 8,-4" fill="#ee7262"/>
    <rect x="-32" y="-4" width="36" height="28" fill="#8fc3e8"/>
    <rect x="-20" y="6" width="10" height="18" fill="#c98d55"/>
    <circle cx="22" cy="12" r="6" fill="none" stroke="#5a5a8a" stroke-width="2.5"/>
    <path d="M22,18 V34 M22,24 l-8,6 M22,24 l8,6 M22,34 l-6,10 M22,34 l6,10" stroke="#5a5a8a" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <circle cx="38" cy="26" r="4.5" fill="none" stroke="#e86f9a" stroke-width="2.5"/>
    <path d="M38,30.5 V40 M38,34 l-5,4 M38,34 l5,4 M38,40 l-4,6 M38,40 l4,6" stroke="#e86f9a" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M-44,44 Q0,36 44,44" stroke="#7cc06a" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="-56" y="-66" width="34" height="13" fill="#f2e2a8" opacity="0.85" transform="rotate(-18 -39 -60)"/>
    <rect x="22" y="-66" width="34" height="13" fill="#f2e2a8" opacity="0.85" transform="rotate(16 39 -60)"/>
  </g>`;
}

function plant() {
  const leaves = [
    [-150, 112, C.leaf[0]], [-118, 128, C.leaf[1]], [-88, 120, C.leaf[2]],
    [-62, 130, C.leaf[0]], [-34, 104, C.leaf[1]], [-128, 86, C.leaf[3]], [-60, 92, C.leaf[3]],
  ];
  let out = '';
  for (const [a, len, col] of leaves) {
    out += `<g transform="translate(1010,528) rotate(${a})">
      <path d="M0,0 C${len * 0.3},${-len * 0.36} ${len * 0.76},${-len * 0.32} ${len},0 C${len * 0.76},${len * 0.32} ${len * 0.3},${len * 0.36} 0,0 Z" fill="${col}" ${ink(2.5, 0.6)}/>
      <path d="M6,0 L${len - 10},0" stroke="#5f9b4c" stroke-width="2.5" opacity="0.7"/>
    </g>`;
  }
  return out + `
    <rect x="966" y="520" width="88" height="16" rx="6" fill="#e39a72" ${ink(2.5)}/>
    <path d="M972,536 H1048 L1040,602 H980 Z" fill="#d9885f" ${ink(2.5)}/>
    <path d="M984,560 H1036" stroke="#f2b896" stroke-width="5" stroke-linecap="round"/>`;
}

function floorPlanks() {
  const vpX = 830, vpY = -500, back = 566, front = 800;
  const k = (front - vpY) / (back - vpY);
  const r = rng(11);
  let out = '';
  const xs = [];
  for (let x = -16; x <= 1676; x += 60) xs.push(x);
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1];
    const af = vpX + (a - vpX) * k, bf = vpX + (b - vpX) * k;
    out += `<polygon points="${a},${back} ${b},${back} ${f1(bf)},${front} ${f1(af)},${front}" fill="${C.floor[Math.floor(r() * C.floor.length)]}"/>`;
    out += `<line x1="${a}" y1="${back}" x2="${f1(af)}" y2="${front}" stroke="${C.floorSeam}" stroke-width="2.2" stroke-opacity="0.45"/>`;
    for (let j = 0; j < 2; j++) {
      const y = back + 20 + r() * (front - back - 30);
      const t = (y - back) / (front - back);
      const xa = a + (af - a) * t, xb = b + (bf - b) * t;
      out += `<line x1="${f1(xa)}" y1="${f1(y)}" x2="${f1(xb)}" y2="${f1(y)}" stroke="${C.floorSeam}" stroke-width="2" stroke-opacity="0.35"/>`;
    }
  }
  return out;
}

function rug() {
  const { x, y } = { x: 1372, y: 712 };
  let tassels = '';
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const cx = x + Math.cos(a) * 215, cy = y + Math.sin(a) * 50;
    const ox = Math.cos(a) * 12, oy = Math.sin(a) * 5;
    tassels += `M${f1(cx)},${f1(cy)} l${f1(ox)},${f1(oy)} `;
  }
  return `
  <ellipse cx="${x}" cy="${y + 6}" rx="222" ry="54" fill="#6b3b20" opacity="0.14"/>
  <path d="${tassels}" stroke="#f2c38e" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="${x}" cy="${y}" rx="215" ry="50" fill="#f3b8b4" ${ink(2.5, 0.55)}/>
  <ellipse cx="${x}" cy="${y}" rx="188" ry="42" fill="#fde2b4"/>
  <ellipse cx="${x}" cy="${y}" rx="158" ry="35" fill="#bfe2e3"/>
  <ellipse cx="${x}" cy="${y}" rx="124" ry="27" fill="#f8d1dc"/>
  <ellipse cx="${x}" cy="${y}" rx="84" ry="18" fill="#fff2d4"/>
  <path d="M${x - 50},${y} l9,-6 l9,6 l-9,6 Z M${x + 32},${y} l9,-6 l9,6 l-9,6 Z" fill="#f3b8b4"/>`;
}

export function homeBackdrop() {
  const wallClip = 'M44,62 H1600 V568 H44 Z M262,130 V340 H548 V130 Z';
  let stripes = '';
  for (let x = 60; x < 1600; x += 64) stripes += `<rect x="${x}" y="62" width="28" height="360" fill="${C.wallStripe}" opacity="0.7"/>`;
  let dots = '';
  const r = rng(5);
  for (let y = 132; y < 400; y += 62) {
    for (let x = 92 + ((y / 62) % 2) * 32; x < 1600; x += 64) {
      const c = r() < 0.5 ? C.wallDot : '#d9e6cf';
      dots += `<path transform="translate(${x},${y})" d="M0,-6 L1.8,-1.8 L6,0 L1.8,1.8 L0,6 L-1.8,1.8 L-6,0 L-1.8,-1.8 Z" fill="${c}"/>`;
    }
  }
  let panels = '';
  for (let x = 58; x < 1590; x += 132) {
    panels += `<rect x="${x}" y="438" width="114" height="96" rx="8" fill="${C.sagePanel}" stroke="${C.sageDark}" stroke-width="3"/>`;
  }

  const body = `
  ${roof()}
  <rect x="-2" y="28" width="1664" height="36" fill="${C.wood}" ${ink(3)}/>
  <path d="M-2,58 H1662" stroke="${C.woodDark}" stroke-width="5"/>
  <clipPath id="wallClip"><path d="${wallClip}" clip-rule="evenodd"/></clipPath>
  <radialGradient id="wallLight" cx="405" cy="250" r="900" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="0.38"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/>
    <stop offset="1" stop-color="#b98a5e" stop-opacity="0.18"/>
  </radialGradient>
  <linearGradient id="ceilShade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a5a35" stop-opacity="0.22"/><stop offset="1" stop-color="#8a5a35" stop-opacity="0"/>
  </linearGradient>
  <g clip-path="url(#wallClip)">
    <rect x="44" y="62" width="1556" height="506" fill="${C.wall}"/>
    ${stripes}${dots}
    <rect x="44" y="410" width="1556" height="140" fill="${C.sage}"/>
    ${panels}
    <rect x="44" y="404" width="1556" height="16" fill="${C.rail}" ${ink(2, 0.45)}/>
    <rect x="44" y="62" width="1556" height="506" fill="url(#wallLight)"/>
    <rect x="44" y="62" width="1556" height="70" fill="url(#ceilShade)"/>
  </g>
  ${garland()}
  <rect x="250" y="118" width="310" height="234" rx="6" fill="none" stroke="${C.cream}" stroke-width="24"/>
  <path d="M405,128 V342 M260,235 H550" stroke="${C.cream}" stroke-width="12"/>
  <rect x="238" y="106" width="334" height="258" rx="10" fill="none" ${ink(3)}/>
  <rect x="262" y="130" width="286" height="210" fill="none" ${ink(2.5, 0.5)}/>
  <path d="M276,150 l40,-14 M284,170 l70,-26" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.35"/>
  <rect x="232" y="350" width="346" height="20" rx="7" fill="${C.cream}" ${ink(2.5)}/>
  <rect x="240" y="368" width="330" height="8" fill="#7a5638" opacity="0.15"/>
  <path d="M222,102 H588" stroke="${C.woodDark}" stroke-width="9" stroke-linecap="round"/>
  <circle cx="218" cy="102" r="11" fill="${C.wood}" ${ink(2.5)}/><circle cx="592" cy="102" r="11" fill="${C.wood}" ${ink(2.5)}/>
  ${crayonDrawing()}
  <rect x="44" y="546" width="1556" height="24" fill="${C.cream}" ${ink(2.5, 0.55)}/>
  <clipPath id="floorClip"><rect x="0" y="568" width="1662" height="232"/></clipPath>
  <linearGradient id="floorShade" x1="0" y1="568" x2="0" y2="800" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#5c3417" stop-opacity="0.34"/><stop offset="0.28" stop-color="#5c3417" stop-opacity="0.04"/>
    <stop offset="0.85" stop-color="#5c3417" stop-opacity="0"/><stop offset="1" stop-color="#5c3417" stop-opacity="0.16"/>
  </linearGradient>
  <radialGradient id="floorSheen" cx="830" cy="690" r="700" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <g clip-path="url(#floorClip)">
    ${floorPlanks()}
    <rect x="0" y="568" width="1662" height="232" fill="url(#floorShade)"/>
    <rect x="0" y="568" width="1662" height="232" fill="url(#floorSheen)"/>
  </g>
  ${plant()}
  ${rug()}
  <rect x="0" y="790" width="1664" height="12" fill="#9b6a3f"/>
  <rect x="0" y="28" width="44" height="774" fill="#f2e0c8" ${ink(3)}/>
  <rect x="32" y="64" width="12" height="726" fill="#7a5638" opacity="0.10"/>
  <rect x="1600" y="28" width="60" height="306" fill="#f2e0c8" ${ink(3)}/>
  <rect x="1588" y="318" width="84" height="18" rx="5" fill="${C.woodDark}" ${ink(2.5)}/>
  <rect x="1586" y="786" width="88" height="16" rx="4" fill="#bfae98" ${ink(2.5, 0.6)}/>`;
  return { vb: [-110, -440, 1880, 1244], body: painted(body) };
}

/* ---------------- the garden ---------------- */

function flowerHead(x, y, r, col) {
  let p = '';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    p += `<circle cx="${f1(x + Math.cos(a) * r)}" cy="${f1(y + Math.sin(a) * r)}" r="${f1(r * 0.75)}" fill="${col}"/>`;
  }
  return p + `<circle cx="${x}" cy="${y}" r="${f1(r * 0.62)}" fill="#ffc94a"/>`;
}

export function gardenBackdrop() {
  const r = rng(23);
  let pickets = '';
  for (let x = 1666; x < 3500; x += 62) {
    pickets += `<path d="M${x},508 V412 L${x + 14},394 L${x + 28},412 V508 Z" fill="#fff7ea" ${ink(2.5, 0.6)}/>`;
    pickets += `<path d="M${x + 20},410 V506" stroke="#e7d6bf" stroke-width="7"/>`;
  }
  let flowers = '';
  for (let x = 1690; x < 3480; x += 20 + r() * 28) {
    const y = 486 + r() * 26;
    flowers += `<path d="M${f1(x)},${f1(y)} q${f1(-3 + r() * 6)},16 0,${f1(26 + r() * 8)}" stroke="#6aa958" stroke-width="3" fill="none"/>`;
    flowers += flowerHead(f1(x), f1(y), 5 + r() * 3, C.flowers[Math.floor(r() * C.flowers.length)]);
  }
  let tufts = '';
  for (let i = 0; i < 170; i++) {
    const x = 1650 + r() * 1830, y = 530 + r() * 262, s = 0.7 + r() * 0.7;
    tufts += `M${f1(x)},${f1(y)} q${f1(-3 * s)},${f1(-14 * s)} ${f1(-9 * s)},${f1(-20 * s)} M${f1(x)},${f1(y)} q0,${f1(-16 * s)} ${f1(1 * s)},${f1(-24 * s)} M${f1(x)},${f1(y)} q${f1(4 * s)},${f1(-13 * s)} ${f1(10 * s)},${f1(-19 * s)} `;
  }
  let daisies = '';
  for (let i = 0; i < 30; i++) {
    daisies += flowerHead(f1(1700 + r() * 1760), f1(560 + r() * 220), 4 + r() * 2, r() < 0.7 ? '#ffffff' : '#ffd6e0');
  }
  let stripes = '';
  for (let x = 1500; x < 3700; x += 240) {
    stripes += `<polygon points="${x},500 ${x + 120},500 ${x - 140},800 ${x - 260},800" fill="#fff" opacity="0.07"/>`;
  }

  const body = `
  <linearGradient id="lawnG" x1="0" y1="480" x2="0" y2="800" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#c2e49c"/><stop offset="1" stop-color="#8cc56a"/>
  </linearGradient>
  <rect x="1640" y="420" width="1860" height="382" fill="url(#lawnG)"/>
  <clipPath id="lawnClip"><rect x="1640" y="500" width="1860" height="302"/></clipPath>
  <g clip-path="url(#lawnClip)">${stripes}</g>
  <rect x="1660" y="420" width="1840" height="13" fill="#f2e4cf" ${ink(2, 0.5)}/>
  <rect x="1660" y="468" width="1840" height="13" fill="#f2e4cf" ${ink(2, 0.5)}/>
  ${pickets}
  <rect x="1640" y="506" width="1860" height="22" fill="#4f7a34" opacity="0.12"/>
  ${flowers}
  <path d="${tufts}" stroke="#72ad57" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.75"/>
  ${daisies}
  <rect x="1662" y="770" width="112" height="22" rx="5" fill="#c99a63" ${ink(2.5, 0.6)}/>
  <path d="M1676,775 V788 M1692,775 V788 M1708,775 V788 M1724,775 V788 M1740,775 V788 M1756,775 V788" stroke="#a97a45" stroke-width="3"/>
  <rect x="1660" y="292" width="20" height="10" fill="#3f3a52"/>
  <path d="M1674,276 L1702,276 L1696,264 L1680,264 Z" fill="#3f3a52"/>
  <rect x="1674" y="276" width="28" height="44" rx="5" fill="#3f3a52" ${ink(2)}/>
  <rect x="1679" y="282" width="18" height="32" rx="3" fill="#fff1bf"/>`;
  return { vb: [1600, 250, 1900, 554], body: painted(body) };
}

function hills({ seed, width, top, amp, color, shade, trees, treeColor, extra = '' }) {
  const r = rng(seed);
  const pts = [];
  for (let x = 0; x <= width; x += 40) {
    const y = top + amp * (Math.sin(x / 270 + seed) * 0.6 + Math.sin(x / 113 + seed * 2) * 0.25 + Math.sin(x / 520) * 0.4);
    pts.push([x, y]);
  }
  let d = `M0,600 L0,${f1(pts[0][1])} `;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += `Q${x0 + 20},${f1(y0)} ${f1((x0 + x1) / 2)},${f1((y0 + y1) / 2)} `;
  }
  d += `L${width},600 Z`;
  let t = '';
  for (let i = 0; i < trees; i++) {
    const x = r() * width;
    const i0 = Math.min(pts.length - 1, Math.round(x / 40));
    const y = pts[i0][1] + 6 + r() * 30;
    const s = 0.7 + r() * 0.6;
    t += `<path d="M${f1(x)},${f1(y)} v${f1(-18 * s)}" stroke="#8a6a4e" stroke-width="${f1(4 * s)}"/>`;
    t += `<circle cx="${f1(x)}" cy="${f1(y - 26 * s)}" r="${f1(15 * s)}" fill="${treeColor}" ${ink(2, 0.35)}/>`;
  }
  return `<linearGradient id="hg${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${shade}"/></linearGradient>
    <path d="${d}" fill="url(#hg${seed})" ${ink(2.5, 0.35)}/>${t}${extra}`;
}

export function hillsFar(width) {
  const windmill = `
    <g transform="translate(${Math.round(width * 0.36)},338)">
      <path d="M-12,0 L-7,-64 L7,-64 L12,0 Z" fill="#f4ede2" ${ink(2, 0.4)}/>
      <g transform="translate(0,-64)">
        <path d="M0,0 L-6,-44 L6,-44 Z M0,0 L44,-6 L44,6 Z M0,0 L6,44 L-6,44 Z M0,0 L-44,6 L-44,-6 Z" fill="#fffaf2" ${ink(1.5, 0.4)}/>
        <circle r="5" fill="#c96b54"/>
      </g>
    </g>
    <g transform="translate(${Math.round(width * 0.62)},352)">
      <rect x="-26" y="-30" width="52" height="30" fill="#d76a58" ${ink(2, 0.4)}/>
      <polygon points="-32,-30 0,-52 32,-30" fill="#b8533f" ${ink(2, 0.4)}/>
      <rect x="-8" y="-18" width="16" height="18" fill="#fff4e4"/>
    </g>`;
  const body = hills({ seed: 3, width, top: 336, amp: 26, color: '#d3eac8', shade: '#c4e1b6', trees: Math.round(width / 120), treeColor: '#b6d9a3', extra: windmill });
  return { vb: [0, 240, width, 360], body: painted(body, { grain: false }) };
}

export function hillsNear(width) {
  const body = hills({ seed: 9, width, top: 398, amp: 24, color: '#bfe1a6', shade: '#aed697', trees: Math.round(width / 150), treeColor: '#97ca7e' });
  return { vb: [0, 300, width, 300], body: painted(body, { grain: false }) };
}

/* ---------------- furniture ---------------- */

export function nightstand() {
  const body = `
  <rect x="-50" y="-16" width="14" height="16" fill="${C.woodDark}"/><rect x="36" y="-16" width="14" height="16" fill="${C.woodDark}"/>
  <rect x="-56" y="-148" width="112" height="134" rx="7" fill="${C.wood}" ${ink(3)}/>
  <rect x="34" y="-146" width="20" height="130" fill="#7a4a28" opacity="0.10"/>
  <rect x="-64" y="-162" width="128" height="18" rx="6" fill="${C.woodDark}" ${ink(3)}/>
  <rect x="-44" y="-128" width="88" height="48" rx="7" fill="${C.woodLight}" ${ink(2.5, 0.6)}/>
  <rect x="-44" y="-72" width="88" height="48" rx="7" fill="${C.woodLight}" ${ink(2.5, 0.6)}/>
  <circle cx="0" cy="-104" r="6.5" fill="#f3d9a0" ${ink(2, 0.6)}/><circle cx="0" cy="-48" r="6.5" fill="#f3d9a0" ${ink(2, 0.6)}/>`;
  return { vb: [-72, -172, 144, 174], body: painted(body) };
}

export function lamp(on) {
  const shade = on ? '#fff7d1' : '#fff0c9';
  const glow = on ? `<ellipse cx="0" cy="-140" rx="44" ry="26" fill="#fffbe8" opacity="0.9" filter="url(#soft)"/>` : '';
  const body = `
  <path d="M-26,0 C-36,-28 -32,-56 -15,-68 L15,-68 C32,-56 36,-28 26,0 Z" fill="#f4a9a0" ${ink(3)}/>
  <path d="M-30,-22 H30 M-31,-40 H31" stroke="#fbd2ca" stroke-width="6"/>
  <rect x="-4" y="-112" width="8" height="46" fill="#c08a5a" ${ink(2, 0.6)}/>
  <path d="M-44,-178 L44,-178 L62,-112 L-62,-112 Z" fill="${shade}" ${ink(3)}/>
  ${glow}
  <path d="M-62,-112 q8,10 16,0 q8,10 16,0 q8,10 16,0 q8,10 16,0 q8,10 16,0 q8,10 16,0 q8,10 16,0 q8,10 16,0" fill="#f4a9a0" ${ink(2, 0.6)}/>
  <path d="M-44,-178 H44" stroke="#f4a9a0" stroke-width="6"/>`;
  return { vb: [-72, -192, 144, 196], body: painted(body) };
}

export function bedBack() {
  const body = `
  <rect x="-242" y="-254" width="44" height="254" rx="20" fill="${C.wood}" ${ink(3)}/>
  <rect x="-233" y="-228" width="26" height="196" rx="11" fill="${C.woodLight}"/>
  <path transform="translate(-220,-214)" d="M0,6 C-12,-4 -10,-14 -4,-14 C-1,-14 0,-11 0,-9 C0,-11 1,-14 4,-14 C10,-14 12,-4 0,6 Z" fill="#f08b9f" ${ink(1.5, 0.6)}/>
  <rect x="204" y="-172" width="40" height="172" rx="18" fill="${C.wood}" ${ink(3)}/>
  <rect x="213" y="-150" width="22" height="120" rx="10" fill="${C.woodLight}"/>
  <rect x="-212" y="-96" width="424" height="56" rx="12" fill="#bf8350" ${ink(3)}/>
  <circle cx="-120" cy="-68" r="8" fill="${C.woodLight}"/><circle cx="0" cy="-68" r="8" fill="${C.woodLight}"/><circle cx="120" cy="-68" r="8" fill="${C.woodLight}"/>
  <rect x="-208" y="-136" width="416" height="50" rx="18" fill="#fffaf1" ${ink(2.5)}/>
  <path d="M-200,-128 C-208,-160 -172,-172 -132,-168 C-96,-166 -82,-152 -86,-134 C-90,-118 -190,-112 -200,-128 Z" fill="#fffdf8" ${ink(2.5)}/>
  <path d="M-188,-132 C-160,-126 -120,-128 -98,-138" stroke="#e8dccb" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return { vb: [-250, -262, 500, 266], body: painted(body) };
}

export function bedQuilt() {
  let squares = '';
  const cols = ['#ffd37a', '#f6a9a0', '#a8d8b0', '#fff3dc', '#b9d3f2'];
  let i = 0;
  for (let x = -110; x < 220; x += 44) {
    for (let y = -150; y < -50; y += 34) squares += `<rect x="${x}" y="${y}" width="44" height="34" fill="${cols[(i++ * 3) % cols.length]}" opacity="0.85"/>`;
    i++;
  }
  const shape = 'M-112,-138 C-40,-148 120,-146 212,-138 L216,-72 C120,-58 -30,-60 -112,-70 Z';
  const body = `
  <clipPath id="quiltClip"><path d="${shape}"/></clipPath>
  <path d="${shape}" fill="#8fc3e8"/>
  <g clip-path="url(#quiltClip)">${squares}
    <path d="M-110,-117 H220 M-110,-83 H220 M-66,-150 V-50 M-22,-150 V-50 M22,-150 V-50 M66,-150 V-50 M110,-150 V-50 M154,-150 V-50 M198,-150 V-50" stroke="#fff" stroke-width="2" stroke-dasharray="6 6" opacity="0.8"/>
    <rect x="-116" y="-160" width="40" height="120" fill="#fff6e6"/>
    <path d="M-76,-150 V-50" stroke="${INK}" stroke-width="2" opacity="0.4"/>
  </g>
  <path d="${shape}" fill="none" ${ink(3)}/>`;
  return { vb: [-122, -156, 346, 104], body: painted(body) };
}

export function wardrobeBody() {
  const body = `
  <rect x="-128" y="-18" width="24" height="18" fill="${C.woodDeep}"/><rect x="104" y="-18" width="24" height="18" fill="${C.woodDeep}"/>
  <rect x="-142" y="-42" width="284" height="28" rx="7" fill="${C.woodDark}" ${ink(3)}/>
  <rect x="-134" y="-472" width="268" height="436" rx="10" fill="#b5774a" ${ink(3)}/>
  <rect x="110" y="-466" width="22" height="428" fill="#6b3d1f" opacity="0.12"/>
  <path d="M-152,-470 L152,-470 L144,-494 Q0,-526 -144,-494 Z" fill="${C.woodDark}" ${ink(3)}/>
  <path d="M-130,-486 Q0,-512 130,-486" stroke="${C.woodLight}" stroke-width="5" fill="none"/>
  <circle cx="0" cy="-500" r="9" fill="#f7d27a" ${ink(2, 0.6)}/>
  <rect x="-118" y="-102" width="236" height="54" rx="9" fill="${C.woodLight}" ${ink(2.5, 0.6)}/>
  <circle cx="-40" cy="-75" r="7" fill="#f3d9a0" ${ink(2, 0.6)}/><circle cx="40" cy="-75" r="7" fill="#f3d9a0" ${ink(2, 0.6)}/>`;
  return { vb: [-160, -532, 320, 534], body: painted(body) };
}

export function wardrobeInside() {
  const body = `
  <linearGradient id="inG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f3221"/><stop offset="1" stop-color="#734b33"/></linearGradient>
  <rect x="-118" y="-454" width="236" height="342" rx="6" fill="url(#inG)"/>
  <path d="M-110,-418 H110" stroke="#e2cba5" stroke-width="7" stroke-linecap="round"/>
  <rect x="-118" y="-156" width="236" height="10" fill="#8c5d3e"/>`;
  return { vb: [-120, -456, 240, 346], body: painted(body, { grain: false }) };
}

// Hinged at local x = 0; the right-hand door is the same art mirrored.
export function wardrobeDoor() {
  const body = `
  <rect x="0" y="-452" width="118" height="340" rx="7" fill="#c98c5a" ${ink(3)}/>
  <rect x="14" y="-436" width="90" height="140" rx="9" fill="#d39a66" stroke="#a8713f" stroke-width="3"/>
  <rect x="14" y="-284" width="90" height="156" rx="9" fill="#d39a66" stroke="#a8713f" stroke-width="3"/>
  <path transform="translate(59,-366)" d="M0,-24 L7,-8 L24,-7 L11,4 L15,21 L0,12 L-15,21 L-11,4 L-24,-7 L-7,-8 Z" fill="#f7d27a" ${ink(2, 0.6)}/>
  <circle cx="104" cy="-282" r="8" fill="#f3d9a0" ${ink(2, 0.6)}/>`;
  return { vb: [-4, -456, 126, 348], body: painted(body) };
}

export function curtain() {
  let folds = '';
  for (let x = 0; x < 186; x += 31) {
    folds += `<rect x="${x}" y="0" width="15" height="272" fill="#fbd3db" opacity="0.8"/>`;
    folds += `<rect x="${x + 25}" y="0" width="6" height="272" fill="#d97f96" opacity="0.35"/>`;
  }
  let dots = '';
  for (let y = 26; y < 250; y += 44) {
    for (let x = 12 + ((y / 44) % 2) * 15; x < 180; x += 31) dots += `<circle cx="${x}" cy="${y}" r="4.5" fill="#fff" opacity="0.85"/>`;
  }
  const shape = 'M0,0 H186 V256 q-15.5,16 -31,0 q-15.5,16 -31,0 q-15.5,16 -31,0 q-15.5,16 -31,0 q-15.5,16 -31,0 q-15.5,16 -31,0 Z';
  const body = `
  <clipPath id="cClip"><path d="${shape}"/></clipPath>
  <path d="${shape}" fill="#f6b3c1"/>
  <g clip-path="url(#cClip)">${folds}${dots}</g>
  <path d="${shape}" fill="none" ${ink(3)}/>
  <path d="M0,0 H186" stroke="#e2879f" stroke-width="10"/>`;
  return { vb: [-4, -6, 194, 290], body: painted(body) };
}

export function door() {
  const body = `
  <rect x="0" y="0" width="84" height="460" rx="7" fill="#d58b5c" ${ink(3)}/>
  <rect x="12" y="130" width="60" height="120" rx="8" fill="#de9a6c" stroke="#ad6a3e" stroke-width="3"/>
  <rect x="12" y="270" width="60" height="170" rx="8" fill="#de9a6c" stroke="#ad6a3e" stroke-width="3"/>
  <circle cx="42" cy="68" r="28" fill="${C.cream}" ${ink(2.5)}/>
  <circle cx="42" cy="68" r="20" fill="#bfe1f1"/>
  <path d="M30,58 a16,16 0 0 1 14,-8" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.8"/>
  <circle cx="68" cy="262" r="8" fill="#f6d68f" ${ink(2, 0.6)}/>`;
  return { vb: [-4, -4, 92, 468], body: painted(body) };
}

/* ---------------- garden things ---------------- */

export function strollerBack() {
  const body = `
  <path d="M-70,-112 L-122,-248" stroke="#8b8fb5" stroke-width="12" stroke-linecap="round"/>
  <path d="M-70,-112 L-122,-248" stroke="${INK}" stroke-width="2" stroke-opacity="0.35"/>
  <rect x="-148" y="-266" width="50" height="22" rx="11" fill="#5b5f7e" ${ink(2.5)} transform="rotate(-20 -123 -255)"/>
  <ellipse cx="0" cy="-150" rx="102" ry="18" fill="#cf6f8a" ${ink(2.5, 0.6)}/>
  <path d="M-104,-150 C-108,-236 -24,-270 40,-216 C14,-196 0,-174 -4,-150 Z" fill="#ef8aa3" ${ink(3)}/>
  <path d="M-86,-156 C-88,-216 -40,-244 10,-232 M-62,-152 C-60,-196 -30,-222 16,-214" stroke="#f9b8c8" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M-104,-150 C-108,-236 -24,-270 40,-216" stroke="#fff1e6" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  return { vb: [-160, -284, 320, 290], body: painted(body) };
}

export function strollerFront() {
  const wheel = (cx) => `
    <circle cx="${cx}" cy="-36" r="34" fill="#4a4e69" ${ink(3)}/>
    <circle cx="${cx}" cy="-36" r="22" fill="#e9e9f2"/>
    <path d="M${cx - 20},-36 H${cx + 20} M${cx},-56 V-16 M${cx - 14},-50 L${cx + 14},-22 M${cx + 14},-50 L${cx - 14},-22" stroke="#9fa3c4" stroke-width="3"/>
    <circle cx="${cx}" cy="-36" r="6" fill="#4a4e69"/>`;
  const body = `
  <path d="M-46,-74 L-64,-40 M46,-74 L64,-40" stroke="#8b8fb5" stroke-width="10" stroke-linecap="round"/>
  ${wheel(-64)}${wheel(64)}
  <path d="M-106,-152 L106,-152 C102,-98 70,-64 0,-62 C-70,-64 -102,-98 -106,-152 Z" fill="#f4a7b9" ${ink(3)}/>
  <path d="M-104,-148 L104,-148" stroke="#fff1e6" stroke-width="10" stroke-linecap="round"/>
  <path d="M-80,-118 C-40,-108 40,-108 80,-118" stroke="#f9c6d3" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path transform="translate(30,-104)" d="M0,8 C-15,-4 -13,-17 -5,-17 C-1,-17 0,-13 0,-11 C0,-13 1,-17 5,-17 C13,-17 15,-4 0,8 Z" fill="#fff" opacity="0.9"/>`;
  return { vb: [-120, -170, 240, 174], body: painted(body) };
}

export function treeTrunk() {
  const body = `
  <path d="M-46,4 C-30,-60 -28,-200 -36,-330 L-90,-420 L-70,-430 L-14,-360 L-6,-450 L14,-450 L18,-360 L76,-440 L94,-428 L36,-330 C30,-200 36,-60 52,4 Z" fill="#a8774f" ${ink(3)}/>
  <path d="M-20,-40 C-16,-120 -18,-200 -22,-280 M14,-60 C18,-140 16,-220 12,-300 M-4,-20 C-2,-80 -2,-120 -4,-170" stroke="#7d5234" stroke-width="3.5" fill="none" stroke-linecap="round" opacity="0.55"/>
  <ellipse cx="2" cy="-232" rx="17" ry="22" fill="#4a2e1d" ${ink(2.5, 0.6)}/>
  <path d="M-46,4 q-22,2 -34,8 M52,4 q22,2 34,8" stroke="#a8774f" stroke-width="12" stroke-linecap="round"/>`;
  return { vb: [-110, -470, 220, 486], body: painted(body) };
}

export function treeCanopy() {
  const blobs = [
    [-190, -470, 110], [-60, -560, 150], [100, -540, 140], [-230, -360, 92], [40, -440, 150],
    [190, -420, 108], [-110, -400, 120], [-10, -650, 110], [150, -650, 90], [-170, -600, 96],
  ];
  const stroke = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${INK}" stroke-width="7" stroke-opacity="0.55"/>`).join('');
  const fill = blobs.map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.leaf[i % 3]}"/>`).join('');
  const r = rng(41);
  let hi = '';
  for (let i = 0; i < 46; i++) {
    const [bx, by, br] = blobs[Math.floor(r() * blobs.length)];
    const a = r() * Math.PI * 2, d = r() * br * 0.8;
    hi += `<path transform="translate(${f1(bx + Math.cos(a) * d)},${f1(by + Math.sin(a) * d)}) rotate(${f1(r() * 360)})" d="M-12,0 Q0,-8 12,0 Q0,8 -12,0 Z" fill="${r() < 0.5 ? C.leaf[3] : '#5f9d4f'}" opacity="0.8"/>`;
  }
  const body = `<g>${stroke}${fill}${hi}
    <circle cx="-80" cy="-620" r="60" fill="#fff" opacity="0.10"/>
  </g>`;
  return { vb: [-350, -800, 680, 520], body: painted(body) };
}

export function cloud(kind) {
  const fill = kind === 'rain' ? '#b8c5d9' : kind === 'snow' ? '#f6f9ff' : '#ffffff';
  const shade = kind === 'rain' ? '#97a6c0' : kind === 'snow' ? '#d6e3f6' : '#dce9f6';
  const blobs = [[-120, 14, 58], [-52, -34, 78], [36, -46, 70], [108, 2, 62], [0, 20, 78], [-158, 42, 40], [156, 42, 40]];
  const outline = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="7" stroke-opacity="0.5"/>`).join('');
  const fills = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');
  const clip = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  const eyes = kind === 'rain'
    ? `<circle cx="-34" cy="6" r="8" fill="${INK}"/><circle cx="34" cy="6" r="8" fill="${INK}"/><circle cx="-31" cy="3" r="2.6" fill="#fff"/><circle cx="37" cy="3" r="2.6" fill="#fff"/>
       <ellipse cx="0" cy="32" rx="10" ry="12" fill="#8a4a52"/>`
    : `<path d="M-46,6 q12,-14 24,0 M22,6 q12,-14 24,0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
       <path d="M-16,26 q16,16 32,0" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  const body = `
  <clipPath id="cloudClip">${clip}</clipPath>
  ${outline}${fills}
  <g clip-path="url(#cloudClip)"><ellipse cx="0" cy="96" rx="210" ry="66" fill="${shade}"/>
    <ellipse cx="-50" cy="-70" rx="70" ry="24" fill="#fff" opacity="0.55"/></g>
  ${eyes}
  <ellipse cx="-62" cy="28" rx="15" ry="9" fill="#ff9fb2" opacity="0.6"/><ellipse cx="62" cy="28" rx="15" ry="9" fill="#ff9fb2" opacity="0.6"/>`;
  return { vb: [-210, -130, 420, 224], body: painted(body, { grain: false }) };
}

export function sunFace() {
  const body = `
  <radialGradient id="sunG" cx="-0.2" cy="-0.25" r="1.1">
    <stop offset="0" stop-color="#fff6b8"/><stop offset="0.55" stop-color="#ffd650"/><stop offset="1" stop-color="#ffb83a"/>
  </radialGradient>
  <circle r="64" fill="url(#sunG)" stroke="#e59a2a" stroke-width="4"/>
  <path d="M-30,-6 q10,-12 20,0 M10,-6 q10,-12 20,0" stroke="#8a5320" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M-16,16 q16,16 32,0" stroke="#8a5320" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="-38" cy="14" rx="11" ry="7" fill="#ff8f6b" opacity="0.5"/><ellipse cx="38" cy="14" rx="11" ry="7" fill="#ff8f6b" opacity="0.5"/>`;
  return { vb: [-72, -72, 144, 144], body: painted(body, { grain: false, wobble: false }) };
}

export function moon() {
  const body = `
  <mask id="moonMask"><rect x="-90" y="-90" width="180" height="180" fill="#fff"/><circle cx="34" cy="-22" r="62" fill="#000"/></mask>
  <radialGradient id="moonG" cx="-0.3" cy="0.1" r="1"><stop offset="0" stop-color="#fffbe2"/><stop offset="1" stop-color="#f6e39a"/></radialGradient>
  <g mask="url(#moonMask)"><circle r="70" fill="url(#moonG)" stroke="#d9c06a" stroke-width="4"/></g>
  <path d="M-40,8 q9,8 18,0" stroke="#8a7440" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <path d="M-34,30 q8,7 16,-1" stroke="#8a7440" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="-52" cy="22" rx="9" ry="6" fill="#ffb1a1" opacity="0.55"/>
  <path d="M-62,-36 C-48,-80 6,-82 16,-50 L-10,-40 Z" fill="#7d8fd8" ${ink(2.5, 0.5)}/>
  <circle cx="20" cy="-48" r="9" fill="#fff6c9" ${ink(2, 0.5)}/>`;
  return { vb: [-92, -92, 184, 184], body: painted(body, { grain: false, wobble: false }) };
}

export function bottle() {
  const body = `
  <rect x="-25" y="-96" width="50" height="94" rx="15" fill="#fbfdff" ${ink(3)}/>
  <rect x="-21" y="-62" width="42" height="56" rx="11" fill="#fff4dc"/>
  <path d="M-25,-70 H-12 M-25,-50 H-12 M-25,-30 H-12" stroke="#9cc6e6" stroke-width="3"/>
  <rect x="-28" y="-110" width="56" height="18" rx="7" fill="#8fc3e8" ${ink(2.5)}/>
  <path d="M-14,-110 C-14,-140 14,-140 14,-110 Z" fill="#f2d2a6" ${ink(2.5)}/>
  <path d="M-12,-80 V-20" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`;
  return { vb: [-34, -138, 68, 140], body: painted(body) };
}

export function apple() {
  const body = `
  <path d="M0,-50 C-30,-64 -46,-36 -40,-16 C-34,6 -14,4 0,0 C14,4 34,6 40,-16 C46,-36 30,-64 0,-50 Z" fill="#f25f5c" ${ink(3)}/>
  <path d="M0,-52 q2,-14 8,-18" stroke="#7a4a2a" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M6,-62 q18,-14 26,2 q-14,10 -26,-2 Z" fill="#7dbd66" ${ink(2, 0.6)}/>
  <ellipse cx="-20" cy="-36" rx="7" ry="11" fill="#fff" opacity="0.5" transform="rotate(20 -20 -36)"/>`;
  return { vb: [-48, -82, 96, 86], body: painted(body) };
}

export function wand() {
  const body = `
  <rect x="-7" y="-92" width="14" height="92" rx="7" fill="#f7a8c4" ${ink(3)}/>
  <path d="M-7,-30 H7 M-7,-50 H7" stroke="#fff" stroke-width="4" opacity="0.7"/>
  <circle cx="0" cy="-124" r="32" fill="#d8f0ff" fill-opacity="0.45" stroke="#f47fb0" stroke-width="9"/>
  <circle cx="0" cy="-124" r="32" fill="none" ${ink(2, 0.5)}/>
  <path d="M-16,-138 a20,20 0 0 1 16,-10" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return { vb: [-46, -162, 92, 166], body: painted(body) };
}

// Everything the game rasterizes, by name. Backdrops and hills are built
// separately because their size depends on the screen.
export const SPRITES = {
  nightstand, lampOff: () => lamp(false), lampOn: () => lamp(true),
  bedBack, bedQuilt, wardrobeBody, wardrobeInside, wardrobeDoor, curtain, door,
  strollerBack, strollerFront, treeTrunk, treeCanopy,
  cloud: () => cloud('clear'), cloudRain: () => cloud('rain'), cloudSnow: () => cloud('snow'),
  sun: sunFace, moon, bottle, apple, wand,
};
