// Adds the Daddy Shark line-art page to the existing Coloring game without
// changing its saved-gallery or completion logic. The original first page is
// kept hidden as a small event bridge so Coloring's private selected-color and
// touched-state continue to work normally.

import * as audio from '../engine/audio.js';

const PALETTE = ['#f04e3e', '#ff8c2e', '#ffcf3d', '#4db84d', '#3d7ef0', '#9b5fe0', '#ff9fce', '#8a5a3c'];
const LINE = '#3a3357';
const TONGUE = '#e0392b';

const DADDY_SHARK_SVG = `
<svg data-coloring-shark="daddy" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Daddy Shark coloring picture">
  <!-- The dorsal fin, both side fins/hands, head, body and tail deliberately
       share one data-region so a single tap colors all of them together. -->
  <g data-region="daddy-blue-parts" fill="#fff" stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M89 40 C90 23 97 10 104 6 C112 18 115 29 112 42 Z"/>
    <path d="M46 118 C30 118 16 128 9 142 C26 148 42 144 54 133 Z"/>
    <path d="M150 118 C166 118 180 128 187 142 C170 148 154 144 142 133 Z"/>
    <path d="M100 28 C66 28 42 52 40 86 C38 108 44 128 60 145 C74 158 90 165 103 165 C118 163 130 155 138 143 C148 128 152 108 150 88 C148 55 128 28 100 28 Z"/>
    <path d="M138 143 C154 148 172 143 187 128 C185 142 178 155 167 163 C177 166 185 176 184 187 C168 181 155 171 146 159 C142 154 139 149 138 143 Z"/>
  </g>

  <!-- Belly only tracks the shark's front contour so it doesn't double up
       with the body outline running up its back. -->
  <path data-region="daddy-belly" d="M50 92 C46 112 50 130 64 146 C78 160 92 166 103 166 C116 164 127 157 135 146 C122 152 108 155 96 153 C78 150 62 138 54 118 C50 110 49 100 50 92 Z"
        fill="#fff" stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>

  <path data-region="daddy-mouth" d="M64 98 C68 116 81 130 100 132 C119 130 132 116 136 98 C124 106 113 111 100 111 C87 111 76 106 64 98 Z"
        fill="#fff" stroke="${LINE}" stroke-width="4.5" stroke-linejoin="round"/>

  <!-- Fixed red tongue sits behind the teeth, same idea as the always-white teeth below. -->
  <path d="M72 104 C82 111 91 114 100 114 C109 114 118 111 128 104 C126 116 114 126 100 126 C86 126 74 116 72 104 Z" fill="${TONGUE}"/>

  <!-- Teeth stay inset from the mouth corners and remain white while the mouth itself is colorable. -->
  <path d="M76 106 L80.5 115 L85 106 Z M89 106 L93.5 116 L98 106 Z M102 106 L106.5 116 L111 106 Z M114 106 L118.5 115 L123 106 Z"
        fill="#fff" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M80 124 L84.5 116 L89 124 Z M92 125 L96.5 116 L101 125 Z M104 125 L108.5 116 L113 125 Z M116 124 L120 116 L124 124 Z"
        fill="#fff" stroke="${LINE}" stroke-width="1.6" stroke-linejoin="round"/>

  <ellipse cx="78" cy="83" rx="15" ry="18" fill="#fff" stroke="${LINE}" stroke-width="4"/>
  <ellipse cx="122" cy="83" rx="15" ry="18" fill="#fff" stroke="${LINE}" stroke-width="4"/>
  <ellipse cx="80" cy="86" rx="8" ry="10" fill="#171522"/>
  <ellipse cx="120" cy="86" rx="8" ry="10" fill="#171522"/>
  <circle cx="77" cy="82" r="3" fill="#fff"/>
  <circle cx="117" cy="82" r="3" fill="#fff"/>
  <circle cx="93" cy="96" r="2.4" fill="${LINE}"/>
  <circle cx="100" cy="96" r="2.4" fill="${LINE}"/>
  <circle cx="107" cy="96" r="2.4" fill="${LINE}"/>
</svg>`;

let activePic = null;
let patchedThisSession = false;
let patchPending = false;

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

function addDaddyShark(pic) {
  if (patchedThisSession || pic !== activePic || !pic.isConnected) return;

  const originalSvg = pic.querySelector('svg');
  const donorRegion = originalSvg && originalSvg.querySelector('[data-region]');
  if (!originalSvg || !donorRegion) return;

  patchedThisSession = true;

  // Keep the already-wired original SVG hidden. Dispatching to one of its
  // regions lets the Coloring module mark the picture as touched and enables
  // the check button, while the visible shark receives the actual color.
  originalSvg.style.display = 'none';
  originalSvg.setAttribute('aria-hidden', 'true');
  pic.insertAdjacentHTML('afterbegin', DADDY_SHARK_SVG);

  const shark = pic.querySelector('svg[data-coloring-shark="daddy"]');
  if (!shark) return;

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

  if (pic !== activePic) {
    activePic = pic;
    patchedThisSession = false;
  }

  if (patchedThisSession || patchPending) return;
  patchPending = true;
  requestAnimationFrame(() => {
    patchPending = false;
    addDaddyShark(pic);
  });
}

new MutationObserver(syncColoringSession).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

syncColoringSession();
