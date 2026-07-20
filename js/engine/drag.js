// Pointer-events drag helper tuned for toddler fingers: the element scales up
// while held, drops are accepted within a generous snap radius, and misses
// bounce gently back to the start — never a punishment.

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

  el.style.touchAction = 'none';

  function center(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }

  function onDown(e) {
    if (disabled || dragging || autoCompleting) return;
    dragging = true;
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
    el.style.transform = `translate(${dx}px, ${dy}px) scale(1.12)`;
    if (autoCompleteIfCorrect && autoCompleteTarget && Math.hypot(dx, dy) > 10 && autoCompleteIfCorrect()) {
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
      el.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = 'translate(0, 0) scale(1)';
      el.addEventListener('transitionend', () => { el.style.zIndex = ''; }, { once: true });
    }
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('dragging');

    const c = center(el);
    let hit = null;
    for (const t of (getTargets ? getTargets() : [])) {
      const tc = center(t.el);
      const reach = Math.max(tc.w, tc.h) * snapRadiusFactor;
      const dist = Math.hypot(c.x - tc.x, c.y - tc.y);
      if (dist < reach) { hit = t; break; }
    }

    const verdict = onDrop ? onDrop(hit ? hit.data : null, el) : 'reject';
    if (verdict === 'accept' && hit) {
      const tc = center(hit.el);
      el.style.transition = 'transform 0.18s ease-out';
      el.style.transform = `translate(${dx + tc.x - c.x}px, ${dy + tc.y - c.y}px) scale(1)`;
    } else {
      // gentle bounce back home
      el.style.transition = 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = 'translate(0, 0) scale(1)';
      el.addEventListener('transitionend', () => { el.style.zIndex = ''; }, { once: true });
    }
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  return {
    disable() { disabled = true; },
    enable() { disabled = false; },
  };
}
