// Adds the Daddy Shark line-art page to the existing Coloring game without
// changing its saved-gallery or completion logic. The original first page is
// kept hidden as a small event bridge so Coloring's private selected-color and
// touched-state continue to work normally.

import * as audio from '../engine/audio.js';

const PALETTE = ['#0062E0', '#FF8800', '#75D018', '#FFDE00', '#FF3B94', '#FFFFFF', '#BD0D19', '#000000'];
const SHARK_ASSET = 'assets/art/daddy-shark-coloring.svg';

let sharkSvgPromise = null;

let activePic = null;
let patchedThisSession = false;
let patchPending = false;

function loadDaddySharkSvg() {
  if (!sharkSvgPromise) {
    sharkSvgPromise = fetch(SHARK_ASSET).then(response => {
      if (!response.ok) throw new Error(`Could not load ${SHARK_ASSET}`);
      return response.text();
    });
  }
  return sharkSvgPromise;
}

function selectedColor() {
  const dots = [...document.querySelectorAll('.palette-dot')];
  const selected = document.querySelector('.palette-dot.selected');
  const index = dots.indexOf(selected);
  return PALETTE[index] || PALETTE[3];
}

function bridgePointerDown(donorRegion) {
  try {
    donorRegion.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
  } catch (e) {
    donorRegion.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  }
}

async function addDaddyShark(pic) {
  if (patchedThisSession || pic !== activePic || !pic.isConnected) return;

  const originalSvg = pic.querySelector('svg');
  const donorRegion = originalSvg && originalSvg.querySelector('[data-region]');
  if (!originalSvg || !donorRegion) return;

  const svgText = await loadDaddySharkSvg();
  if (patchedThisSession || pic !== activePic || !pic.isConnected || !originalSvg.isConnected) return;

  // Keep the already-wired original SVG hidden. Dispatching to one of its
  // regions lets the Coloring module mark the picture as touched and enables
  // the check button, while the visible shark receives the actual color.
  const template = document.createElement('template');
  template.innerHTML = svgText.trim();
  const shark = template.content.querySelector('svg[data-coloring-shark="daddy"]');
  if (!shark || !shark.querySelector('[data-region]')) throw new Error('Daddy Shark SVG has no colorable regions');

  pic.insertBefore(shark, originalSvg);
  originalSvg.style.display = 'none';
  originalSvg.setAttribute('aria-hidden', 'true');
  patchedThisSession = true;

  shark.querySelectorAll('[data-region]').forEach(region => {
    region.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      region.setAttribute('fill', selectedColor());
      bridgePointerDown(donorRegion);
    });
  });

  // Replace any random animal hello from the hidden page with the matching
  // bundled Daddy Shark pronunciation.
  const audioName = 'coloring:daddy-shark';
  audio.load(audioName, 'assets/audio/animals/daddy_shark.mp3').then(() => {
    setTimeout(() => {
      if (pic.isConnected && pic.contains(shark)) audio.play(audioName, { maxDuration: 2.2 });
    }, 250);
  });
}

function syncColoringSession() {
  const pic = document.querySelector('.color-pic');

  if (!pic) {
    activePic = null;
    patchedThisSession = false;
    patchPending = false;
    return;
  }

  const hasShark = Boolean(pic.querySelector('svg[data-coloring-shark="daddy"]'));
  if (pic !== activePic || !hasShark) {
    activePic = pic;
    patchedThisSession = false;
  }

  if (patchedThisSession || patchPending) return;
  patchPending = true;
  requestAnimationFrame(async () => {
    try {
      await addDaddyShark(pic);
    } catch (error) {
      console.error('Daddy Shark coloring page could not be loaded.', error);
    } finally {
      patchPending = false;
    }
  });
}

new MutationObserver(syncColoringSession).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

syncColoringSession();
