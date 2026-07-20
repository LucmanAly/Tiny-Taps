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
