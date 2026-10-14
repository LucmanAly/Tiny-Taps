// Silly Faces: build a face. Pick eyes, a nose, a mouth, a hat and silly
// extras from the tray and put them on a face — tap one to pop it into
// place (tapping another of the same kind swaps it), or drag it anywhere.
// Placed parts can be moved, and dragged back to the tray to take off.
// The face is alive: it blinks, and tapping it (or its parts) makes it
// giggle, honk, chatter and hop. The dice builds a surprise face; the face
// button changes who you are dressing up. Sound effects only, no words.

import { childKey } from '../engine/children.js';

const KEY = 'tinytaps-faces';
const INK = '#3a3357';
const MAX_PARTS = 16;
const S3 = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;

const eyePair = (r, pupil, look = [3, 2]) => [-26, 26].map(x =>
  `<circle cx="${x}" cy="0" r="${r}" fill="#fff" ${S3}/><circle cx="${x + look[0]}" cy="${look[1]}" r="${pupil}" fill="${INK}"/><circle cx="${x + look[0] + pupil * 0.35}" cy="${look[1] - pupil * 0.4}" r="${pupil * 0.32}" fill="#fff"/>`).join('');

// Parts are drawn around (0, 0) in face units; `at` is where a tap puts
// them on the 200-wide face, `w` roughly how wide they are.
const PARTS = [
  { id: 'eyes-round', kind: 'eyes', at: [100, 92], w: 84, art: eyePair(15, 7) },
  { id: 'eyes-googly', kind: 'eyes', at: [100, 92], w: 96, art: `<circle cx="-27" r="20" fill="#fff" ${S3}/><circle cx="-20" cy="9" r="9" fill="${INK}"/><circle cx="27" r="20" fill="#fff" ${S3}/><circle cx="33" cy="-8" r="9" fill="${INK}"/>` },
  { id: 'eyes-sleepy', kind: 'eyes', at: [100, 92], w: 84, art: eyePair(15, 7, [0, 4]) + [-26, 26].map(x => `<path d="M${x - 16} 0 A16 16 0 0 1 ${x + 16} 0 Z" fill="#b98aef" ${S3}/>`).join('') },
  { id: 'eyes-cyclops', kind: 'eyes', at: [100, 88], w: 64, art: `<circle r="30" fill="#fff" ${S3}/><circle r="16" fill="#4db84d"/><circle r="8" fill="${INK}"/><circle cx="5" cy="-6" r="4" fill="#fff"/>` },
  { id: 'eyes-stars', kind: 'eyes', at: [100, 92], w: 90, art: [-26, 26].map(x => `<path transform="translate(${x} 0)" d="M0 -17 L5 -5 L18 -5 L8 3 L11 16 L0 8 L-11 16 L-8 3 L-18 -5 L-5 -5 Z" fill="#ffd54a" ${S3}/>`).join('') },
  { id: 'nose-button', kind: 'nose', at: [100, 120], w: 24, art: `<ellipse rx="11" ry="8" fill="#ff9fb2" ${S3}/><circle cx="-3" cy="-3" r="2.5" fill="#fff" opacity=".8"/>` },
  { id: 'nose-clown', kind: 'nose', at: [100, 120], w: 34, art: `<circle r="16" fill="#f0453a" ${S3}/><circle cx="-5" cy="-6" r="4.5" fill="#fff" opacity=".85"/>` },
  { id: 'nose-carrot', kind: 'nose', at: [104, 120], w: 46, art: `<path d="M-14 -11 L30 0 L-14 11 Z" fill="#ff8c2e" ${S3}/><path d="M-2 -6 V-2 M8 -4 V0" stroke="${INK}" stroke-width="2" opacity=".5"/>` },
  { id: 'nose-pig', kind: 'nose', at: [100, 122], w: 40, art: `<ellipse rx="19" ry="13" fill="#ffb6c8" ${S3}/><ellipse cx="-7" rx="3.4" ry="5" fill="${INK}"/><ellipse cx="7" rx="3.4" ry="5" fill="${INK}"/>` },
  { id: 'mouth-smile', kind: 'mouth', at: [100, 154], w: 62, art: `<path d="M-30 -6 Q0 24 30 -6" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` },
  { id: 'mouth-open', kind: 'mouth', at: [100, 156], w: 34, art: `<ellipse rx="15" ry="18" fill="#7a2a3a" ${S3}/><ellipse cy="9" rx="9" ry="6" fill="#ff8fa3"/>` },
  { id: 'mouth-grin', kind: 'mouth', at: [100, 154], w: 70, art: `<path d="M-32 -8 Q0 34 32 -8 Z" fill="#7a2a3a" ${S3}/><path d="M-26 -6 H26 L22 2 H-22 Z" fill="#fff"/><path d="M-9 -6 V2 M9 -6 V2" stroke="#d8d0ea" stroke-width="2"/>` },
  { id: 'mouth-tongue', kind: 'mouth', at: [100, 154], w: 62, art: `<path d="M-30 -6 Q0 24 30 -6" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/><path d="M4 9 Q14 28 22 9 Z" fill="#ff8fa3" ${S3}/>` },
  { id: 'hat-top', kind: 'hat', at: [100, 22], w: 92, art: `<rect x="-28" y="-46" width="56" height="50" rx="5" fill="${INK}"/><rect x="-28" y="-6" width="56" height="9" fill="#f0453a"/><rect x="-46" y="2" width="92" height="10" rx="5" fill="${INK}"/>` },
  { id: 'hat-party', kind: 'hat', at: [100, 16], w: 60, art: `<path d="M-28 18 L0 -50 L28 18 Z" fill="#62d9d0" ${S3}/><circle cx="-6" cy="-6" r="4" fill="#ffd54a"/><circle cx="8" cy="6" r="4" fill="#ff9fce"/><circle cx="2" cy="-26" r="3.5" fill="#f0453a"/><circle cy="-52" r="9" fill="#ff9fce" ${S3}/>` },
  { id: 'hat-crown', kind: 'hat', at: [100, 24], w: 84, art: `<path d="M-40 14 L-40 -26 L-20 -6 L0 -36 L20 -6 L40 -26 L40 14 Z" fill="#ffd54a" ${S3}/><circle cx="-20" cy="2" r="5" fill="#f0453a"/><circle cy="2" r="5" fill="#2f7cf0"/><circle cx="20" cy="2" r="5" fill="#4db84d"/>` },
  { id: 'hat-cap', kind: 'hat', at: [100, 30], w: 110, art: `<path d="M-48 10 A48 42 0 0 1 48 10 Z" fill="#3d7ef0" ${S3}/><path d="M30 6 H64 Q68 14 56 16 H24 Z" fill="#2a5fc0" ${S3}/><circle cy="-30" r="6" fill="#ffd54a" ${S3}/>` },
  { id: 'hair-curly', kind: 'hat', at: [100, 34], w: 150, art: [-60, -40, -20, 0, 20, 40, 60].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? -8 : 0}" r="17" fill="#8b5a2b" ${S3}/>`).join('') },
  { id: 'extra-glasses', kind: 'extra', at: [100, 92], w: 110, art: `<circle cx="-26" r="21" fill="rgba(160,210,255,0.25)" stroke="${INK}" stroke-width="5"/><circle cx="26" r="21" fill="rgba(160,210,255,0.25)" stroke="${INK}" stroke-width="5"/><path d="M-5 -2 Q0 -7 5 -2 M-47 -4 L-56 -8 M47 -4 L56 -8" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` },
  { id: 'extra-moustache', kind: 'extra', at: [100, 136], w: 76, art: `<path d="M0 -4 C-10 -12 -26 -10 -34 0 C-30 2 -26 -2 -24 4 C-18 10 -8 6 0 0 C8 6 18 10 24 4 C26 -2 30 2 34 0 C26 -10 10 -12 0 -4 Z" fill="#5a3a2a" ${S3}/>` },
  { id: 'extra-blush', kind: 'extra', at: [100, 128], w: 120, art: '<ellipse cx="-46" rx="14" ry="9" fill="#ff8fa3" opacity=".7"/><ellipse cx="46" rx="14" ry="9" fill="#ff8fa3" opacity=".7"/>' },
  { id: 'extra-bunny', kind: 'extra', at: [100, 14], w: 90, art: [-28, 28].map(x => `<ellipse cx="${x}" cy="-30" rx="15" ry="38" transform="rotate(${x / 3} ${x} -30)" fill="#fff" ${S3}/><ellipse cx="${x}" cy="-28" rx="7" ry="26" transform="rotate(${x / 3} ${x} -30)" fill="#ffb6c8"/>`).join('') },
  { id: 'extra-bow', kind: 'extra', at: [100, 204], w: 70, art: `<path d="M0 0 L-32 -16 L-32 16 Z M0 0 L32 -16 L32 16 Z" fill="#ff3b94" ${S3}/><circle r="7" fill="#ff3b94" ${S3}/>` },
];
const PART = new Map(PARTS.map(p => [p.id, p]));

const KINDS = [
  { id: 'eyes', icon: eyePair(15, 7) },
  { id: 'nose', icon: '<circle r="22" fill="#f0453a" stroke="#3a3357" stroke-width="4"/><circle cx="-7" cy="-8" r="6" fill="#fff" opacity=".85"/>' },
  { id: 'mouth', icon: `<path d="M-34 -8 Q0 30 34 -8" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>` },
  { id: 'hat', icon: `<g transform="translate(0 14)"><rect x="-26" y="-50" width="52" height="46" rx="5" fill="${INK}"/><rect x="-26" y="-12" width="52" height="8" fill="#f0453a"/><rect x="-42" y="-4" width="84" height="10" rx="5" fill="${INK}"/></g>` },
  { id: 'extra', icon: `<g transform="scale(0.8)"><circle cx="-26" r="21" fill="none" stroke="${INK}" stroke-width="6"/><circle cx="26" r="21" fill="none" stroke="${INK}" stroke-width="6"/><path d="M-5 -2 Q0 -7 5 -2" fill="none" stroke="${INK}" stroke-width="6"/></g>` },
];

// Who is being dressed up. Each base is drawn in the same 200 × 220 frame.
const BASES = [
  { id: 'kid', art: `<circle cx="28" cy="112" r="20" fill="#ffd2ad" ${S3}/><circle cx="172" cy="112" r="20" fill="#ffd2ad" ${S3}/><circle cx="100" cy="112" r="80" fill="#ffdcbf" stroke="${INK}" stroke-width="4"/>` },
  { id: 'monster', art: `<path d="M64 46 L54 14 L80 38 Z M136 46 L146 14 L120 38 Z" fill="#ffd54a" ${S3}/><path d="M100 30 C160 30 186 70 184 120 C182 172 150 196 100 196 C50 196 18 172 16 120 C14 70 40 30 100 30 Z" fill="#7ed67e" stroke="${INK}" stroke-width="4"/><circle cx="52" cy="150" r="9" fill="#5fb55f"/><circle cx="150" cy="60" r="7" fill="#5fb55f"/><circle cx="160" cy="160" r="6" fill="#5fb55f"/>` },
  { id: 'potato', art: `<ellipse cx="100" cy="116" rx="72" ry="92" fill="#d6a874" stroke="${INK}" stroke-width="4"/><g fill="#b98957"><circle cx="58" cy="70" r="4"/><circle cx="140" cy="88" r="3"/><circle cx="66" cy="170" r="3.5"/><circle cx="136" cy="176" r="4"/><circle cx="150" cy="140" r="2.5"/></g>` },
  { id: 'robot', art: `<path d="M100 34 V14" stroke="${INK}" stroke-width="5"/><circle cx="100" cy="12" r="8" fill="#f0453a" ${S3}/><rect x="10" y="98" width="16" height="34" rx="6" fill="#9aa8c4" ${S3}/><rect x="174" y="98" width="16" height="34" rx="6" fill="#9aa8c4" ${S3}/><rect x="24" y="34" width="152" height="164" rx="28" fill="#b8c4dc" stroke="${INK}" stroke-width="4"/><g fill="#8a98b8"><circle cx="40" cy="50" r="4"/><circle cx="160" cy="50" r="4"/><circle cx="40" cy="182" r="4"/><circle cx="160" cy="182" r="4"/></g>` },
];

const DICE = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="8" cy="8" r="1.7" fill="${INK}"/><circle cx="16" cy="8" r="1.7" fill="${INK}"/><circle cx="12" cy="12" r="1.7" fill="${INK}"/><circle cx="8" cy="16" r="1.7" fill="${INK}"/><circle cx="16" cy="16" r="1.7" fill="${INK}"/></svg>`;
const SWAP = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#ffdcbf" stroke="${INK}" stroke-width="2"/><circle cx="9" cy="10" r="1.4" fill="${INK}"/><circle cx="15" cy="10" r="1.4" fill="${INK}"/><path d="M8.5 14.5 Q12 17.5 15.5 14.5" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M19 4 l2 3 -3.5 .5" fill="none" stroke="#2ba49a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="54" r="38" fill="#ffdcbf" stroke="#3a3357" stroke-width="4"/>
  <circle cx="36" cy="48" r="9" fill="#fff" stroke="#3a3357" stroke-width="3"/><circle cx="38" cy="50" r="4" fill="#3a3357"/>
  <circle cx="64" cy="46" r="11" fill="#fff" stroke="#3a3357" stroke-width="3"/><circle cx="60" cy="42" r="5" fill="#3a3357"/>
  <circle cx="50" cy="62" r="7" fill="#f0453a" stroke="#3a3357" stroke-width="3"/>
  <path d="M34 74 Q50 86 66 74" fill="none" stroke="#3a3357" stroke-width="4" stroke-linecap="round"/>
  <path d="M30 20 L50 2 L70 20 Z" fill="#62d9d0" stroke="#3a3357" stroke-width="3" stroke-linejoin="round"/>
</svg>`;

function readFace() {
  try {
    const saved = JSON.parse(localStorage.getItem(childKey(KEY)) || 'null');
    if (saved && BASES.some(b => b.id === saved.base) && Array.isArray(saved.parts)) {
      return { base: saved.base, parts: saved.parts.filter(p => PART.has(p.id) && Number.isFinite(p.x) && Number.isFinite(p.y)).slice(-MAX_PARTS) };
    }
  } catch (e) { /* fall through */ }
  return { base: 'kid', parts: [] };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function start(ctx) {
  const { stage, audio, celebrate, setReprompt, recordOutcome } = ctx;
  let alive = true;
  const face = readFace();
  let kind = 'eyes';
  let complete = ['eyes', 'nose', 'mouth'].every(k => face.parts.some(p => PART.get(p.id).kind === k));
  const timers = new Set();
  const later = (ms, fn) => {
    const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms);
    timers.add(id);
  };

  const shell = document.createElement('div');
  shell.className = 'fc-shell';
  shell.innerHTML = `
    <div class="fc-stage">
      <svg class="fc-svg" viewBox="-20 -40 240 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Silly face">
        <g class="fc-base"></g><g class="fc-parts"></g>
      </svg>
      <div class="fc-tools">
        <button class="fc-tool fc-swap" aria-label="Change face">${SWAP}</button>
        <button class="fc-tool fc-dice" aria-label="Surprise face">${DICE}</button>
      </div>
    </div>
    <div class="fc-tray-wrap">
      <div class="fc-kinds"></div>
      <div class="fc-tray"></div>
    </div>`;
  stage.appendChild(shell);

  const svg = shell.querySelector('.fc-svg');
  const baseG = shell.querySelector('.fc-base');
  const partsG = shell.querySelector('.fc-parts');
  const kindsEl = shell.querySelector('.fc-kinds');
  const tray = shell.querySelector('.fc-tray');
  const trayWrap = shell.querySelector('.fc-tray-wrap');
  const els = new Map(); // placement → <g>

  function save() {
    try { localStorage.setItem(childKey(KEY), JSON.stringify(face)); } catch (e) { /* optional */ }
  }

  function toLocal(x, y) {
    const pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    const m = svg.getScreenCTM();
    return m ? pt.matrixTransform(m.inverse()) : { x: 100, y: 110 };
  }

  function overTray(x, y) {
    const r = trayWrap.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function restart(node, cls) {
    node.classList.remove(cls);
    node.getBoundingClientRect();
    node.classList.add(cls);
  }

  function drawBase() {
    const b = BASES.find(x => x.id === face.base) || BASES[0];
    baseG.innerHTML = b.art;
  }

  function position(p, g) {
    g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
  }

  // A part reacts to a tap in its own way.
  function react(p, g) {
    const k = PART.get(p.id).kind;
    const inner = g.firstElementChild;
    if (k === 'eyes') { restart(inner, 'fc-blink'); audio.squeak(); }
    else if (k === 'nose') { restart(inner, 'fc-boop'); audio.honk(); }
    else if (k === 'mouth') { restart(inner, 'fc-chatter'); audio.babble(); }
    else if (k === 'hat') { restart(inner, 'fc-hop'); audio.boing(); }
    else { restart(inner, 'fc-wiggle'); audio.pop(); }
  }

  function addEl(p, fresh) {
    const part = PART.get(p.id);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `fc-part fc-${part.kind}`);
    g.innerHTML = `<g class="fc-part-art${fresh ? ' fc-pop' : ''}">${part.art}</g>`;
    position(p, g);
    partsG.appendChild(g);
    els.set(p, g);
    bindPlaced(p, g);
    return g;
  }

  function removePart(p, animate = true) {
    const g = els.get(p);
    face.parts.splice(face.parts.indexOf(p), 1);
    els.delete(p);
    if (!g) return;
    if (animate) {
      restart(g.firstElementChild, 'fc-poof');
      later(260, () => g.remove());
    } else g.remove();
  }

  function checkComplete() {
    const has = k => face.parts.some(p => PART.get(p.id).kind === k);
    const now = has('eyes') && has('nose') && has('mouth');
    if (now && !complete) {
      if (recordOutcome) recordOutcome(true, 'face');
      later(350, () => {
        audio.giggle();
        restart(svg, 'fc-happy');
        celebrate.big({ quick: true });
      });
    }
    complete = now;
  }

  // Tap from the tray: pop the part in at its usual spot, swapping out
  // whatever of the same kind is already sitting there.
  function placeAtHome(id) {
    const part = PART.get(id);
    const [x, y] = part.at;
    const same = face.parts.find(p => PART.get(p.id).kind === part.kind && Math.hypot(p.x - x, p.y - y) < 26);
    if (same) removePart(same);
    place(id, x, y);
  }

  function place(id, x, y) {
    const p = { id, x, y };
    face.parts.push(p);
    while (face.parts.length > MAX_PARTS) removePart(face.parts[0], false);
    addEl(p, true);
    audio.pop();
    save();
    checkComplete();
  }

  function bindPlaced(p, g) {
    let press = null;
    g.addEventListener('pointerdown', e => {
      if (!alive || press) return;
      e.preventDefault();
      e.stopPropagation();
      try { g.setPointerCapture(e.pointerId); } catch (err) { /* best-effort */ }
      const at = toLocal(e.clientX, e.clientY);
      press = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x - at.x, oy: p.y - at.y, moved: false };
      g.classList.add('held');
    });
    g.addEventListener('pointermove', e => {
      if (!press || e.pointerId !== press.id) return;
      if (Math.hypot(e.clientX - press.sx, e.clientY - press.sy) > 8) press.moved = true;
      if (!press.moved) return;
      const at = toLocal(e.clientX, e.clientY);
      p.x = clamp(at.x + press.ox, -10, 210);
      p.y = clamp(at.y + press.oy, -30, 250);
      position(p, g);
      g.classList.toggle('leaving', overTray(e.clientX, e.clientY));
    });
    const end = e => {
      if (!press || e.pointerId !== press.id) return;
      const tap = !press.moved && e.type === 'pointerup';
      press = null;
      g.classList.remove('held', 'leaving');
      if (tap) react(p, g);
      else if (e.type === 'pointerup' && overTray(e.clientX, e.clientY)) {
        removePart(p);
        audio.pop();
        complete = ['eyes', 'nose', 'mouth'].every(k => face.parts.some(q => PART.get(q.id).kind === k));
      }
      save();
    };
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
    g.addEventListener('lostpointercapture', end);
  }

  // Tapping the face itself: a giggle and a wobble, and the eyes blink.
  baseG.addEventListener('pointerdown', () => {
    if (!alive) return;
    audio.giggle();
    restart(svg, 'fc-wobble');
    blink();
  });

  function blink() {
    els.forEach((g, p) => { if (PART.get(p.id).kind === 'eyes') restart(g.firstElementChild, 'fc-blink'); });
  }

  // Now and then the face blinks on its own, so it always feels alive.
  const blinker = setInterval(() => { if (alive && Math.random() < 0.6) blink(); }, 3800);

  /* ---------------- the tray ---------------- */

  function renderKinds() {
    kindsEl.replaceChildren();
    KINDS.forEach(k => {
      const b = document.createElement('button');
      b.className = 'fc-kind' + (k.id === kind ? ' selected' : '');
      b.setAttribute('aria-label', `Show ${k.id}`);
      b.innerHTML = `<svg viewBox="-50 -50 100 100" aria-hidden="true">${k.icon}</svg>`;
      b.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (kind === k.id) return;
        kind = k.id;
        audio.pop();
        renderKinds();
        renderTray();
      });
      kindsEl.appendChild(b);
    });
  }

  function renderTray() {
    tray.replaceChildren();
    PARTS.filter(p => p.kind === kind).forEach((part, n) => {
      const b = document.createElement('button');
      b.className = 'fc-item pop-in';
      b.style.animationDelay = `${n * 0.05}s`;
      b.setAttribute('aria-label', 'Put this on the face');
      const half = Math.max(part.w, 70) / 2 + 8;
      b.innerHTML = `<svg viewBox="${-half} ${-half} ${half * 2} ${half * 2}" aria-hidden="true">${part.art}</svg>`;
      let press = null;
      let ghost = null;
      b.addEventListener('pointerdown', e => {
        if (!alive) return;
        press = { id: e.pointerId, sx: e.clientX, sy: e.clientY };
        try { b.setPointerCapture(e.pointerId); } catch (err) { /* best-effort */ }
      });
      b.addEventListener('pointermove', e => {
        if (!press || e.pointerId !== press.id) return;
        if (!ghost && Math.hypot(e.clientX - press.sx, e.clientY - press.sy) > 12) {
          ghost = document.createElement('div');
          ghost.className = 'fc-ghost';
          const scale = svg.getBoundingClientRect().width / 240;
          ghost.style.width = ghost.style.height = `${Math.round(half * 2 * scale)}px`;
          ghost.innerHTML = b.innerHTML;
          document.body.appendChild(ghost);
        }
        if (ghost) {
          ghost.style.left = `${e.clientX}px`;
          ghost.style.top = `${e.clientY}px`;
        }
      });
      const end = e => {
        if (!press || e.pointerId !== press.id) return;
        const dragged = !!ghost;
        press = null;
        if (ghost) { ghost.remove(); ghost = null; }
        if (!alive || e.type !== 'pointerup') return;
        if (!dragged) { placeAtHome(part.id); return; }
        const r = svg.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const at = toLocal(e.clientX, e.clientY);
          place(part.id, clamp(at.x, -10, 210), clamp(at.y, -30, 250));
        }
      };
      b.addEventListener('pointerup', end);
      b.addEventListener('pointercancel', end);
      tray.appendChild(b);
    });
  }

  /* ---------------- tools ---------------- */

  shell.querySelector('.fc-swap').addEventListener('pointerdown', e => {
    e.stopPropagation();
    const i = BASES.findIndex(b => b.id === face.base);
    face.base = BASES[(i + 1) % BASES.length].id;
    drawBase();
    restart(svg, 'fc-wobble');
    audio.whoosh();
    save();
  });

  // A whole surprise face: eyes, nose and mouth, and maybe a hat or extra.
  shell.querySelector('.fc-dice').addEventListener('pointerdown', e => {
    e.stopPropagation();
    [...face.parts].forEach(p => removePart(p, false));
    complete = false;
    const one = k => { const pool = PARTS.filter(p => p.kind === k); return pool[Math.floor(Math.random() * pool.length)]; };
    const picks = [one('eyes'), one('nose'), one('mouth')];
    if (Math.random() < 0.7) picks.push(one('hat'));
    if (Math.random() < 0.5) picks.push(one('extra'));
    if (Math.random() < 0.4) face.base = BASES[Math.floor(Math.random() * BASES.length)].id;
    drawBase();
    audio.rattleShake();
    picks.forEach((part, n) => later(140 + n * 120, () => {
      face.parts.push({ id: part.id, x: part.at[0], y: part.at[1] });
      addEl(face.parts[face.parts.length - 1], true);
      audio.pop();
      save();
      if (n === picks.length - 1) checkComplete();
    }));
  });

  drawBase();
  face.parts.forEach(p => addEl(p, false));
  renderKinds();
  renderTray();
  setReprompt(null); // free play: never nag
  return () => {
    alive = false;
    clearInterval(blinker);
    timers.forEach(clearTimeout);
    timers.clear();
    document.querySelectorAll('.fc-ghost').forEach(n => n.remove());
  };
}

export default {
  id: 'faces',
  title: 'Silly Faces',
  icon: ICON,
  start,
};
