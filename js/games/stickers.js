// Sticker Book: browse the stickers earned from big celebrations, then play
// with them. The Book page shows every set (earned stickers in full color,
// the rest waiting as silhouettes). The scene pages — a farm, a jungle and
// the ocean — are sticker playgrounds: drag (or just tap) a sticker from the
// tray to put it in the picture, move it around, tap it to hear it, and drag
// it back to the tray to take it out. Scenes are kept on this device.

import { STICKER_SETS, TOTAL, earned, sticker, stickerArt, playSticker } from '../engine/stickers.js';
import { S } from '../data/strings.js';
import { addTap } from '../engine/ui.js';
import { childKey } from '../engine/children.js';

const VIEW_KEY = 'tinytaps-sticker-view';
const SCENES_KEY = 'tinytaps-sticker-scenes';
const MAX_PER_SCENE = 40;
const SIZE = 0.24;        // sticker width as a fraction of the scene's height
const DRAG_START = 12;    // px before a press on the tray becomes a drag

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="st-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#ffd54a"/><stop offset="100%" stop-color="#f0a416"/>
    </linearGradient>
  </defs>
  <rect x="14" y="12" width="72" height="76" rx="10" fill="#fff"/>
  <rect x="14" y="12" width="18" height="76" rx="9" fill="url(#st-i)"/>
  <path d="M60 28 L65 41 L79 41 L68 50 L72 63 L60 55 L48 63 L52 50 L41 41 L55 41 Z" fill="url(#st-i)"/>
  <circle cx="46" cy="74" r="7" fill="#7ed67e"/>
  <circle cx="66" cy="76" r="5" fill="#ff9fce"/>
</svg>`;

// Scene backdrops, drawn to cover any screen shape (sliced, never stretched).
const FARM_SVG = `
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sc-farm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9edcff"/><stop offset="1" stop-color="#e8f8ff"/></linearGradient></defs>
  <rect width="400" height="300" fill="url(#sc-farm-sky)"/>
  <circle cx="340" cy="52" r="26" fill="#ffd54a"/>
  <g fill="#fff" opacity=".9"><ellipse cx="80" cy="54" rx="34" ry="13"/><ellipse cx="104" cy="46" rx="22" ry="12"/><ellipse cx="220" cy="34" rx="28" ry="10"/></g>
  <path d="M0 150 Q90 112 190 146 T400 132 V300 H0 Z" fill="#9bd77a"/>
  <path d="M0 186 Q120 160 240 182 T400 170 V300 H0 Z" fill="#7cc65a"/>
  <g transform="translate(300 104)">
    <path d="M0 70 V26 L38 0 L76 26 V70 Z" fill="#e0685a"/>
    <path d="M0 26 L38 0 L76 26 L68 26 L38 6 L8 26 Z" fill="#c04a3e"/>
    <rect x="27" y="38" width="22" height="32" rx="2" fill="#7a4a2a"/>
    <path d="M27 38 L49 70 M49 38 L27 70" stroke="#fff" stroke-width="2.5"/>
  </g>
  <g stroke="#b88452" stroke-width="5" stroke-linecap="round">
    <path d="M18 214 V250 M58 210 V246 M98 208 V244 M138 210 V246"/>
    <path d="M10 222 H146 M10 238 H146" stroke-width="4"/>
  </g>
  <g fill="#ff9fce"><circle cx="210" cy="250" r="5"/><circle cx="260" cy="268" r="4"/><circle cx="360" cy="240" r="5"/></g>
  <g fill="#ffcf3d"><circle cx="230" cy="236" r="4"/><circle cx="330" cy="272" r="5"/></g>
</svg>`;

const JUNGLE_SVG = `
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sc-jungle-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9f0c0"/><stop offset="1" stop-color="#eefbe3"/></linearGradient></defs>
  <rect width="400" height="300" fill="url(#sc-jungle-sky)"/>
  <path d="M0 0 H400 V40 Q300 70 200 38 T0 44 Z" fill="#3f8f32" opacity=".85"/>
  <path d="M40 0 V120 M120 0 V90 M300 0 V110 M360 0 V70" stroke="#4a9a3a" stroke-width="3" fill="none"/>
  <g fill="#5aad42"><ellipse cx="40" cy="124" rx="8" ry="5"/><ellipse cx="120" cy="94" rx="8" ry="5"/><ellipse cx="300" cy="114" rx="8" ry="5"/></g>
  <rect x="62" y="96" width="16" height="140" rx="6" fill="#8a6a3c"/>
  <path d="M70 100 C40 90 20 64 16 44 C44 52 62 70 72 96 Z M70 100 C100 86 118 62 122 40 C94 48 76 68 68 96 Z M70 104 C40 108 18 100 6 86 C30 80 54 86 72 100 Z" fill="#4a9a3a"/>
  <rect x="318" y="110" width="14" height="126" rx="6" fill="#8a6a3c"/>
  <path d="M325 112 C300 100 284 78 282 60 C306 68 320 86 327 110 Z M325 112 C350 100 366 80 368 60 C344 68 330 86 323 110 Z" fill="#5aad42"/>
  <path d="M0 210 Q100 186 200 206 T400 196 V300 H0 Z" fill="#6fae4a"/>
  <path d="M120 300 Q170 250 230 262 T330 300 Z" fill="#5fc9e8" opacity=".9"/>
  <g fill="#3f8f32"><path d="M0 300 C10 250 30 230 50 226 C40 250 34 276 36 300 Z"/><path d="M400 300 C390 252 372 232 352 228 C362 252 368 278 366 300 Z"/></g>
  <g fill="#ff9fce"><circle cx="96" cy="250" r="6"/><circle cx="290" cy="236" r="5"/></g>
  <g fill="#ffcf3d"><circle cx="110" cy="262" r="5"/><circle cx="270" cy="248" r="4"/></g>
</svg>`;

const OCEAN_SVG = `
<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sc-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fd0f2"/><stop offset="1" stop-color="#2f8fc9"/></linearGradient></defs>
  <rect width="400" height="300" fill="#bfeeff"/>
  <circle cx="60" cy="34" r="20" fill="#ffd54a"/>
  <path d="M0 70 Q25 60 50 70 T100 70 T150 70 T200 70 T250 70 T300 70 T350 70 T400 70 V300 H0 Z" fill="url(#sc-sea)"/>
  <path d="M0 70 Q25 60 50 70 T100 70 T150 70 T200 70 T250 70 T300 70 T350 70 T400 70" fill="none" stroke="#e8fbff" stroke-width="4"/>
  <g fill="#fff" opacity=".35"><circle cx="90" cy="150" r="6"/><circle cx="98" cy="128" r="4"/><circle cx="300" cy="170" r="7"/><circle cx="292" cy="146" r="4"/></g>
  <path d="M0 262 Q100 244 200 258 T400 250 V300 H0 Z" fill="#ffe3a3"/>
  <g fill="none" stroke="#4fbf5f" stroke-width="7" stroke-linecap="round">
    <path d="M40 270 q-10 -20 0 -40 t0 -40"/><path d="M58 272 q10 -16 0 -32 t0 -30"/>
    <path d="M352 266 q10 -20 0 -40 t0 -38"/>
  </g>
  <g fill="#ff8a70"><circle cx="190" cy="268" r="8"/><circle cx="204" cy="272" r="6"/></g>
  <ellipse cx="270" cy="270" rx="22" ry="10" fill="#a8b4c8"/>
</svg>`;

const VIEWS = [
  { id: 'book', label: 'Book' },
  { id: 'farm', label: 'Farm', svg: FARM_SVG },
  { id: 'jungle', label: 'Jungle', svg: JUNGLE_SVG },
  { id: 'ocean', label: 'Ocean', svg: OCEAN_SVG },
];

const BOOK_TAB = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="3" fill="#ffd54a"/><rect x="4" y="3" width="5" height="18" rx="2.5" fill="#f0a416"/><path d="M14.5 7.5 l1.2 2.6 2.8.3 -2.1 1.9 .6 2.8 -2.5 -1.4 -2.5 1.4 .6 -2.8 -2.1 -1.9 2.8 -.3 Z" fill="#fff"/></svg>`;
const TAB_ICONS = {
  book: BOOK_TAB,
  farm: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21 V10 L12 4 L21 10 V21 Z" fill="#e0685a"/><rect x="9.5" y="13" width="5" height="8" fill="#7a4a2a"/></svg>',
  jungle: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="11" y="10" width="3" height="12" rx="1.2" fill="#8a6a3c"/><path d="M12.5 11 C8 9 5 6 4 3 C8 4 11 7 13 11 Z M12.5 11 C17 9 20 6 21 3 C17 4 14 7 12 11 Z M12.5 12 C8 13 4 12 2 10 C6 9 10 10 13 12 Z" fill="#4a9a3a"/></svg>',
  ocean: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="9" width="20" height="13" rx="3" fill="#3d9fd8"/><path d="M2 10 q2.5 -3 5 0 t5 0 t5 0 t5 0" fill="none" stroke="#bfeeff" stroke-width="2"/><ellipse cx="12" cy="16" rx="4" ry="2.2" fill="#ff8c2e"/><path d="M15.5 16 l3 -2 v4 z" fill="#ff8c2e"/></svg>',
};

function readScenes() {
  try {
    const raw = JSON.parse(localStorage.getItem(childKey(SCENES_KEY)) || '{}');
    const out = {};
    for (const view of VIEWS) {
      if (!view.svg) continue;
      const list = Array.isArray(raw[view.id]) ? raw[view.id] : [];
      out[view.id] = list.filter(p => p && sticker(p.id) && Number.isFinite(p.x) && Number.isFinite(p.y));
    }
    return out;
  } catch (e) {
    return Object.fromEntries(VIEWS.filter(v => v.svg).map(v => [v.id, []]));
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let view = VIEWS.some(v => v.id === localStorage.getItem(childKey(VIEW_KEY))) ? localStorage.getItem(childKey(VIEW_KEY)) : 'book';
  const have = new Set(earned());
  const scenes = readScenes();
  let cleanupView = null;

  const shell = document.createElement('div');
  shell.className = 'sticker-shell';
  const tabs = document.createElement('div');
  tabs.className = 'puzzle-tabs sticker-tabs';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Sticker pages');
  const content = document.createElement('div');
  content.className = 'sticker-content';
  shell.append(tabs, content);
  stage.appendChild(shell);

  VIEWS.forEach(v => {
    const b = document.createElement('button');
    b.className = 'puzzle-tab sticker-tab';
    b.dataset.view = v.id;
    b.innerHTML = `${TAB_ICONS[v.id]}<span>${v.label}</span>`;
    b.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (!alive || view === v.id) return;
      view = v.id;
      try { localStorage.setItem(childKey(VIEW_KEY), view); } catch (err) { /* optional */ }
      audio.pop();
      render();
    });
    tabs.appendChild(b);
  });

  function saveScenes() {
    try { localStorage.setItem(childKey(SCENES_KEY), JSON.stringify(scenes)); } catch (e) { /* optional */ }
  }

  function wiggle(node) {
    node.classList.remove('wiggle');
    void node.offsetWidth;
    node.classList.add('wiggle');
  }

  function renderBook() {
    const book = document.createElement('div');
    book.className = 'sticker-book';
    const count = document.createElement('div');
    count.className = 'sticker-count';
    count.textContent = `${have.size} / ${TOTAL}`;
    book.appendChild(count);
    let n = 0;
    for (const set of STICKER_SETS) {
      const got = set.items.filter(item => have.has(item.id)).length;
      const head = document.createElement('div');
      head.className = 'sticker-set-title';
      head.textContent = `${set.label} · ${got} / ${set.items.length}`;
      const grid = document.createElement('div');
      grid.className = 'sticker-grid';
      set.items.forEach(item => {
        const cell = document.createElement('div');
        cell.className = 'sticker-cell pop-in' + (have.has(item.id) ? ' earned' : '');
        cell.style.animationDelay = `${Math.min(n++, 30) * 0.03}s`;
        cell.innerHTML = stickerArt(item);
        cell.setAttribute('aria-label', have.has(item.id) ? `${item.name} sticker` : 'Sticker still to win');
        if (have.has(item.id)) {
          addTap(cell, () => {
            if (!alive) return;
            wiggle(cell);
            playSticker(audio, item);
            speech.speak(`Your ${item.name} sticker!`);
          });
        }
        grid.appendChild(cell);
      });
      book.append(head, grid);
    }
    content.appendChild(book);
    return null;
  }

  function renderScene(v) {
    const placed = scenes[v.id];
    const wrap = document.createElement('div');
    wrap.className = 'sticker-scene-wrap';
    const scene = document.createElement('div');
    scene.className = 'sticker-scene';
    scene.innerHTML = `<div class="sticker-scene-bg">${v.svg}</div>`;
    const tray = document.createElement('div');
    tray.className = 'sticker-tray';
    wrap.append(scene, tray);
    content.appendChild(wrap);

    const els = new Map(); // placement → element
    let unit = 100;
    let topZ = 1;          // stacking by z-index: moving a node in the DOM
                           // would drop its pointer capture mid-drag

    function measure() {
      unit = scene.clientHeight || 100;
      scene.style.setProperty('--sticker', `${Math.round(unit * SIZE)}px`);
    }

    function position(p, node) {
      node.style.left = `${(p.x * 100).toFixed(2)}%`;
      node.style.top = `${(p.y * 100).toFixed(2)}%`;
    }

    function addPlaced(p, fresh) {
      const item = sticker(p.id);
      const node = document.createElement('div');
      node.className = 'scene-sticker' + (fresh ? ' pop-in' : '');
      node.innerHTML = stickerArt(item, { cutout: true });
      node.style.zIndex = String(topZ++);
      position(p, node);
      scene.appendChild(node);
      els.set(p, node);
      bindPlaced(p, node, item);
      return node;
    }

    function overTray(x, y) {
      const r = tray.getBoundingClientRect();
      return y >= r.top - 10 && x >= r.left && x <= r.right;
    }

    // Placed stickers: drag to move (front-most while held), tap to hear,
    // drop on the tray to take out.
    function bindPlaced(p, node, item) {
      let press = null;
      node.addEventListener('pointerdown', e => {
        if (!alive || press) return;
        e.preventDefault();
        e.stopPropagation();
        try { node.setPointerCapture(e.pointerId); } catch (err) { /* best-effort */ }
        const r = scene.getBoundingClientRect();
        press = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y, r, moved: false };
        node.style.zIndex = String(topZ++); // bring to front
        placed.splice(placed.indexOf(p), 1);
        placed.push(p);
        node.classList.add('held');
      });
      node.addEventListener('pointermove', e => {
        if (!press || e.pointerId !== press.id) return;
        const dx = e.clientX - press.sx;
        const dy = e.clientY - press.sy;
        if (Math.hypot(dx, dy) > 8) press.moved = true;
        p.x = clamp(press.ox + dx / press.r.width, 0, 1);
        p.y = clamp(press.oy + dy / press.r.height, 0, 1.08);
        position(p, node);
        node.classList.toggle('leaving', overTray(e.clientX, e.clientY));
      });
      const end = e => {
        if (!press || e.pointerId !== press.id) return;
        const wasTap = !press.moved && e.type === 'pointerup';
        press = null;
        node.classList.remove('held');
        if (wasTap) {
          wiggle(node);
          playSticker(audio, item);
        } else if (e.type === 'pointerup' && overTray(e.clientX, e.clientY)) {
          placed.splice(placed.indexOf(p), 1);
          els.delete(p);
          node.classList.add('poof');
          audio.pop();
          setTimeout(() => node.remove(), 260);
        } else {
          p.y = clamp(p.y, 0, 1);
          position(p, node);
          node.classList.remove('leaving');
        }
        saveScenes();
      };
      node.addEventListener('pointerup', end);
      node.addEventListener('pointercancel', end);
      node.addEventListener('lostpointercapture', end);
    }

    function place(id, x, y) {
      const p = { id, x, y };
      placed.push(p);
      while (placed.length > MAX_PER_SCENE) {
        const old = placed.shift();
        const n = els.get(old);
        if (n) n.remove();
        els.delete(old);
      }
      saveScenes();
      const node = addPlaced(p, true);
      const item = sticker(id);
      playSticker(audio, item);
      const r = node.getBoundingClientRect();
      celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 12, sound: false });
    }

    // The tray: every earned sticker. A tap drops one into the picture; a
    // drag (upwards on touch, so sideways swipes still scroll the tray)
    // carries it exactly where the child wants it.
    const mine = STICKER_SETS.flatMap(set => set.items).filter(item => have.has(item.id));
    if (!mine.length) {
      tray.innerHTML = '<div class="sticker-tray-empty">★ Play games to win stickers!</div>';
    }
    mine.forEach(item => {
      const chip = document.createElement('button');
      chip.className = 'tray-sticker';
      chip.setAttribute('aria-label', `Put the ${item.name} in the picture`);
      chip.innerHTML = stickerArt(item, { cutout: true });
      let press = null;
      let ghost = null;
      chip.addEventListener('pointerdown', e => {
        if (!alive) return;
        press = { id: e.pointerId, sx: e.clientX, sy: e.clientY, mouse: e.pointerType === 'mouse' };
        // Keep receiving the pointer even after a fast move leaves the chip.
        // (A sideways touch swipe still scrolls the tray: pan-x wins.)
        try { chip.setPointerCapture(e.pointerId); } catch (err) { /* best-effort */ }
      });
      chip.addEventListener('pointermove', e => {
        if (!press || e.pointerId !== press.id) return;
        const dx = e.clientX - press.sx;
        const dy = e.clientY - press.sy;
        if (!ghost) {
          const lifting = press.mouse ? Math.hypot(dx, dy) > DRAG_START : dy < -DRAG_START && Math.abs(dy) > Math.abs(dx);
          if (!lifting) return;
          ghost = document.createElement('div');
          ghost.className = 'sticker-ghost';
          ghost.style.width = ghost.style.height = `${Math.round(unit * SIZE)}px`;
          ghost.innerHTML = stickerArt(item, { cutout: true });
          document.body.appendChild(ghost);
          audio.pop();
        }
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
      });
      const end = e => {
        if (!press || e.pointerId !== press.id) return;
        const wasDrag = !!ghost;
        const moved = Math.hypot(e.clientX - press.sx, e.clientY - press.sy);
        press = null;
        if (ghost) { ghost.remove(); ghost = null; }
        if (!alive || e.type !== 'pointerup') return;
        const r = scene.getBoundingClientRect();
        if (wasDrag) {
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
            place(item.id, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
          }
        } else if (moved < 10) {
          place(item.id, 0.15 + Math.random() * 0.7, 0.4 + Math.random() * 0.45);
        }
      };
      chip.addEventListener('pointerup', end);
      chip.addEventListener('pointercancel', end);
      tray.appendChild(chip);
    });

    measure();
    placed.forEach(p => addPlaced(p, false));
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(scene);
    else window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', measure);
      document.querySelectorAll('.sticker-ghost').forEach(n => n.remove());
    };
  }

  function render() {
    if (cleanupView) { cleanupView(); cleanupView = null; }
    content.replaceChildren();
    tabs.querySelectorAll('.sticker-tab').forEach(b => b.classList.toggle('selected', b.dataset.view === view));
    const v = VIEWS.find(x => x.id === view);
    cleanupView = v.svg ? renderScene(v) : renderBook();
  }

  render();
  speech.speak(S.stickerBook(have.size), { interrupt: false });
  setReprompt(null);
  return () => {
    alive = false;
    if (cleanupView) cleanupView();
  };
}

export default {
  id: 'stickers',
  title: 'Stickers',
  icon: ICON,
  start,
};
