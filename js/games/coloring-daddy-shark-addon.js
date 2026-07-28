// Adds the Daddy Shark line-art page to the existing Coloring game without
// changing its saved-gallery or completion logic. The original first page is
// kept hidden as a small event bridge so Coloring's private selected-color and
// touched-state continue to work normally.

import * as audio from '../engine/audio.js';

const PALETTE = ['#f04e3e', '#ff8c2e', '#ffcf3d', '#4db84d', '#3d7ef0', '#9b5fe0', '#ff9fce', '#8a5a3c'];
const LINE = '#3a3357';

const DADDY_SHARK_SVG = `
<svg data-coloring-shark="daddy" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Daddy Shark coloring picture">
  <!-- The dorsal fin, both side fins/hands, head, body and tail deliberately
       share one data-region so a single tap colors all of them together. -->
  <g data-region="daddy-blue-parts" fill="#fff" stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">
    <path d="M89 42 C90 25 97 12 104 8 C112 20 115 31 112 44 Z"/>
    <path d="M54 104 C39 103 25 112 18 125 C34 131 49 128 61 118 Z"/>
    <path d="M146 104 C162 103 177 113 184 126 C168 131 151 127 139 118 Z"/>
    <path d="M100 35 C66 35 42 59 42 92 C42 119 60 136 81 140 C86 157 99 171 117 178 C113 159 117 144 128 132 C146 122 158 108 158 89 C158 58 134 35 100 35 Z"/>
    <path d="M120 151 C140 153 159 144 174 132 C172 146 167 157 159 164 C167 171 171 181 169 190 C155 182 145 174 138 165 C131 164 125 161 119 157 Z"/>
  </g>

  <path data-region="daddy-belly" d="M43 98 C57 112 77 119 100 119 C123 119 143 112 157 98 C154 119 142 132 126 138 C117 149 114 163 118 178 C101 171 88 157 81 140 C62 136 48 121 43 98 Z"
        fill="#fff" stroke="${LINE}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>

  <path data-region="daddy-mouth" d="M70 104 C80 113 90 118 100 118 C111 118 121 113 130 104 C129 123 116 136 100 136 C84 136 71 123 70 104 Z"
        fill="#fff" stroke="${LINE}" stroke-width="4.5" stroke-linejoin="round"/>

  <!-- Teeth remain white while the mouth itself is colorable. -->
  <path d="M75 108 L82 117 L89 108 L96 117 L103 108 L110 117 L117 108 L124 115"
        fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="miter" stroke-linecap="square"/>
  <path d="M80 130 L87 121 L94 130 L101 121 L108 130 L115 121 L121 128"
        fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="miter" stroke-linecap="square"/>

  <ellipse cx="78" cy="83" rx="15" ry="18" fill="#fff" stroke="${LINE}" stroke-width="4"/>
  <ellipse cx="122" cy="83" rx="15" ry="18" fill="#fff" stroke="${LINE}" stroke-width="4"/>
  <ellipse cx="80" cy="86" rx="8" ry="10" fill="#171522"/>
  <ellipse cx="120" cy="86" rx="8" ry="10" fill="#171522"/>
  <circle cx="77" cy="82" r="3" fill="#fff"/>
  <circle cx="117" cy="82" r="3" fill="#fff"/>
  <circle cx="96" cy="98" r="2.7" fill="${LINE}"/>
  <circle cx="104" cy="98" r="2.7" fill="${LINE}"/>
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
