import * as audio from './engine/audio.js';
import * as speech from './engine/speech.js';
import * as celebrate from './engine/celebrate.js';
import * as recordings from './engine/recordings.js';
import { games } from './games/index.js';
import { S } from './data/strings.js';

const screenEl = document.getElementById('screen');
let currentCleanup = null;
let repromptFn = null;
let repromptTimer = null;
const REPROMPT_MS = 9000;

/* ---------------- settings (parent-facing) ---------------- */

const LS_VOLUME = 'tinytaps-volume';
const LS_HIDDEN = 'tinytaps-hidden';

function hiddenGames() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN) || '[]')); }
  catch (e) { return new Set(); }
}

function setHiddenGames(set) {
  localStorage.setItem(LS_HIDDEN, JSON.stringify([...set]));
}

// Per-game accent tints so a pre-reader can navigate by color.
const ACCENTS = {
  peekaboo: '#f1e6ff', sounds: '#dff5f3', colors: '#ffe7e1', shapes: '#e4efff',
  counting: '#fff1d6', puzzle: '#e5f6df', feedme: '#f7eedd', coloring: '#ffe3f0',
  memory: '#fdf0d0', music: '#fff9d9', bubbles: '#e0f2ff', stickers: '#ffeede',
};

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
    speech.speak(S.appName);
    showMenu();
  }, { once: true });
}

/* ---------------- menu ---------------- */

function showMenu() {
  clearScreen();
  const s = el('div', 'screen menu', screenEl);
  el('div', 'menu-title', s).textContent = 'Pick a game!';
  const grid = el('div', 'menu-grid', s);
  const hidden = hiddenGames();
  for (const game of games) {
    if (hidden.has(game.id)) continue;
    const card = el('button', 'menu-card', grid);
    card.style.background = ACCENTS[game.id] || '#ffffff';
    card.innerHTML = `<div class="card-icon">${game.icon}</div><div class="card-label">${game.title}</div>`;
    card.addEventListener('pointerdown', () => {
      audio.pop();
      startGame(game);
    });
  }
  makeCreditsButton(s);
  makeSettingsButton(s);
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

/* ---------------- parent settings (hold to open) ---------------- */

const GEAR_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 8.5 A3.5 3.5 0 1 0 12 15.5 A3.5 3.5 0 1 0 12 8.5 Z M12 2.8 L13 5.6 A6.6 6.6 0 0 1 15.4 6.6 L18.2 5.5 L20.5 8.4 L18.4 10.5 A6.8 6.8 0 0 1 18.4 13.5 L20.5 15.6 L18.2 18.5 L15.4 17.4 A6.6 6.6 0 0 1 13 18.4 L12 21.2 L11 18.4 A6.6 6.6 0 0 1 8.6 17.4 L5.8 18.5 L3.5 15.6 L5.6 13.5 A6.8 6.8 0 0 1 5.6 10.5 L3.5 8.4 L5.8 5.5 L8.6 6.6 A6.6 6.6 0 0 1 11 5.6 Z"
        fill="none" stroke="#3a3357" stroke-width="1.8" stroke-linejoin="round"/>
</svg>`;

// One category per row: what the recording replaces + example phrase.
const REC_ITEMS = [
  { key: 'praise', label: 'Praise', hint: 'e.g. “Great job!”' },
  { key: 'encourage', label: 'Encourage', hint: 'e.g. “Try again!”' },
];

function makeSettingsButton(parent) {
  const btn = el('button', 'settings-btn', parent);
  btn.innerHTML = GEAR_ICON;
  btn.title = 'Parent settings (hold)';
  let t = null;
  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    t = setTimeout(showSettings, 1200);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
    btn.addEventListener(ev, () => clearTimeout(t)));
}

let activeRecorder = null;

function showSettings() {
  const overlay = el('div', 'credits-overlay', document.body);
  const panel = el('div', 'credits-panel settings-panel', overlay);

  const vol = Number(localStorage.getItem(LS_VOLUME) || 0.9);
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const hidden = hiddenGames();

  panel.innerHTML = `
    <h2>Parent settings</h2>
    <label class="set-row">Volume
      <input type="range" id="set-vol" min="0" max="1" step="0.05" value="${vol}">
    </label>
    <label class="set-row">Voice speed
      <input type="range" id="set-rate" min="0.7" max="1.3" step="0.05" value="${speech.getUserRate()}">
    </label>
    <h3>Your voice</h3>
    <p>Record yourself — the app will use your voice instead of the robot one
    for these moments.${canRecord ? '' : ' (Not supported on this browser.)'}</p>
    <div id="rec-rows"></div>
    <h3>Games on the menu</h3>
    <div class="set-games" id="set-games"></div>
    <button class="big-btn credits-close">Close</button>`;

  panel.querySelector('#set-vol').addEventListener('input', e => {
    const v = Number(e.target.value);
    localStorage.setItem(LS_VOLUME, String(v));
    audio.setVolume(v);
  });
  panel.querySelector('#set-vol').addEventListener('change', () => audio.chime());

  panel.querySelector('#set-rate').addEventListener('change', e => {
    speech.setUserRate(Number(e.target.value));
    speech.speak('Hello! This is how I talk now!');
  });

  const recRows = panel.querySelector('#rec-rows');
  REC_ITEMS.forEach(item => {
    const row = el('div', 'rec-row', recRows);
    row.innerHTML = `
      <div class="rec-label">${item.label}<span>${item.hint}</span></div>
      <button class="big-btn rec-btn rec-record">● Record</button>
      <button class="big-btn rec-btn rec-play">▶</button>
      <button class="big-btn rec-btn rec-del">✕</button>
      <div class="rec-status">${audio.hasBuffer('rec:' + item.key) ? 'Saved' : ''}</div>`;
    const [recBtn, playBtn, delBtn] = row.querySelectorAll('button');
    const status = row.querySelector('.rec-status');
    if (!canRecord) recBtn.disabled = true;

    recBtn.addEventListener('pointerdown', async () => {
      if (activeRecorder) { activeRecorder.stop(); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const rec = new MediaRecorder(stream);
        const chunks = [];
        rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
          stream.getTracks().forEach(t => t.stop());
          activeRecorder = null;
          recBtn.classList.remove('recording');
          recBtn.textContent = '● Record';
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
          const buf = await audio.loadBlob('rec:' + item.key, blob);
          if (buf) {
            await recordings.save(item.key, blob);
            speech.setRecordedCategory(item.key, 'rec:' + item.key);
            status.textContent = 'Saved!';
          } else {
            status.textContent = 'Recording failed — try again';
          }
        };
        rec.start();
        activeRecorder = rec;
        recBtn.classList.add('recording');
        recBtn.textContent = '■ Stop';
        status.textContent = 'Recording… tap Stop when done';
      } catch (e) {
        status.textContent = 'Microphone not available';
      }
    });

    playBtn.addEventListener('pointerdown', () => {
      if (audio.hasBuffer('rec:' + item.key)) audio.play('rec:' + item.key);
      else status.textContent = 'Nothing recorded yet';
    });

    delBtn.addEventListener('pointerdown', async () => {
      await recordings.remove(item.key);
      speech.setRecordedCategory(item.key, null);
      status.textContent = 'Cleared';
    });
  });

  const gamesBox = panel.querySelector('#set-games');
  games.forEach(g => {
    const lab = el('label', 'set-game', gamesBox);
    lab.innerHTML = `<input type="checkbox" ${hidden.has(g.id) ? '' : 'checked'}> ${g.title}`;
    lab.querySelector('input').addEventListener('change', e => {
      const h = hiddenGames();
      if (e.target.checked) h.delete(g.id);
      else h.add(g.id);
      // Never allow hiding everything.
      if (h.size >= games.length) { h.delete(g.id); e.target.checked = true; }
      setHiddenGames(h);
    });
  });

  panel.querySelector('.credits-close').addEventListener('pointerdown', () => {
    if (activeRecorder) { try { activeRecorder.stop(); } catch (e) { /* ok */ } }
    overlay.remove();
    showMenu();
  });
}

/* ---------------- game shell ---------------- */

const HOME_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 11.5 12 4l9 7.5" fill="none" stroke="#3a3357" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5.5 10.5V20h13v-9.5" fill="none" stroke="#3a3357" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function makeHomeButton(parent) {
  const btn = el('button', 'home-btn', parent);
  btn.innerHTML = HOME_ICON;
  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    audio.chime();
    showMenu();
  });
  return btn;
}

let lastStart = 0;

function startGame(game) {
  // Toddlers tap with several fingers at once — don't start a game twice.
  const now = performance.now();
  if (now - lastStart < 600) return;
  lastStart = now;

  clearScreen();
  const s = el('div', 'screen game-screen', screenEl);
  const stage = el('div', 'game-stage', s);
  makeHomeButton(s);

  // Say the game's name first; games queue their intro behind it
  // (their first speak uses interrupt: false).
  speech.speak(game.title);

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
audio.setVolume(Number(localStorage.getItem(LS_VOLUME) || 0.9));

// Load any parent voice recordings saved in IndexedDB.
(async () => {
  try {
    const saved = await recordings.loadAll();
    for (const [key, blob] of saved) {
      const buf = await audio.loadBlob('rec:' + key, blob);
      if (buf) speech.setRecordedCategory(key, 'rec:' + key);
    }
  } catch (e) { /* recordings are optional */ }
})();

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

// Phones (iOS especially) suspend the AudioContext after interruptions —
// phone calls, backgrounding, silent-switch flips. Re-unlock on every tap so
// animal sounds always come back.
document.addEventListener('pointerdown', () => audio.unlock(), true);

// Block double-tap zoom / gesture zoom inside the app.
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

showSplash();
