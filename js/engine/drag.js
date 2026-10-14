// Pointer-events drag helper tuned for toddler fingers: the element scales up
// while held, drops are accepted within a generous snap radius, and misses
// bounce gently back to the start — never a punishment.
//
// Tap-to-place: holding a finger down for a whole carry is hard at 18–30
// months, so a quick tap is a second way to move things. Tapping an item
// lifts it (it glows and its destinations pulse); tapping a destination
// sends it there through the same onDrop verdict a real drop gets. When only
// one destination exists (Feed Me's animal) a tap sends the item straight
// there. Parents can switch this off in Settings.

import * as audio from './audio.js';

const TAP_KEY = 'tinytaps-tap-place';
const TAP_MOVE = 10;   // px of travel before a press counts as a drag
const TAP_MS = 600;    // longest press that still counts as a tap

export function tapPlaceEnabled() {
  try { return localStorage.getItem(TAP_KEY) !== '0'; } catch (e) { return true; }
}

export function setTapPlace(on) {
  try { localStorage.setItem(TAP_KEY, on ? '1' : '0'); } catch (e) { /* optional */ }
}

// One lifted item at a time, app-wide.
let selection = null;

function clearSelection() {
  if (!selection) return;
  const s = selection;
  selection = null;
  s.clear();
}

// Capture phase, so a tap on a destination is seen before anything else and
// a tap anywhere else simply puts the lifted item back down.
document.addEventListener('pointerdown', e => {
  if (!selection) return;
  const s = selection;
  if (!s.el.isConnected) { clearSelection(); return; }
  if (s.el.contains(e.target)) return; // the item's own handler decides
  const hit = s.hitTarget(e.clientX, e.clientY);
  clearSelection();
  if (hit) {
    e.preventDefault();
    s.place(hit);
  }
}, true);

function rectHit(node, x, y) {
  const r = node.getBoundingClientRect();
  const pad = Math.max(r.width, r.height) * 0.12;
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

export function makeDraggable(el, {
  getTargets,          // () => [{ el, data }]
  onDrop,              // (targetData|null, el) => 'accept' | 'reject'
  snapRadiusFactor = 0.6, // fraction of target size still counted as a hit
  onPickup = null,
  // Leniency for "which item" games (e.g. Feed Me): if the child has picked
  // up the correct item, the first bit of real movement finishes the drag
  // for them instead of demanding an accurate carry all the way to the
  // target — picking the right one is the actual challenge, not the aim.
  autoCompleteIfCorrect = null, // () => boolean
  autoCompleteTarget = null,    // () => { el, data }
} = {}) {
  let startX = 0, startY = 0, dx = 0, dy = 0;
  let dragging = false;
  let disabled = false;
  let autoCompleting = false;
  let sending = false;
  let moved = false;
  let wasSelected = false;
  let t0 = 0;

  el.style.touchAction = 'none';

  function center(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }

  function targets() {
    return getTargets ? getTargets() : [];
  }

  function bounceHome() {
    el.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.transform = 'translate(0, 0) scale(1)';
    el.addEventListener('transitionend', () => { el.style.zIndex = ''; }, { once: true });
  }

  function onDown(e) {
    if (disabled || dragging || autoCompleting || sending) return;
    wasSelected = !!selection && selection.el === el;
    if (wasSelected) clearSelection();
    dragging = true;
    moved = false;
    t0 = performance.now();
    dx = 0; dy = 0;
    startX = e.clientX;
    startY = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.style.transition = 'none';
    el.style.zIndex = '100';
    el.classList.add('dragging');
    if (onPickup) onPickup();
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    dx = e.clientX - startX;
    dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > TAP_MOVE) moved = true;
    el.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
    if (autoCompleteIfCorrect && autoCompleteTarget && moved && autoCompleteIfCorrect()) {
      finishToTarget(autoCompleteTarget());
    }
  }

  function finishToTarget(target) {
    if (!target || autoCompleting) return;
    autoCompleting = true;
    dragging = false;
    el.classList.remove('dragging');
    const verdict = onDrop ? onDrop(target.data, el) : 'reject';
    const c = center(el);
    if (verdict === 'accept') {
      const tc = center(target.el);
      el.style.transition = 'transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = `translate(${dx + tc.x - c.x}px, ${dy + tc.y - c.y}px) scale(1)`;
    } else {
      bounceHome();
    }
  }

  // Tap-to-place: glide from home to the destination, then ask onDrop. An
  // accepted item stays there (exactly like a drop); a rejected one bounces
  // home again, so a wrong choice reads as "not this one".
  function sendTo(target) {
    if (disabled || sending || !target) return;
    sending = true;
    el.style.zIndex = '100';
    const c = center(el);
    const tc = center(target.el);
    // The element's untransformed centre is the current one minus its drag.
    const ox = tc.x - (c.x - dx);
    const oy = tc.y - (c.y - dy);
    dx = ox; dy = oy;
    el.style.transition = 'transform 0.34s cubic-bezier(0.4, 0, 0.3, 1)';
    el.style.transform = `translate(${ox}px, ${oy}px) scale(0.92)`;
    setTimeout(() => {
      sending = false;
      if (!el.isConnected) return;
      const verdict = onDrop ? onDrop(target.data, el) : 'reject';
      if (verdict === 'accept') {
        el.style.transition = 'transform 0.18s ease-out';
        el.style.transform = `translate(${ox}px, ${oy}px) scale(1)`;
      } else {
        dx = 0; dy = 0;
        bounceHome();
      }
    }, 340);
  }

  function select() {
    clearSelection();
    el.classList.add('tap-selected');
    el.style.zIndex = '100';
    const lit = targets().map(t => t.el);
    lit.forEach(n => n.classList.add('tap-target'));
    audio.pop();
    selection = {
      el,
      hitTarget: (x, y) => targets().find(t => rectHit(t.el, x, y)) || null,
      place: sendTo,
      clear() {
        el.classList.remove('tap-selected');
        lit.forEach(n => n.classList.remove('tap-target'));
        if (!sending) el.style.zIndex = '';
      },
    };
  }

  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');

    const tap = e.type === 'pointerup' && !moved && performance.now() - t0 < TAP_MS;
    if (tap && tapPlaceEnabled()) {
      const ts = targets();
      dx = 0; dy = 0;
      if (ts.length === 1) {
        // Settle at home instantly so the glide is measured from there.
        el.style.transition = 'none';
        el.style.transform = 'translate(0, 0) scale(1)';
        sendTo(ts[0]);
        return;
      }
      el.style.transition = 'transform 0.18s ease-out';
      el.style.transform = 'translate(0, 0) scale(1)';
      if (ts.length && !wasSelected) select();
      else el.style.zIndex = '';
      return;
    }

    const c = center(el);
    let hit = null;
    if (e.type === 'pointerup') {
      for (const t of targets()) {
        const tc = center(t.el);
        const reach = Math.max(tc.w, tc.h) * snapRadiusFactor;
        const dist = Math.hypot(c.x - tc.x, c.y - tc.y);
        if (dist < reach) { hit = t; break; }
      }
    }

    const verdict = onDrop ? onDrop(hit ? hit.data : null, el) : 'reject';
    if (verdict === 'accept' && hit) {
      const tc = center(hit.el);
      el.style.transition = 'transform 0.18s ease-out';
      el.style.transform = `translate(${dx + tc.x - c.x}px, ${dy + tc.y - c.y}px) scale(1)`;
    } else {
      // gentle bounce back home
      dx = 0; dy = 0;
      bounceHome();
    }
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  return {
    disable() {
      disabled = true;
      if (selection && selection.el === el) clearSelection();
    },
    enable() { disabled = false; },
  };
}
