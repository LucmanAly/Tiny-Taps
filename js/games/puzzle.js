// Puzzle Fit: classic animal silhouettes plus a Shape Builder mode.
// In Shapes mode a toy (car, boat, rocket, house…) is drawn as dashed
// outlines. The child drags chunky shape pieces into the outline each one
// fills — a peg puzzle where shape and size decide the fit — and the finished
// toy comes alive: it drives, sails, launches or opens its door for a friend.

import { ANIMALS, displayArt, animal as findAnimal } from '../data/animals.js';
import { BUILDS, VISITORS } from '../data/builds.js';
import { shuffle, pickN, pick, cycler } from '../engine/rand.js';
import { makeDraggable, tapPlaceEnabled } from '../engine/drag.js';
import { fadeSwap } from '../engine/ui.js';
import { childKey } from '../engine/children.js';

const MODE_KEY = 'tinytaps-puzzle-mode';
const SVGNS = 'http://www.w3.org/2000/svg';
const INK = '#3a3357';
const MAX_SCALE = 3;
const BLEED = 600;   // px a ground band reaches past the content box

// One no-repeat picker per difficulty level; higher levels add bigger builds.
const pickers = new Map();
let lastBuildId = null;
function nextBuild(level) {
  const lv = Math.max(1, Math.min(3, level || 1));
  if (!pickers.has(lv)) pickers.set(lv, cycler(BUILDS.filter(b => b.level <= lv)));
  let build = pickers.get(lv)();
  if (build.id === lastBuildId) build = pickers.get(lv)();
  lastBuildId = build.id;
  return build;
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = c => Math.round(c * (1 - amount));
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function partArt(part) {
  const stroke = part.stroke || shade(part.color, 0.28);
  return `${part.under || ''}<path class="sb-shape" d="${part.d}" fill="${part.color}" stroke="${stroke}" stroke-width="4" stroke-linejoin="round"/>${part.art || ''}`;
}

// The dashed cut-out a piece fits into: a near-opaque hole in the scene. On
// the easiest level it is tinted with the piece's own colour as an extra clue.
function slotSvg(part, tint) {
  return `<path d="${part.d}" fill="#ffffff" fill-opacity="0.86"/>` +
    `<path class="sb-slot" d="${part.d}" fill="${tint ? part.color : '#ffffff'}" fill-opacity="${tint ? 0.38 : 0}" stroke="${INK}" stroke-opacity="0.5" stroke-width="4" stroke-dasharray="11 8" stroke-linejoin="round"/>`;
}

// A tray piece: a darker copy underneath gives it chunky toy-block depth, and
// an invisible pad keeps even a small piece easy to grab.
function pieceSvg(i, part, k, delay) {
  const stroke = part.stroke || shade(part.color, 0.28);
  const hw = Math.max(part.w + 18, 76 / k);
  const hh = Math.max(part.h + 18, 76 / k);
  const lift = delay == null ? '<g class="sb-lift">' : `<g class="sb-lift sb-pop" style="animation-delay:${delay}ms">`;
  return `<g class="sb-piece" data-i="${i}">${lift}` +
    `<rect x="${-hw / 2}" y="${-hh / 2}" width="${hw}" height="${hh}" fill="transparent"/>` +
    `<path d="${part.d}" transform="translate(0 7)" fill="${stroke}"/>${partArt(part)}</g></g>`;
}

function buildBox(build) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of build.parts) {
    x0 = Math.min(x0, p.x - p.w / 2);
    y0 = Math.min(y0, p.y - p.h / 2);
    x1 = Math.max(x1, p.x + p.w / 2);
    y1 = Math.max(y1, p.y + p.h / 2);
  }
  if (build.extent) {
    const [a, b, c, d] = build.extent;
    x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
  }
  if (build.ground != null) y1 = Math.max(y1, build.ground);
  return { x0: x0 - 12, y0: y0 - 12, x1: x1 + 12, y1: y1 + 12 };
}

// Shelf-pack tray pieces into `box`, spacing rows and pieces evenly. Returns
// a Map of piece → centre, or null when they do not fit (unless forced).
function pack(items, box, force = false) {
  const inner = 6;
  const W = box.w - inner * 2;
  const H = box.h - inner * 2;
  const rows = [];
  let row = null;
  for (const it of items) {
    if (!force && (it.w > W || it.h > H)) return null;
    if (!row || (row.items.length && row.w + it.w > W)) {
      row = { items: [], w: 0, h: 0 };
      rows.push(row);
    }
    row.items.push(it);
    row.w += it.w;
    row.h = Math.max(row.h, it.h);
  }
  const total = rows.reduce((sum, r) => sum + r.h, 0);
  if (!force && total > H) return null;
  const out = new Map();
  const vgap = Math.max(0, (H - total) / (rows.length + 1));
  let y = box.y + inner + vgap;
  for (const r of rows) {
    const hgap = Math.max(0, (W - r.w) / (r.items.length + 1));
    let x = box.x + inner + hgap;
    for (const it of r.items) {
      out.set(it.key, { x: x + it.w / 2, y: y + r.h / 2 });
      x += it.w + hgap;
    }
    y += r.h + vgap;
  }
  return out;
}

// Split the stage into a build area and a piece tray (beside it in landscape,
// under it in portrait). The build gets scale `s`; tray pieces rest at a
// smaller uniform scale `t` — relative sizes stay true — and grow to `s` when
// lifted so they match their outline exactly.
function layout(parts, bb, tray, cw, ch) {
  const land = cw > ch * 1.08;
  const pad = Math.min(24, Math.max(8, Math.min(cw, ch) * 0.03));
  const gap = Math.min(30, Math.max(12, Math.min(cw, ch) * 0.04));
  const bw = bb.x1 - bb.x0;
  const bh = bb.y1 - bb.y0;
  const items = t => tray.map(i => {
    const b = (parts[i].bleed || 0) * 2;
    return { key: i, w: (parts[i].w + b) * t + gap, h: (parts[i].h + b) * t + gap };
  });
  let best = null;
  for (const split of land ? [0.54, 0.6, 0.66] : [0.52, 0.58, 0.64]) {
    const area = land
      ? { x: pad, y: pad, w: cw * split - pad * 1.5, h: ch - pad * 2 }
      : { x: pad, y: pad, w: cw - pad * 2, h: ch * split - pad * 1.5 };
    const box = land
      ? { x: cw * split + pad * 0.5, y: pad, w: cw * (1 - split) - pad * 1.5, h: ch - pad * 2 }
      : { x: pad, y: ch * split + pad * 0.5, w: cw - pad * 2, h: ch * (1 - split) - pad * 1.5 };
    if (area.w <= 0 || area.h <= 0 || box.w <= 0 || box.h <= 0) continue;
    const s = Math.min(area.w / bw, area.h / bh, MAX_SCALE);
    let t = s;
    let homes = pack(items(t), box);
    while (!homes && t > 0.12) {
      t *= 0.92;
      homes = pack(items(t), box);
    }
    if (!homes) homes = pack(items(t), box, true);
    const score = Math.min(s, t / 0.7);
    if (!best || score > best.score + 0.02) best = { score, s, t, area, box, homes };
  }
  if (!best) {
    const box = { x: 0, y: 0, w: cw, h: ch };
    best = { s: 0.2, t: 0.2, area: box, box, homes: pack(items(0.2), box, true) };
  }
  const { s, area } = best;
  best.bx = area.x + (area.w - bw * s) / 2 - bb.x0 * s;
  best.by = area.y + (area.h - bh * s) / 2 - bb.y0 * s;
  return best;
}

// Ground bands span the whole stage width (bleeding past the content box to
// the screen edges), so they are drawn in pixels.
function groundSvg(build, L, cw) {
  if (build.ground == null) return '';
  const s = L.s;
  const gy = L.by + build.ground * s;
  const x0 = -BLEED;
  const x1 = cw + BLEED;
  const band = (y, h, fill) => `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="${h}" fill="${fill}"/>`;
  switch (build.scene) {
    case 'road':
      return band(gy - 6 * s, 8 * s, '#6fbf4a') + band(gy, 46 * s, '#8f93a8') +
        `<path d="M${x0} ${gy + 23 * s}H${x1}" stroke="#fff" stroke-width="${5 * s}" stroke-dasharray="${26 * s} ${20 * s}"/>`;
    case 'snow':
      return band(gy, 44 * s, '#ffffff') + `<path d="M${x0} ${gy}H${x1}" stroke="#cfe0f2" stroke-width="${4 * s}"/>`;
    case 'sea': {
      const step = 44 * s;
      const a = 7 * s;
      let d = `M${x0} ${gy}`;
      let x = x0;
      for (; x < x1; x += step) d += `Q${x + step / 4} ${gy - a} ${x + step / 2} ${gy}T${x + step} ${gy}`;
      return `<path d="${d}V${gy + 60 * s}H${x0}Z" fill="#5fc9e8"/><path d="${d}" fill="none" stroke="#bfeefa" stroke-width="${4 * s}"/>`;
    }
    case 'rails': {
      let sleepers = '';
      for (let x = x0; x < x1; x += 34 * s) sleepers += `<rect x="${x}" y="${gy + 2 * s}" width="${16 * s}" height="${12 * s}" rx="${3 * s}" fill="#8a5a3c"/>`;
      return band(gy, 40 * s, '#8fd16a') + sleepers + band(gy - 1 * s, 6 * s, '#7c86a6');
    }
    default:
      return band(gy, 40 * s, '#8fd16a') + band(gy, 6 * s, '#6fbf4a');
  }
}

// Scenery that hugs the build itself, drawn in blueprint units.
function backdropSvg(build, bb) {
  let out = '';
  if (build.scene === 'tank') {
    const { x0, y0, x1, y1 } = bb;
    const w = x1 - x0;
    const h = y1 - y0;
    out += `<clipPath id="sb-tank"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="26"/></clipPath>` +
      `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="26" fill="#d3f0ff"/>` +
      `<g clip-path="url(#sb-tank)"><rect x="${x0}" y="${y1 - 22}" width="${w}" height="22" fill="#ffe3a3"/>` +
      `<path d="M${x0 + 22} ${y1 - 12}q-10 -16 0 -32t0 -32M${x1 - 22} ${y1 - 12}q10 -14 0 -28t0 -28" fill="none" stroke="#6fcf5f" stroke-width="8" stroke-linecap="round"/></g>` +
      `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="26" fill="none" stroke="#a3d8f2" stroke-width="5"/>`;
  }
  return out + (build.backdrop || '');
}

function flameSvg(build) {
  if (!build.flame) return '';
  return `<g transform="translate(${build.flame.x} ${build.flame.y})"><g class="sb-flame" style="opacity:0">` +
    '<path d="M-32 0Q-20 60 0 92Q20 60 32 0Z" fill="#ffcf3d"/><path d="M-18 0Q-10 36 0 58Q10 36 18 0Z" fill="#ff8c2e"/></g></g>';
}

function peekSvg(build, visitor) {
  if (!build.peek || !visitor) return '';
  const { x, y, size } = build.peek;
  return `<g transform="translate(${x} ${y})"><g class="sb-peek" style="visibility:hidden">` +
    `<image href="${visitor.art}" x="${-size / 2}" y="${-size}" width="${size}" height="${size}"/></g></g>`;
}

const easeOut = p => 1 - (1 - p) ** 3;
const easeBack = p => 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="pz-i" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0%" stop-color="#7ed67e"/><stop offset="100%" stop-color="#3a9a4a"/></linearGradient></defs>
  <path d="M20 20 H44 C40 12 48 6 53 12 C58 6 66 12 62 20 H84 V42 C92 38 98 46 92 51 C98 56 92 64 84 60 V84 H60 C64 92 56 98 51 92 C46 98 38 92 42 84 H20 V60 C12 64 6 56 12 51 C6 46 12 38 20 42 Z" fill="url(#pz-i)"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt, recordOutcome, difficulty } = ctx;
  let alive = true;
  let mode = localStorage.getItem(childKey(MODE_KEY)) === 'shapes' ? 'shapes' : 'animals';
  let epoch = 0;
  let teardown = null;

  const shell = document.createElement('div');
  shell.className = 'puzzle-shell';
  shell.innerHTML = '<div class="puzzle-tabs" role="group" aria-label="Puzzle type"></div><div class="puzzle-content"></div>';
  stage.appendChild(shell);
  const tabs = shell.querySelector('.puzzle-tabs');
  const content = shell.querySelector('.puzzle-content');

  [['animals', 'Animals'], ['shapes', 'Shapes']].forEach(([id, label]) => {
    const button = document.createElement('button');
    button.className = 'puzzle-tab';
    button.dataset.mode = id;
    button.textContent = label;
    button.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (mode === id) return;
      mode = id;
      epoch++;
      localStorage.setItem(childKey(MODE_KEY), mode);
      audio.pop();
      newRound(true);
    });
    tabs.appendChild(button);
  });

  function markMode() {
    tabs.querySelectorAll('.puzzle-tab').forEach(b =>
      b.classList.toggle('selected', b.dataset.mode === mode));
  }

  function buildAnimals(roundEpoch) {
    let remaining = 4;
    const four = pickN(ANIMALS, 4);
    content.innerHTML = '<div class="puzzle-board"></div><div class="puzzle-tray"></div>';
    const board = content.querySelector('.puzzle-board');
    const tray = content.querySelector('.puzzle-tray');
    const slots = new Map();

    four.forEach(a => {
      const slot = document.createElement('div');
      slot.className = 'puzzle-slot pop-in';
      slot.innerHTML = `<img src="${displayArt(a)}" alt="">`;
      board.appendChild(slot);
      slots.set(a.id, slot);
    });

    shuffle(four).forEach(a => {
      const piece = document.createElement('div');
      piece.className = 'puzzle-piece pop-in';
      piece.innerHTML = `<img src="${displayArt(a)}" alt="${a.name}">`;
      tray.appendChild(piece);
      makeDraggable(piece, {
        getTargets: () => [...slots.entries()]
          .filter(([, slot]) => !slot.classList.contains('filled'))
          .map(([id, slot]) => ({ el: slot, data: id })),
        onDrop: hitId => {
          if (!alive || epoch !== roundEpoch || !hitId) return 'reject';
          if (hitId !== a.id) {
            if (recordOutcome) recordOutcome(false, `animal:${a.name}`);
            audio.boing();
            speech.encourage();
            return 'reject';
          }
          if (recordOutcome) recordOutcome(true, `animal:${a.name}`);
          const slot = slots.get(a.id);
          slot.classList.add('filled');
          piece.style.visibility = 'hidden';
          audio.chime();
          const r = slot.getBoundingClientRect();
          celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 18 });
          remaining--;
          if (remaining === 0) {
            setTimeout(() => {
              if (!alive || epoch !== roundEpoch) return;
              celebrate.big();
              setTimeout(() => { if (alive && epoch === roundEpoch) newRound(false); }, 800);
            }, 400);
          }
          return 'accept';
        },
      });
    });
  }

  // Shape Builder round. Returns a teardown for its observers, timers and
  // animation frames.
  function buildShapes(roundEpoch) {
    const level = difficulty ? difficulty() : 1;
    const build = nextBuild(level);
    const parts = build.parts;
    const bb = buildBox(build);
    const tint = level <= 1;
    const visitor = build.go.kind === 'peek' ? findAnimal(pick(VISITORS)) : null;
    const voiced = visitor ? `animal:${visitor.id}` : (build.go.sound || '').startsWith('animal:') ? build.go.sound : null;
    if (voiced) {
      const a = findAnimal(voiced.slice(7));
      if (a && a.sound) audio.load(voiced, a.sound).catch(() => {});
    }

    const left = new Set(parts.map((_, i) => i));   // pieces still in the tray
    const open = new Set(parts.map((_, i) => i));   // outlines still empty
    const filledBy = new Map();                      // outline → piece placed in it
    const order = shuffle(parts.map((_, i) => i));
    const pos = new Map();                           // piece → { x, y, k } in px
    const els = new Map();                           // piece → its <g>
    const tweens = new Map();
    const timers = new Set();
    let L = null;
    let drag = null;
    let picked = null;                               // tap-to-place: lifted piece
    let phase = 'play';
    let lastEncourage = 0;
    let lastSize = '';
    let firstRender = true;

    content.innerHTML = '<svg class="sb-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Shape builder puzzle"></svg>';
    const svg = content.firstElementChild;

    const live = () => alive && epoch === roundEpoch && phase !== 'gone';

    function later(ms, fn) {
      const id = setTimeout(() => { timers.delete(id); if (live()) fn(); }, ms);
      timers.add(id);
    }

    function tween(ms, ease, step, done) {
      const t0 = performance.now();
      const handle = { raf: 0, cancelled: false, cancel() { this.cancelled = true; cancelAnimationFrame(this.raf); } };
      const tick = now => {
        if (handle.cancelled || !live()) return;
        const p = Math.min(1, (now - t0) / ms);
        step(ease(p));
        if (p < 1) handle.raf = requestAnimationFrame(tick);
        else if (done) done();
      };
      handle.raf = requestAnimationFrame(tick);
      return handle;
    }

    function apply(i) {
      const g = els.get(i);
      const p = pos.get(i);
      if (g && p) g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.k.toFixed(3)})`);
    }

    function cancelTween(i) {
      const t = tweens.get(i);
      if (t) { t.cancel(); tweens.delete(i); }
    }

    function glide(i, to, ms, ease, done) {
      cancelTween(i);
      const from = { ...pos.get(i) };
      tweens.set(i, tween(ms, ease, e => {
        pos.set(i, { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, k: from.k + (to.k - from.k) * e });
        apply(i);
      }, () => { tweens.delete(i); if (done) done(); }));
    }

    const slotPx = j => ({ x: L.bx + parts[j].x * L.s, y: L.by + parts[j].y * L.s });

    function render() {
      const r = svg.getBoundingClientRect();
      const cw = Math.max(1, Math.round(r.width));
      const ch = Math.max(1, Math.round(r.height));
      lastSize = `${cw}x${ch}`;
      tweens.forEach(t => t.cancel());
      tweens.clear();
      drag = null;
      picked = null;
      const tray = order.filter(i => left.has(i));
      L = layout(parts, bb, tray, cw, ch);
      L.cw = cw;
      const { box } = L;
      svg.setAttribute('viewBox', `0 0 ${cw} ${ch}`);
      svg.innerHTML =
        groundSvg(build, L, cw) +
        `<rect class="sb-tray" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${Math.min(28, box.w * 0.08)}" fill="rgba(255,255,255,0.6)" stroke="rgba(58,51,87,0.08)" stroke-width="2"/>` +
        `<g class="sb-layout" transform="translate(${L.bx} ${L.by}) scale(${L.s})">${backdropSvg(build, bb)}` +
        `<g class="sb-build"><g class="sb-motion"><g class="sb-base">${build.base || ''}${flameSvg(build)}</g>` +
        parts.map((p, j) => `<g class="sb-part" data-j="${j}" transform="translate(${p.x} ${p.y})">${
          filledBy.has(j) ? `<g class="sb-art">${partArt(parts[filledBy.get(j)])}</g>` : slotSvg(p, tint)}</g>`).join('') +
        `${peekSvg(build, visitor)}</g></g></g>` +
        `<g class="sb-pieces">${tray.map((i, n) => pieceSvg(i, parts[i], L.t, firstRender ? 200 + n * 90 : null)).join('')}</g>`;
      firstRender = false;
      els.clear();
      svg.querySelectorAll('.sb-piece').forEach(g => els.set(Number(g.dataset.i), g));
      tray.forEach(i => {
        const h = L.homes.get(i);
        pos.set(i, { x: h.x, y: h.y, k: L.t });
        apply(i);
      });
    }

    function sendHome(i) {
      const h = L.homes.get(i);
      if (h) glide(i, { x: h.x, y: h.y, k: L.t }, 420, easeBack);
    }

    function restartClass(node, cls) {
      node.classList.remove(cls);
      node.getBoundingClientRect();
      node.classList.add(cls);
    }

    function nudge(i) {
      const lift = els.get(i) && els.get(i).querySelector('.sb-lift');
      if (!lift) return;
      lift.classList.remove('sb-pop');
      restartClass(lift, 'sb-nudge');
    }

    // Pulse the empty outline this piece belongs in (the nearest one, when a
    // pair of identical pieces share a shape).
    function showHome(i) {
      const p = pos.get(i);
      let best = null;
      for (const j of open) {
        if (parts[j].d !== parts[i].d) continue;
        const c = slotPx(j);
        const dist = p ? Math.hypot(p.x - c.x, p.y - c.y) : 0;
        if (!best || dist < best.dist) best = { j, dist };
      }
      const slot = best && svg.querySelector(`.sb-part[data-j="${best.j}"] .sb-slot`);
      if (!slot) return;
      restartClass(slot, 'sb-hint');
      later(2300, () => slot.classList.remove('sb-hint'));
    }

    function drop(i) {
      const p = pos.get(i);
      let match = null;
      let miss = null;
      for (const j of open) {
        const q = parts[j];
        const c = slotPx(j);
        const reach = Math.max(q.w, q.h) * L.s * 0.55 + 34;
        const dist = Math.hypot(p.x - c.x, p.y - c.y) / reach;
        if (dist > 1) continue;
        if (q.d === parts[i].d) { if (!match || dist < match.dist) match = { j, dist }; }
        else if (!miss || dist < miss.dist) miss = { j, dist };
      }
      if (match) place(i, match.j);
      else if (miss) wrong(i);
      else sendHome(i);
    }

    function place(i, j) {
      left.delete(i);
      open.delete(j);
      filledBy.set(j, i);
      const step = parts.length - open.size - 1;
      const c = slotPx(j);
      const g = els.get(i);
      glide(i, { x: c.x, y: c.y, k: L.s }, 170, easeOut, () => {
        if (g) g.remove();
        els.delete(i);
        const holder = svg.querySelector(`.sb-part[data-j="${j}"]`);
        if (holder) holder.innerHTML = `<g class="sb-art sb-snap">${partArt(parts[i])}</g>`;
        audio.thud();
        audio.bell(step);
        const r = svg.getBoundingClientRect();
        celebrate.burst(r.left + c.x, r.top + c.y, { count: 14, sound: false });
      });
      if (!open.size) {
        phase = 'done';
        later(520, finish);
      }
    }

    function wrong(i) {
      if (recordOutcome) recordOutcome(false, `build:${build.id}`);
      audio.boing();
      const now = performance.now();
      if (now - lastEncourage > 9000) {
        lastEncourage = now;
        speech.encourage();
      }
      showHome(i);
      sendHome(i);
    }

    function sfx(name) {
      if (!name) return;
      if (name.startsWith('animal:')) audio.play(name, { maxDuration: 2.2 });
      else if (typeof audio[name] === 'function') audio[name]();
    }

    // A short-lived puff of smoke or a bubble drifting away from `at`.
    function puff(parent, at, { r = 12, fill = '#fff', stroke = 'none', dx = -50, dy = -80, grow = 1.8, ms = 1200 } = {}) {
      if (!parent || !at) return;
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('transform', `translate(${at.x} ${at.y})`);
      const dot = document.createElementNS(SVGNS, 'circle');
      dot.setAttribute('r', r);
      dot.setAttribute('fill', fill);
      dot.setAttribute('stroke', stroke);
      dot.setAttribute('stroke-width', 3);
      g.appendChild(dot);
      parent.appendChild(g);
      dot.animate([
        { transform: 'translate(0px, 0px) scale(0.4)', opacity: 0.95 },
        { transform: `translate(${dx}px, ${dy}px) scale(${grow})`, opacity: 0 },
      ], { duration: ms, easing: 'ease-out', fill: 'forwards' });
      later(ms + 60, () => g.remove());
    }

    // The finished toy comes alive. Returns how long the show lasts.
    function comeAlive() {
      const buildG = svg.querySelector('.sb-build');
      const motion = svg.querySelector('.sb-motion');
      const go = build.go;
      const right = (L.cw - (L.bx + bb.x0 * L.s)) / L.s + 40;
      const up = (L.by + bb.y1 * L.s) / L.s + 40;
      const travel = (frames, duration, easing, delay = 0) =>
        buildG.animate(frames, { duration, easing, delay, fill: 'forwards' });
      const offRight = [{ transform: 'translate(0px, 0px)' }, { transform: `translate(${right}px, 0px)` }];
      const arts = flag => parts
        .map((p, j) => (p[flag] ? svg.querySelector(`.sb-part[data-j="${j}"] .sb-art`) : null))
        .filter(Boolean);
      const spin = ms => arts('spin').forEach(a =>
        a.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: ms, iterations: Infinity }));
      const repeat = (every, times, fn) => { for (let n = 0; n < times; n++) later(n * every, () => fn(n)); };

      switch (go.kind) {
        case 'drive':
          sfx(go.sound);
          spin(480);
          motion.classList.add('sb-chug');
          travel([{ transform: 'translate(0px, 0px)' }, { transform: 'translate(-14px, 0px)', offset: 0.2 }, offRight[1]], 1800, 'ease-in');
          return 1800;
        case 'chug':
          sfx(go.sound);
          spin(640);
          motion.classList.add('sb-chug');
          repeat(260, 9, () => puff(motion, build.puff, { r: 13, fill: '#ffffff', stroke: '#dfe6f2' }));
          travel(offRight, 2600, 'ease-in');
          return 2600;
        case 'sail':
        case 'paddle':
          sfx(go.sound);
          motion.classList.add('sb-bob');
          travel(offRight, 2600, go.kind === 'sail' ? 'ease-in-out' : 'ease-in');
          return 2600;
        case 'swim':
          sfx(go.sound);
          motion.classList.add('sb-swim');
          repeat(240, 7, () => puff(motion, { x: 300, y: 160 }, { r: 8, fill: 'rgba(255,255,255,0.7)', stroke: '#7fd0f0', dx: 30, dy: -90, grow: 1.3 }));
          travel(offRight, 2000, 'ease-in');
          return 2000;
        case 'walk':
          motion.classList.add('sb-waddle');
          repeat(360, 8, () => sfx(go.sound));
          travel(offRight, 3000, 'cubic-bezier(0.4, 0, 0.8, 0.7)');
          return 3000;
        case 'hop':
          motion.classList.add('sb-hop');
          repeat(500, 5, () => sfx(go.sound));
          travel(offRight, 2500, 'linear');
          return 2500;
        case 'dance':
          motion.classList.add('sb-dance');
          repeat(220, 5, n => audio.note([523.25, 659.25, 783.99, 659.25, 1046.5][n]));
          travel(offRight, 1500, 'ease-in', 1300);
          return 2800;
        case 'fly':
          sfx(go.sound);
          later(500, () => audio.shimmer(783.99));
          motion.classList.add('sb-flutter');
          travel([
            { transform: 'translate(0px, 0px)' },
            { transform: `translate(${right * 0.3}px, ${-up * 0.2}px)`, offset: 0.4 },
            { transform: `translate(${right}px, ${-up}px)` },
          ], 2400, 'ease-in');
          return 2400;
        case 'plane':
          arts('prop').forEach(a => a.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.15)' }], { duration: 90, iterations: Infinity, direction: 'alternate' }));
          sfx(go.sound);
          later(700, () => sfx(go.sound));
          travel([
            { transform: 'translate(0px, 0px) rotate(0deg)' },
            { transform: 'translate(30px, 6px) rotate(0deg)', offset: 0.25 },
            { transform: `translate(${right}px, ${-up * 0.8}px) rotate(-14deg)` },
          ], 2200, 'ease-in');
          return 2200;
        case 'launch': {
          const flame = svg.querySelector('.sb-flame');
          const pad = svg.querySelector('.sb-layout');
          if (flame) { flame.style.opacity = '1'; flame.classList.add('sb-flicker'); }
          motion.classList.add('sb-shake');
          sfx('rumble');
          repeat(110, 8, n => puff(pad, { x: build.flame.x + (n % 2 ? 24 : -24), y: build.ground - 10 },
            { r: 18, fill: '#ffffff', stroke: '#dfe6f2', dx: n % 2 ? 90 : -90, dy: -14, grow: 2.2, ms: 1300 }));
          later(750, () => { motion.classList.remove('sb-shake'); sfx('whoosh'); });
          travel([{ transform: 'translate(0px, 0px)' }, { transform: `translate(0px, ${-up}px)` }], 1500, 'cubic-bezier(0.55, 0, 0.9, 0.55)', 750);
          return 2250;
        }
        case 'peek': {
          const door = arts('door')[0];
          const friend = svg.querySelector('.sb-peek');
          if (door) {
            door.style.transformOrigin = '0% 50%';
            door.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.12)' }], { duration: 420, easing: 'ease-in', fill: 'forwards' });
          }
          audio.squeak();
          later(380, () => {
            if (!friend) return;
            friend.style.visibility = 'visible';
            friend.animate([
              { transform: 'translateY(30px) scale(0.2)', opacity: 0 },
              { transform: 'translateY(-16px) scale(1.12)', opacity: 1, offset: 0.25 },
              { transform: 'translateY(0px) scale(1)', opacity: 1, offset: 0.4 },
              { transform: 'translateY(-18px) scale(1)', opacity: 1, offset: 0.55 },
              { transform: 'translateY(0px) scale(1)', opacity: 1, offset: 0.7 },
              { transform: 'translateY(-18px) scale(1)', opacity: 1, offset: 0.85 },
              { transform: 'translateY(0px) scale(1)', opacity: 1 },
            ], { duration: 1700, easing: 'ease-out', fill: 'forwards' });
            if (voiced) sfx(voiced);
          });
          return 2900;
        }
        default:
          return 1200;
      }
    }

    function finish() {
      if (recordOutcome) recordOutcome(true, `build:${build.id}`);
      const trayPanel = svg.querySelector('.sb-tray');
      if (trayPanel) trayPanel.classList.add('sb-gone');
      const motion = svg.querySelector('.sb-motion');
      if (motion) motion.classList.add('sb-happy');
      celebrate.big({ quick: false });
      later(1150, () => {
        if (motion) motion.classList.remove('sb-happy');
        const ms = comeAlive();
        later(ms + 200, () => newRound(false));
      });
    }

    function follow(d) {
      const f = 1 - d.grow;
      pos.set(d.i, { x: d.px + d.offX * f, y: d.py + d.offY * f, k: d.k0 + (L.s - d.k0) * d.grow });
      apply(d.i);
    }

    // Tap-to-place: a tapped piece is lifted (it bobs and every empty outline
    // glows, so no answer is given away); tapping an outline sends it there.
    function pickPiece(i) {
      unpick();
      picked = i;
      const g = els.get(i);
      if (g) g.classList.add('sb-picked');
      svg.querySelectorAll('.sb-slot').forEach(s => s.classList.add('sb-target'));
    }

    function unpick() {
      if (picked == null) return;
      const g = els.get(picked);
      if (g) g.classList.remove('sb-picked');
      svg.querySelectorAll('.sb-target').forEach(s => s.classList.remove('sb-target'));
      picked = null;
    }

    // The empty outline under a tap: the outline itself when it was hit,
    // otherwise the nearest one relative to its size.
    function slotAt(target, x, y) {
      const part = target.closest ? target.closest('.sb-part') : null;
      if (part && open.has(Number(part.dataset.j))) return Number(part.dataset.j);
      let best = null;
      for (const j of open) {
        const q = parts[j];
        const c = slotPx(j);
        const dist = Math.hypot(x - c.x, y - c.y) / (Math.max(q.w, q.h) * L.s * 0.55 + 20);
        if (dist <= 1 && (!best || dist < best.dist)) best = { j, dist };
      }
      return best ? best.j : null;
    }

    function sendToSlot(i, j) {
      if (parts[j].d === parts[i].d) { place(i, j); return; }
      const c = slotPx(j);
      glide(i, { x: c.x, y: c.y, k: (L.t + L.s) / 2 }, 260, easeOut, () => wrong(i));
    }

    svg.addEventListener('pointerdown', e => {
      if (phase !== 'play' || drag || !live()) return;
      const g = e.target.closest ? e.target.closest('.sb-piece') : null;
      if (!g) {
        if (picked == null) return;
        const rect = svg.getBoundingClientRect();
        const i = picked;
        const j = slotAt(e.target, e.clientX - rect.left, e.clientY - rect.top);
        unpick();
        if (j != null && left.has(i)) {
          e.preventDefault();
          sendToSlot(i, j);
        }
        return;
      }
      const i = Number(g.dataset.i);
      if (!left.has(i)) return;
      e.preventDefault();
      const wasPicked = picked === i;
      unpick();
      cancelTween(i);
      g.parentNode.appendChild(g);
      try { g.setPointerCapture(e.pointerId); } catch (err) { /* capture is best-effort */ }
      const rect = svg.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const p = pos.get(i);
      const d = { i, id: e.pointerId, rect, px, py, sx: px, sy: py, offX: p.x - px, offY: p.y - py, k0: p.k, grow: 0, moved: false, t0: performance.now(), wasPicked };
      drag = d;
      d.tw = tween(150, easeOut, e2 => { d.grow = e2; follow(d); });
      audio.pop();
    });

    svg.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      drag.px = e.clientX - drag.rect.left;
      drag.py = e.clientY - drag.rect.top;
      if (Math.hypot(drag.px - drag.sx, drag.py - drag.sy) > 10) drag.moved = true;
      follow(drag);
    });

    const release = e => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (d.tw) d.tw.cancel();
      if (e.type !== 'pointerup') sendHome(d.i);
      else if (!d.moved && performance.now() - d.t0 < 400) {
        sendHome(d.i);
        if (!tapPlaceEnabled()) nudge(d.i);
        else if (!d.wasPicked) pickPiece(d.i);
      } else drop(d.i);
    };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);
    svg.addEventListener('lostpointercapture', release);

    // An idle child gets a silent nudge: one piece wiggles and its outline glows.
    setReprompt(() => {
      if (phase !== 'play' || drag || !live() || !left.size) return;
      const i = pick([...left]);
      nudge(i);
      showHome(i);
    });

    let rafId = 0;
    const relayout = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!live() || phase !== 'play') return;
        const r = svg.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || `${Math.round(r.width)}x${Math.round(r.height)}` === lastSize) return;
        render();
      });
    };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(relayout) : null;
    if (ro) ro.observe(content);
    else window.addEventListener('resize', relayout);

    render();

    return () => {
      phase = 'gone';
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', relayout);
      cancelAnimationFrame(rafId);
      timers.forEach(clearTimeout);
      timers.clear();
      tweens.forEach(t => t.cancel());
      tweens.clear();
      drag = null;
    };
  }

  function newRound(first) {
    if (teardown) { teardown(); teardown = null; }
    const roundEpoch = ++epoch;
    const build = () => {
      if (!alive || epoch !== roundEpoch) return;
      markMode();
      if (mode === 'animals') {
        setReprompt(null);
        buildAnimals(roundEpoch);
      } else {
        teardown = buildShapes(roundEpoch);
      }
    };
    if (first || !content.children.length) build();
    else fadeSwap(content, build);
  }

  setReprompt(null);
  newRound(true);
  return () => {
    alive = false;
    epoch++;
    if (teardown) { teardown(); teardown = null; }
  };
}

export default { id: 'puzzle', title: 'Puzzle Fit', icon: ICON, start };
