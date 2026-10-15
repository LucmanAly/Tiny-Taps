import { animalArt } from '../data/animal-art.js';
// Paint Pots: color mixing. Drop two paints into the pot (drag them, or just
// tap a jar), then stir — round and round with a finger, or tap the spoon —
// and watch the swirl turn into a new color.
//
// Mix: free play; every color made goes on the shelf.
// Make it: a picture waits in a color; make that color to paint it. Level 1
// asks for orange, green and purple; later levels add the white-made tints.
//
// No words anywhere: paint splashes, stirring swishes and a chime.

import { makeDraggable } from '../engine/drag.js';
import { pick } from '../engine/rand.js';
import { childKey } from '../engine/children.js';

const MODE_KEY = 'tinytaps-paintpots-mode';
const INK = '#3a3357';

const PAINTS = [
  { id: 'red', color: '#f0453a' },
  { id: 'yellow', color: '#ffd23f' },
  { id: 'blue', color: '#2f7cf0' },
  { id: 'white', color: '#ffffff' },
];

// What two paints make. Hand-picked so it looks like real paint (plain RGB
// averaging would turn yellow and blue grey).
const MIXES = {
  'red+yellow': { id: 'orange', color: '#ff8c1a' },
  'blue+yellow': { id: 'green', color: '#3dbb3d' },
  'blue+red': { id: 'purple', color: '#8b4fd8' },
  'red+white': { id: 'pink', color: '#ff8fb8' },
  'white+yellow': { id: 'light yellow', color: '#fff1a0' },
  'blue+white': { id: 'light blue', color: '#8fd3ff' },
};

function mixOf(a, b) {
  if (a.id === b.id) return { id: a.id, color: a.color };
  return MIXES[[a.id, b.id].sort().join('+')];
}

// Make it: a picture for each color to make, drawn with {C} as its paint.

// Keep the new animal's shading and face while making its paint color exact.
function paintedAnimal(id) {
  return '<defs><filter id="{K}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0" result="gray"/><feFlood flood-color="{C}" result="paint"/><feBlend in="gray" in2="paint" mode="multiply" result="colored"/><feComposite in="colored" in2="SourceGraphic" operator="in"/></filter></defs><image href="' + animalArt(id) + '" width="100" height="100" filter="url(#{K})"/>';
}

const TARGETS = [
  { id: 'orange', level: 1, art: '<path d="M50 30 C66 30 70 44 64 60 L52 92 Q50 96 48 92 L36 60 C30 44 34 30 50 30 Z" fill="{C}" stroke="#3a3357" stroke-width="3" stroke-linejoin="round"/><path d="M44 42 H54 M42 54 H50 M46 66 H54" stroke="#3a3357" stroke-width="2.5" stroke-linecap="round" opacity=".5"/><path d="M50 30 C46 18 38 12 30 12 C34 20 40 26 48 30 M50 30 C52 16 58 8 66 6 C64 16 58 24 52 30" fill="#4db84d" stroke="#3a3357" stroke-width="3" stroke-linejoin="round"/>' },
  { id: 'green', level: 1, art: paintedAnimal('frog') },
  { id: 'purple', level: 1, art: '<path d="M50 20 V10 M50 14 Q60 6 70 12" fill="none" stroke="#4db84d" stroke-width="4" stroke-linecap="round"/>' + [[50, 28], [38, 40], [62, 40], [26, 52], [50, 52], [74, 52], [38, 64], [62, 64], [50, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="{C}" stroke="#3a3357" stroke-width="3"/>`).join('') },
  { id: 'pink', level: 2, art: paintedAnimal('pig') },
  { id: 'light blue', level: 2, art: '<path d="M50 10 C62 32 78 46 78 64 A28 28 0 0 1 22 64 C22 46 38 32 50 10 Z" fill="{C}" stroke="#3a3357" stroke-width="3" stroke-linejoin="round"/><path d="M36 64 A14 14 0 0 0 46 80" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>' },
  { id: 'light yellow', level: 3, art: '<path d="M50 8 L61 36 L91 37 L67 55 L76 84 L50 67 L24 84 L33 55 L9 37 L39 36 Z" fill="{C}" stroke="#3a3357" stroke-width="3" stroke-linejoin="round"/><circle cx="42" cy="48" r="3" fill="#3a3357"/><circle cx="58" cy="48" r="3" fill="#3a3357"/><path d="M43 57 Q50 62 57 57" fill="none" stroke="#3a3357" stroke-width="2.5" stroke-linecap="round"/>' },
];
const colorOf = id => (Object.values(MIXES).find(m => m.id === id) || {}).color;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

function lerpColor(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="50" cy="56" rx="38" ry="12" fill="#8b4fd8"/>
  <path d="M50 56 m-22 0 a22 7 0 1 0 44 0" fill="none" stroke="#2f7cf0" stroke-width="5"/>
  <path d="M12 56 Q14 88 50 88 Q86 88 88 56" fill="#e9e4f5" stroke="#3a3357" stroke-width="4"/>
  <ellipse cx="50" cy="56" rx="38" ry="12" fill="none" stroke="#3a3357" stroke-width="4"/>
  <circle cx="24" cy="22" r="10" fill="#f0453a"/><circle cx="76" cy="20" r="10" fill="#2f7cf0"/>
  <path d="M60 50 L78 14" stroke="#c98a4b" stroke-width="7" stroke-linecap="round"/>
</svg>`;

const SPOON = '<svg viewBox="0 0 40 100" aria-hidden="true"><ellipse cx="20" cy="18" rx="14" ry="17" fill="#d9a066" stroke="#3a3357" stroke-width="3"/><rect x="16" y="32" width="8" height="64" rx="4" fill="#d9a066" stroke="#3a3357" stroke-width="3"/></svg>';
const MIX_TAB = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="5" fill="#f0453a"/><circle cx="16" cy="9" r="5" fill="#ffd23f" opacity=".9"/><circle cx="12" cy="16" r="5" fill="#2f7cf0" opacity=".85"/></svg>';
const MAKE_TAB = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fff" stroke="#8b4fd8" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="#8b4fd8"/></svg>';

function start(ctx) {
  const { stage, audio, celebrate, setReprompt, difficulty, recordOutcome } = ctx;
  let alive = true;
  let mode = localStorage.getItem(childKey(MODE_KEY)) === 'make' ? 'make' : 'mix';
  let inPot = [];         // up to two paints
  let mixT = 0;           // 0 = two swirls, 1 = fully mixed
  let result = null;
  let busy = false;
  let target = null;
  let lastTarget = null;
  let made = 0;
  let stir = null;        // finger-stirring state
  const shelf = [];
  const timers = new Set();
  const later = (ms, fn) => {
    const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms);
    timers.add(id);
  };

  const shell = document.createElement('div');
  shell.className = 'pp-shell';
  shell.innerHTML = `
    <div class="puzzle-tabs sticker-tabs pp-tabs"></div>
    <div class="pp-main">
      <div class="pp-jars"></div>
      <div class="pp-center">
        <div class="pp-pot" aria-label="Mixing pot">
          <svg class="pp-pot-svg" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
            <defs><clipPath id="pp-surface"><ellipse cx="100" cy="46" rx="84" ry="26"/></clipPath></defs>
            <path d="M14 46 Q18 140 100 142 Q182 140 186 46" fill="#efeaf8" stroke="${INK}" stroke-width="5"/>
            <ellipse cx="100" cy="46" rx="86" ry="28" fill="#d8d0ea" stroke="${INK}" stroke-width="5"/>
            <g clip-path="url(#pp-surface)">
              <rect class="pp-paint" x="10" y="14" width="180" height="70" fill="transparent"/>
              <g class="pp-swirl" style="transform-origin:100px 46px">
                <path class="pp-swirl-path" d="M100 46 m0 0 a6 4 0 0 1 12 0 a14 9 0 0 1 -28 0 a22 14 0 0 1 44 0 a30 19 0 0 1 -60 0 a38 24 0 0 1 76 0 a46 29 0 0 1 -92 0 a54 34 0 0 1 108 0" fill="none" stroke="transparent" stroke-width="10" stroke-linecap="round"/>
              </g>
              <ellipse class="pp-shine" cx="70" cy="36" rx="22" ry="5" fill="#fff" opacity="0"/>
            </g>
          </svg>
        </div>
        <button class="pp-spoon" aria-label="Stir">${SPOON}</button>
      </div>
      <div class="pp-side"></div>
    </div>`;
  stage.appendChild(shell);

  const tabs = shell.querySelector('.pp-tabs');
  const jars = shell.querySelector('.pp-jars');
  const pot = shell.querySelector('.pp-pot');
  const paintRect = shell.querySelector('.pp-paint');
  const swirl = shell.querySelector('.pp-swirl');
  const swirlPath = shell.querySelector('.pp-swirl-path');
  const shine = shell.querySelector('.pp-shine');
  const spoon = shell.querySelector('.pp-spoon');
  const side = shell.querySelector('.pp-side');

  [['mix', 'Mix', MIX_TAB], ['make', 'Make it', MAKE_TAB]].forEach(([id, label, icon]) => {
    const b = document.createElement('button');
    b.className = 'puzzle-tab sticker-tab';
    b.dataset.mode = id;
    b.innerHTML = `${icon}<span>${label}</span>`;
    b.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (!alive || mode === id) return;
      mode = id;
      try { localStorage.setItem(childKey(MODE_KEY), mode); } catch (err) { /* optional */ }
      audio.pop();
      empty(true);
      renderSide();
    });
    tabs.appendChild(b);
  });

  /* ---------------- the pot ---------------- */

  function draw() {
    if (!inPot.length) {
      paintRect.setAttribute('fill', 'transparent');
      swirlPath.setAttribute('stroke', 'transparent');
      shine.setAttribute('opacity', '0');
      return;
    }
    const [a, b] = inPot;
    shine.setAttribute('opacity', '0.35');
    if (!b) {
      paintRect.setAttribute('fill', a.color);
      swirlPath.setAttribute('stroke', 'transparent');
      return;
    }
    const mixed = mixOf(a, b).color;
    paintRect.setAttribute('fill', lerpColor(a.color, mixed, mixT));
    swirlPath.setAttribute('stroke', lerpColor(b.color, mixed, mixT));
    swirl.style.transform = `rotate(${mixT * 540}deg)`;
  }

  function addPaint(p) {
    if (busy || inPot.length >= 2) return false;
    inPot.push(p);
    mixT = 0;
    draw();
    audio.splash();
    pot.classList.remove('pp-plop');
    void pot.offsetWidth;
    pot.classList.add('pp-plop');
    spoon.classList.toggle('ready', inPot.length === 2);
    return true;
  }

  // Each bit of stirring blends a little more; a full mix takes about three
  // turns of a finger, or three taps of the spoon.
  function stirBy(amount) {
    if (busy || inPot.length < 2 || result) return;
    const before = mixT;
    mixT = Math.min(1, mixT + amount);
    draw();
    if (Math.floor(before * 6) !== Math.floor(mixT * 6)) audio.whoosh();
    if (mixT >= 1) finishMix();
  }

  function finishMix() {
    result = mixOf(inPot[0], inPot[1]);
    busy = true;
    spoon.classList.remove('ready');
    audio.chime();
    const r = pot.getBoundingClientRect();
    celebrate.burst(r.left + r.width / 2, r.top + r.height * 0.3, { count: 22, sound: false });
    pot.classList.add('pp-done');
    later(500, () => (mode === 'make' ? checkTarget() : keepOnShelf()));
  }

  function empty(now = false) {
    const go = () => {
      inPot = [];
      mixT = 0;
      result = null;
      busy = false;
      pot.classList.remove('pp-done', 'pp-pour');
      spoon.classList.remove('ready');
      draw();
    };
    if (now) { go(); return; }
    pot.classList.add('pp-pour');
    later(450, go);
  }

  /* ---------------- paint jars (drag or tap into the pot) ---------------- */

  PAINTS.forEach(p => {
    const jar = document.createElement('div');
    jar.className = 'pp-jar';
    jar.innerHTML = `<svg viewBox="0 0 80 90" aria-hidden="true"><rect x="10" y="22" width="60" height="62" rx="14" fill="#fff" stroke="${INK}" stroke-width="4"/><rect x="14" y="40" width="52" height="40" rx="10" fill="${p.color}" stroke="${p.id === 'white' ? '#d8d0ea' : 'none'}" stroke-width="2"/><rect x="16" y="10" width="48" height="16" rx="6" fill="${p.color}" stroke="${INK}" stroke-width="4"/></svg>`;
    const drop = document.createElement('div');
    drop.className = 'pp-drop';
    drop.style.setProperty('--paint', p.color);
    drop.setAttribute('aria-label', `${p.id} paint`);
    jar.appendChild(drop);
    jars.appendChild(jar);
    makeDraggable(drop, {
      getTargets: () => [{ el: pot, data: 'pot' }],
      onDrop: hit => {
        if (!alive || !hit) return 'reject';
        if (!addPaint(p)) { audio.boing(); return 'reject'; }
        // The blob lands in the pot; a fresh one wells up in the jar.
        later(260, () => {
          drop.style.transition = 'none';
          drop.style.transform = 'translate(0, 0) scale(0)';
          drop.style.zIndex = '';
          void drop.offsetWidth;
          drop.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
          drop.style.transform = 'translate(0, 0) scale(1)';
        });
        return 'accept';
      },
    });
  });

  /* ---------------- stirring ---------------- */

  spoon.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (inPot.length < 2) { spoon.classList.remove('wiggle'); void spoon.offsetWidth; spoon.classList.add('wiggle'); return; }
    spoon.classList.remove('stirring');
    void spoon.offsetWidth;
    spoon.classList.add('stirring');
    stirBy(0.34);
  });

  pot.addEventListener('pointerdown', e => {
    if (inPot.length < 2 || busy) return;
    const r = pot.getBoundingClientRect();
    stir = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height * 0.36, a: null };
    stir.a = Math.atan2(e.clientY - stir.cy, e.clientX - stir.cx);
    try { pot.setPointerCapture(e.pointerId); } catch (err) { /* best-effort */ }
  });
  pot.addEventListener('pointermove', e => {
    if (!stir || e.pointerId !== stir.id) return;
    const a = Math.atan2(e.clientY - stir.cy, e.clientX - stir.cx);
    let d = a - stir.a;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    stir.a = a;
    stirBy(Math.abs(d) / (Math.PI * 2 * 3));
  });
  const endStir = () => { stir = null; };
  pot.addEventListener('pointerup', endStir);
  pot.addEventListener('pointercancel', endStir);

  /* ---------------- Mix: the shelf of colors made ---------------- */

  function keepOnShelf() {
    made++;
    if (recordOutcome) recordOutcome(true, `mix:${result.id}`);
    shelf.push(result.color);
    while (shelf.length > 8) shelf.shift();
    renderSide(true);
    if (made % 3 === 0) celebrate.big({ quick: true });
    later(900, () => empty());
  }

  /* ---------------- Make it: paint the picture ---------------- */

  function newTarget() {
    const level = difficulty ? difficulty() : 1;
    const pool = TARGETS.filter(t => t.level <= level && t !== lastTarget);
    target = pick(pool.length ? pool : TARGETS);
    lastTarget = target;
  }

  function checkTarget() {
    if (!target) return;
    const pic = side.querySelector('.pp-target');
    if (result.id === target.id) {
      if (recordOutcome) recordOutcome(true, `make:${target.id}`);
      if (pic) {
        pic.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${target.art.replaceAll('{C}', targetColor()).replaceAll('{K}', 'pp-result')}</svg>`;
        pic.classList.add('pp-painted');
      }
      celebrate.big({ quick: true });
      later(900, () => empty());
      later(1900, () => { newTarget(); renderSide(); });
    } else {
      if (recordOutcome) recordOutcome(false, `make:${target.id}`);
      audio.boing();
      if (pic) { pic.classList.remove('wiggle'); void pic.offsetWidth; pic.classList.add('wiggle'); }
      later(700, () => empty());
    }
  }

  function targetColor() {
    return colorOf(target.id);
  }

  function renderSide(fresh = false) {
    tabs.querySelectorAll('.sticker-tab').forEach(b => b.classList.toggle('selected', b.dataset.mode === mode));
    side.replaceChildren();
    if (mode === 'make') {
      if (!target) newTarget();
      const box = document.createElement('div');
      box.className = 'pp-target-box';
      box.innerHTML = `
        <div class="pp-target pop-in"><svg viewBox="0 0 100 100" aria-hidden="true">${target.art.replaceAll('{C}', '#ffffff').replaceAll('{K}', 'pp-request')}</svg></div>
        <div class="pp-swatch" style="background:${targetColor()}"></div>`;
      side.appendChild(box);
      // An idle child sees the color it needs pulse.
      setReprompt(() => {
        const sw = side.querySelector('.pp-swatch');
        if (sw) { sw.classList.remove('wiggle'); void sw.offsetWidth; sw.classList.add('wiggle'); }
      });
      return;
    }
    setReprompt(null);
    const shelfEl = document.createElement('div');
    shelfEl.className = 'pp-shelf';
    shelf.forEach((c, i) => {
      const j = document.createElement('button');
      j.className = 'pp-made' + (fresh && i === shelf.length - 1 ? ' pop-in' : '');
      j.style.setProperty('--paint', c);
      j.setAttribute('aria-label', 'A color you made');
      j.addEventListener('pointerdown', () => { j.classList.remove('wiggle'); void j.offsetWidth; j.classList.add('wiggle'); audio.bell(i); });
      shelfEl.appendChild(j);
    });
    if (!shelf.length) {
      const hint = document.createElement('div');
      hint.className = 'pp-shelf-hint';
      hint.innerHTML = PAINTS.slice(0, 3).map(p => `<span style="background:${p.color}"></span>`).join('+') + '<b>?</b>';
      shelfEl.appendChild(hint);
    }
    side.appendChild(shelfEl);
  }

  draw();
  renderSide();
  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
  };
}

export default {
  id: 'paintpots',
  title: 'Paint Pots',
  icon: ICON,
  start,
};
