// Tiny shared UI helpers.

// Fade the container out, rebuild its contents, let the new round pop in.
// Games call this for every round after the first so transitions never
// jump-cut.
export function fadeSwap(el, build) {
  el.classList.add('fade-out');
  setTimeout(() => {
    el.classList.remove('fade-out');
    build();
  }, 180);
}

// Tap-vs-scroll disambiguator for elements inside a scrollable container.
// Plain pointerdown fires the instant a finger touches down, before the
// browser knows whether a scroll gesture follows — so a finger grazing a
// tile mid-scroll would otherwise "tap" it. This defers the action to
// pointerup and cancels if the finger moved past `threshold` first.
export function addTap(el, handler, { threshold = 12 } = {}) {
  let startX = 0, startY = 0, moved = false, active = false;

  el.addEventListener('pointerdown', e => {
    active = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
  });
  el.addEventListener('pointermove', e => {
    if (!active) return;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > threshold) moved = true;
  });
  el.addEventListener('pointerup', e => {
    if (active && !moved) handler(e);
    active = false;
  });
  el.addEventListener('pointercancel', () => { active = false; });
}
