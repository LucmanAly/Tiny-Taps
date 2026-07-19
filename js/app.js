import * as audio from './engine/audio.js';
import * as speech from './engine/speech.js';
import * as celebrate from './engine/celebrate.js';
import { games } from './games/index.js';

const screenEl = document.getElementById('screen');
let currentCleanup = null;
let repromptFn = null;
let repromptTimer = null;
const REPROMPT_MS = 9000;

/* ---------------- idle re-prompt ----------------
   Games register a phrase to repeat if the child goes quiet/stuck. */
function armReprompt() {
  clearTimeout(repromptTimer);
  if (!repromptFn) return;
  repromptTimer = setTimeout(() => {
    if (repromptFn) repromptFn();
    armReprompt();
  }, REPROMPT_MS);
}
screenEl.addEventListener('pointerdown', armReprompt, true);

function setReprompt(fn) {
  repromptFn = fn;
  armReprompt();
}

/* ---------------- screens ---------------- */

function clearScreen() {
  if (currentCleanup) { try { currentCleanup(); } catch (e) { console.warn(e); } }
  currentCleanup = null;
  repromptFn = null;
  clearTimeout(repromptTimer);
  speech.stop();
  audio.stopPlayback();
  screenEl.innerHTML = '';
}

function el(tag, className, parent) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (parent) parent.appendChild(n);
  return n;
}

/* ---------------- splash ---------------- */

const LOGO_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sun-g" cx="40%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#fff3b0"/>
      <stop offset="55%" stop-color="#ffd54a"/>
      <stop offset="100%" stop-color="#ffb627"/>
    </radialGradient>
  </defs>
  <g>
    ${Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const x1 = 50 + Math.cos(a) * 38, y1 = 50 + Math.sin(a) * 38;
      const x2 = 50 + Math.cos(a) * 47, y2 = 50 + Math.sin(a) * 47;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffca3a" stroke-width="5" stroke-linecap="round"/>`;
    }).join('')}
    <circle cx="50" cy="50" r="32" fill="url(#sun-g)"/>
    <circle cx="40" cy="46" r="3.4" fill="#3a3357"/>
    <circle cx="60" cy="46" r="3.4" fill="#3a3357"/>
    <circle cx="41.2" cy="44.8" r="1.1" fill="#fff"/>
    <circle cx="61.2" cy="44.8" r="1.1" fill="#fff"/>
    <path d="M40 57 Q50 66 60 57" fill="none" stroke="#3a3357" stroke-width="3" stroke-linecap="round"/>
    <circle cx="33" cy="54" r="4.5" fill="#ffb0a0" opacity="0.7"/>
    <circle cx="67" cy="54" r="4.5" fill="#ffb0a0" opacity="0.7"/>
  </g>
</svg>`;

const HAND_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="20" fill="none" stroke="#fff" stroke-width="5" opacity="0.9"/>
  <circle cx="50" cy="50" r="34" fill="none" stroke="#fff" stroke-width="4" opacity="0.45"/>
  <circle cx="50" cy="50" r="10" fill="#fff" opacity="0.95"/>
</svg>`;

function showSplash() {
  clearScreen();
  const s = el('div', 'screen splash', screenEl);
  s.innerHTML = `
    <div class="logo">${LOGO_SVG}</div>
    <h1>Tiny Taps</h1>
    <div class="start-hint">${HAND_SVG}</div>`;
  s.addEventListener('pointerdown', () => {
    audio.unlock();
    speech.init();
    audio.chime();
    speech.speak('Tiny Taps!');
    showMenu();
  }, { once: true });
}

/* ---------------- menu ---------------- */

function showMenu() {
  clearScreen();
  const s = el('div', 'screen menu', screenEl);
  el('div', 'menu-title', s).textContent = 'Pick a game!';
  const grid = el('div', 'menu-grid', s);
  for (const game of games) {
    const card = el('button', 'menu-card', grid);
    card.innerHTML = `<div class="card-icon">${game.icon}</div><div class="card-label">${game.title}</div>`;
    card.addEventListener('pointerdown', () => {
      audio.pop();
      speech.speak(game.title);
      startGame(game);
    });
  }
  makeCreditsButton(s);
}

/* ---------------- credits (parent-facing, hold to open) ---------------- */

const CREDITS = [
  ['Dog bark', 'Amada44, Wikimedia Commons', 'CC BY-SA 3.0'],
  ['Cat meow', 'freemaster2 via freesound/Wikimedia Commons', 'CC0'],
  ['Cow moo', 'MichaeltheFox8621, Wikimedia Commons', 'CC BY-SA 4.0'],
  ['Duck (mallard)', 'Jonathon Jongsma via xeno-canto/Wikimedia Commons', 'CC BY-SA 3.0'],
  ['Sheep bleat', 'Eviatar Bach, Wikimedia Commons', 'CC0'],
  ['Horse neigh', 'Hü., Wikimedia Commons', 'Public domain'],
  ['Rooster crow', 'alys, Wikimedia Commons', 'Public domain'],
  ['Pig oink', 'Secretlondon, Wikimedia Commons', 'CC BY-SA 3.0'],
  ['Lion roar', 'தகவலுழவன், Wikimedia Commons', 'Public domain'],
  ['Elephant trumpet', 'தகவலுழவன், Wikimedia Commons', 'CC0'],
  ['Frog (marsh frog)', 'Llivermore, Wikimedia Commons', 'CC BY-SA 4.0'],
  ['Owl (tawny owl)', 'Alvaro Ortiz Troncoso via xeno-canto/Wikimedia Commons', 'CC BY-SA 4.0'],
];

function makeCreditsButton(parent) {
  const btn = el('button', 'credits-btn', parent);
  btn.textContent = 'i';
  btn.title = 'Sound credits (hold)';
  let t = null;
  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    t = setTimeout(showCredits, 1200);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
    btn.addEventListener(ev, () => clearTimeout(t)));
}

function showCredits() {
  const overlay = el('div', 'credits-overlay', document.body);
  const rows = CREDITS.map(([what, who, lic]) =>
    `<tr><td>${what}</td><td>${who}</td><td>${lic}</td></tr>`).join('');
  overlay.innerHTML = `
    <div class="credits-panel">
      <h2>Sound credits</h2>
      <p>All animal sounds are authentic recordings. Clips were trimmed and
      normalized; full source links are in CREDITS.md in the app package.</p>
      <table><tbody>${rows}</tbody></table>
      <p>UI sounds are synthesized in-app. Voice prompts use your device's
      text-to-speech. Artwork is original.</p>
      <button class="big-btn credits-close">Close</button>
    </div>`;
  overlay.querySelector('.credits-close').addEventListener('pointerdown', () => overlay.remove());
}

/* ---------------- game shell + parent gate ---------------- */

const HOME_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 11.5 12 4l9 7.5" fill="none" stroke="#3a3357" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5.5 10.5V20h13v-9.5" fill="none" stroke="#3a3357" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function makeHomeButton(parent) {
  const btn = el('button', 'home-btn', parent);
  btn.innerHTML = `${HOME_ICON}<div class="hold-ring"></div>`;
  const ring = btn.querySelector('.hold-ring');
  let holdTimer = null;
  let raf = null;

  function cancelHold() {
    clearTimeout(holdTimer);
    cancelAnimationFrame(raf);
    holdTimer = null;
    ring.style.background = 'none';
  }

  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const t0 = performance.now();
    const HOLD = 2000;
    const step = now => {
      const p = Math.min(1, (now - t0) / HOLD);
      ring.style.background = `conic-gradient(#7ed67e ${p * 360}deg, transparent 0deg)`;
      ring.style.mask = 'radial-gradient(circle, transparent 58%, black 60%)';
      ring.style.webkitMask = 'radial-gradient(circle, transparent 58%, black 60%)';
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    holdTimer = setTimeout(() => { cancelHold(); audio.chime(); showMenu(); }, HOLD);
  });
  btn.addEventListener('pointerup', cancelHold);
  btn.addEventListener('pointercancel', cancelHold);
  btn.addEventListener('pointerleave', cancelHold);
  return btn;
}

function startGame(game) {
  clearScreen();
  const s = el('div', 'screen game-screen', screenEl);
  const stage = el('div', 'game-stage', s);
  makeHomeButton(s);

  const ctx = {
    stage,
    audio,
    speech,
    celebrate,
    setReprompt,
    exitToMenu: showMenu,
  };
  currentCleanup = game.start(ctx) || null;
}

/* ---------------- boot ---------------- */

celebrate.init(document.getElementById('celebrate-canvas'));
speech.init();

// Keep the screen awake while playing (best-effort; not all browsers).
async function keepAwake() {
  try {
    if ('wakeLock' in navigator) {
      const lock = await navigator.wakeLock.request('screen');
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') keepAwake();
      });
      lock.addEventListener('release', () => {});
    }
  } catch (e) { /* fine without it */ }
}
document.addEventListener('pointerdown', keepAwake, { once: true });

// Block double-tap zoom / gesture zoom inside the app.
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

showSplash();
