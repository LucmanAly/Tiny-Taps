import * as audio from './engine/audio.js';
import * as speech from './engine/speech.js';
import * as celebrate from './engine/celebrate.js';
import * as recordings from './engine/recordings.js';
import { games } from './games/index.js';
import { S } from './data/strings.js';
import { addTap } from './engine/ui.js';
import { IntroScene, preloadMascots } from './engine/intro.js';
import { VERSION } from './data/version.js';
import * as progress from './engine/progress.js';

const screenEl = document.getElementById('screen');
let currentCleanup = null;
let repromptFn = null;
let repromptTimer = null;
const REPROMPT_MS = 9000;

/* ---------------- settings (parent-facing) ---------------- */

const LS_VOLUME = 'tinytaps-volume';
const LS_HIDDEN = 'tinytaps-hidden';
const LS_PROFILE = 'tinytaps-profile';
const LS_MIX = 'tinytaps-mix';

const PROFILES = {
  little: {
    label: 'Little Explorer', age: '18–30 months',
    games: ['peekaboo', 'bubbles', 'music', 'wash', 'coloring', 'counting'],
  },
  early: {
    label: 'Early Learner', age: '2½–3½ years',
    games: ['sounds', 'colors', 'shapes', 'feedme', 'puzzle', 'bigsmall', 'memory'],
  },
  growing: {
    label: 'Growing Thinker', age: '3½–4½ years',
    games: ['pattern', 'shadow', 'sort', 'trace', 'counting', 'memory'],
  },
  custom: { label: 'Custom', age: 'your choices', games: [] },
};

function profileId() { return localStorage.getItem(LS_PROFILE) || 'little'; }
function profileGames() {
  const p = PROFILES[profileId()] || PROFILES.little;
  return p.games.length ? p.games : games.map(g => g.id);
}

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
  shadow: '#ece4fb', bigsmall: '#ffe0ec', pattern: '#e2f7e9', sort: '#d9f2e0',
  wash: '#dcf0fa', trace: '#fff4d6',
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
    <radialGradient id="star-g" cx="40%" cy="32%" r="75%">
      <stop offset="0%" stop-color="#fff3b0"/>
      <stop offset="55%" stop-color="#ffd54a"/>
      <stop offset="100%" stop-color="#ffb627"/>
    </radialGradient>
    <linearGradient id="rb-1" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#ff9fce"/><stop offset="100%" stop-color="#ffb8d9"/></linearGradient>
    <linearGradient id="rb-2" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#ffcf6f"/><stop offset="100%" stop-color="#ffe08a"/></linearGradient>
    <linearGradient id="rb-3" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#8ad4f0"/><stop offset="100%" stop-color="#aee2f7"/></linearGradient>
  </defs>
  <path d="M6 92 A44 44 0 0 1 94 92" fill="none" stroke="url(#rb-1)" stroke-width="9" stroke-linecap="round"/>
  <path d="M16 92 A34 34 0 0 1 84 92" fill="none" stroke="url(#rb-2)" stroke-width="9" stroke-linecap="round"/>
  <path d="M26 92 A24 24 0 0 1 74 92" fill="none" stroke="url(#rb-3)" stroke-width="9" stroke-linecap="round"/>
  <circle cx="18" cy="24" r="3.6" fill="#fff" opacity="0.9"/>
  <circle cx="84" cy="30" r="2.6" fill="#fff" opacity="0.85"/>
  <circle cx="80" cy="14" r="2" fill="#fff" opacity="0.8"/>
  <path d="M50 8 L58.5 34 L86 34 L64 50 L72.5 76 L50 60 L27.5 76 L36 50 L14 34 L41.5 34 Z"
        fill="url(#star-g)" stroke="#fff" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="42" cy="46" r="3.2" fill="#3a3357"/>
  <circle cx="58" cy="46" r="3.2" fill="#3a3357"/>
  <circle cx="43.1" cy="44.9" r="1.05" fill="#fff"/>
  <circle cx="59.1" cy="44.9" r="1.05" fill="#fff"/>
  <path d="M43 55 Q50 61.5 57 55" fill="none" stroke="#3a3357" stroke-width="2.8" stroke-linecap="round"/>
  <circle cx="35" cy="52" r="4" fill="#ffb0a0" opacity="0.75"/>
  <circle cx="65" cy="52" r="4" fill="#ffb0a0" opacity="0.75"/>
</svg>`;

const HAND_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="20" fill="none" stroke="#fff" stroke-width="5" opacity="0.9"/>
  <circle cx="50" cy="50" r="34" fill="none" stroke="#fff" stroke-width="4" opacity="0.45"/>
  <circle cx="50" cy="50" r="10" fill="#fff" opacity="0.95"/>
</svg>`;

// Animated opening: the mascot walks in and conjures the logo, then hands off
// to the menu. Falls back to the old tap-to-start splash if anything about the
// intro fails, so the app can never be left with no way in.
function showSplash() {
  clearScreen();
  const s = el('div', 'screen splash intro-screen', screenEl);

  let handedOver = false;
  const toMenu = () => {
    if (handedOver) return;   // one hand-off only, however it was triggered
    handedOver = true;
    speech.init();
    showMenu();
  };

  // Any touch during the intro is also the audio-unlock gesture iOS needs.
  const unlockOnce = () => audio.unlock();
  s.addEventListener('pointerdown', unlockOnce, { once: true });

  try {
    // Mount immediately so the intro's own background is the first thing
    // painted; the sequence itself begins once the mascot art is ready.
    const scene = new IntroScene({ mount: s, onDone: toMenu });
    scene.start(preloadMascots());
  } catch (err) {
    console.warn('intro failed, falling back to splash', err);
    showStaticSplash(s, toMenu);
  }
}

// The pre-existing static splash, kept as the safety net.
function showStaticSplash(s, done) {
  s.innerHTML = `
    <div class="logo">${LOGO_SVG}</div>
    <h1>Tiny Taps</h1>
    <div class="start-hint">${HAND_SVG}</div>`;
  s.addEventListener('pointerdown', () => {
    audio.unlock();
    audio.chime();
    done();
  }, { once: true });
}

/* ---------------- menu ---------------- */

function showMenu(showAll = false) {
  clearScreen();
  const s = el('div', 'screen menu', screenEl);
  const profile = PROFILES[profileId()] || PROFILES.little;
  el('div', 'menu-title', s).textContent = showAll ? 'All games' : profile.label;
  const grid = el('div', 'menu-grid', s);
  const hidden = hiddenGames();
  const featured = new Set(profileGames());
  const visible = games.filter(g => !hidden.has(g.id) && (showAll || featured.has(g.id)));
  for (const game of visible) {
    const card = el('button', 'menu-card', grid);
    card.style.backgroundColor = ACCENTS[game.id] || '#ffffff';
    card.innerHTML = `<div class="card-icon">${game.icon}</div><div class="card-label">${game.title}</div>`;
    addTap(card, () => {
      audio.pop();
      startGame(game);
    });
  }
  if (!showAll && games.some(g => !hidden.has(g.id) && !featured.has(g.id))) {
    const more = el('button', 'menu-card more-card', grid);
    more.innerHTML = '<div class="card-icon more-dots">•••</div><div class="card-label">More Games</div>';
    addTap(more, () => showMenu(true));
  }
  if (showAll) {
    const back = el('button', 'menu-card more-card', grid);
    back.innerHTML = '<div class="card-icon more-dots">⌂</div><div class="card-label">My Games</div>';
    addTap(back, () => showMenu(false));
  }
  if (localStorage.getItem(LS_MIX) === '1') makeMixButton(s);
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
  ['Bear cub growl', 'Shizhao, Wikimedia Commons', 'CC BY 3.0'],
  ['Bee buzz', 'Free Sounds Library / Spanac, Wikimedia Commons', 'CC BY 3.0'],
  ['Rabbit squeaks', 'kessir via Freesound/Wikimedia Commons', 'CC0'],
  ['Howler monkey', 'British Library wildlife collection', 'CC BY 4.0'],
  ['Grévy’s zebra', 'DiegoC472, Wikimedia Commons', 'CC BY-SA 4.0'],
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
  btn.title = 'Parent settings';
  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    showSettings();
  });
}

function makeMixButton(parent) {
  const btn = el('button', 'mix-btn', parent);
  btn.textContent = '▶ Mix';
  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const pool = games.filter(g => profileGames().includes(g.id) && !hiddenGames().has(g.id) && g.id !== 'stickers');
    if (pool.length) startGame(pool[Math.floor(Math.random() * pool.length)], true);
  });
}

let activeRecorder = null;

function showSettings() {
  const overlay = el('div', 'credits-overlay', document.body);
  const panel = el('div', 'credits-panel settings-panel', overlay);

  const vol = Number(localStorage.getItem(LS_VOLUME) || 0.9);
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const hidden = hiddenGames();

  panel.innerHTML = `
    <button class="settings-close" aria-label="Close settings">✕ Close</button>
    <h2>Parent settings</h2>
    <label class="set-row">Learning stage
      <select id="set-profile">
        ${Object.entries(PROFILES).map(([id, p]) => `<option value="${id}"${id === profileId() ? ' selected' : ''}>${p.label} · ${p.age}</option>`).join('')}
      </select>
    </label>
    <label class="set-row">Volume
      <input type="range" id="set-vol" min="0" max="1" step="0.05" value="${vol}">
    </label>
    <label class="set-row">Voice speed
      <input type="range" id="set-rate" min="0.7" max="1.3" step="0.05" value="${speech.getUserRate()}">
    </label>
    <label class="set-row">Voice
      <select id="set-voice"></select>
    </label>
    <label class="set-check"><input type="checkbox" id="set-mix" ${localStorage.getItem(LS_MIX) === '1' ? 'checked' : ''}> Show Play Mix (automatically changes games)</label>
    <button class="big-btn progress-open">View on-device progress</button>
    <div class="offline-status">${localStorage.getItem('tinytaps-offline-ready') === '1' ? '✓ Ready to play offline' : 'Offline files finish saving after the first online visit'}</div>
    <details class="install-help"><summary>Install on iPhone or iPad</summary><p>Open Tiny Taps in Safari, tap Share, choose <strong>Add to Home Screen</strong>, then tap Add. Open it once while online before taking it offline.</p></details>
    <h3>Your voice</h3>
    <p>Record yourself for praise and encouragement. These recordings remain
    active even though general computer narration is off.${canRecord ? '' : ' (Not supported on this browser.)'}</p>
    <div id="rec-rows"></div>
    <h3>Games on the menu</h3>
    <div class="set-games" id="set-games"></div>
    <div class="settings-version">Tiny Taps v${VERSION}</div>`;

  panel.querySelector('#set-vol').addEventListener('input', e => {
    const v = Number(e.target.value);
    localStorage.setItem(LS_VOLUME, String(v));
    audio.setVolume(v);
  });
  panel.querySelector('#set-profile').addEventListener('change', e => {
    localStorage.setItem(LS_PROFILE, e.target.value);
  });
  panel.querySelector('#set-mix').addEventListener('change', e =>
    localStorage.setItem(LS_MIX, e.target.checked ? '1' : '0'));
  panel.querySelector('.progress-open').addEventListener('pointerdown', () => showProgress(panel));
  panel.querySelector('#set-vol').addEventListener('change', () => audio.chime());

  panel.querySelector('#set-rate').addEventListener('change', e => {
    speech.setUserRate(Number(e.target.value));
    speech.speakWord('Hello! This is how I talk now!');
  });

  // Voice picker: which installed voice sounds least robotic varies a lot by
  // device, so let the parent audition and choose rather than guessing.
  const voiceSelect = panel.querySelector('#set-voice');
  function fillVoices() {
    const voices = speech.listVoices();
    if (!voices.length) return;
    const current = speech.getVoiceName();
    voiceSelect.innerHTML = voices.map(v =>
      `<option value="${v.name}"${v.name === current ? ' selected' : ''}>${v.name}</option>`).join('');
  }
  fillVoices();
  if (window.speechSynthesis) window.speechSynthesis.addEventListener('voiceschanged', fillVoices, { once: true });
  voiceSelect.addEventListener('change', e => {
    speech.setVoiceOverride(e.target.value);
    speech.speakWord('Hello! This is how I sound now!');
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
            status.textContent = 'Saved! Playing it back…';
            // Immediate audible proof it actually works on this device —
            // if this can't be heard, the recording won't work in games
            // either, and the parent finds out right now instead of later.
            await audio.play('rec:' + item.key);
            if (status.isConnected) status.textContent = 'Saved!';
          } else {
            status.textContent = 'Recording failed — try again (make sure your mic isn’t muted)';
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
      localStorage.setItem(LS_PROFILE, 'custom');
    });
  });

  panel.querySelector('.settings-close').addEventListener('pointerdown', () => {
    if (activeRecorder) { try { activeRecorder.stop(); } catch (e) { /* ok */ } }
    overlay.remove();
    showMenu();
  });
}

function showProgress(parentPanel) {
  const old = parentPanel.querySelector('.progress-box');
  if (old) { old.remove(); return; }
  const data = progress.read();
  const box = el('div', 'progress-box', parentPanel);
  const ranked = games.map(g => ({ ...g, ...(data.games[g.id] || {}) }))
    .filter(g => g.plays).sort((a, b) => b.plays - a.plays);
  const favorites = ranked.slice(0, 3).map(g => g.title).join(', ') || 'No games played yet';
  const needs = [
    ...progress.hardestDetails('colors').map(x => `${x} color`),
    ...progress.hardestDetails('shapes').map(x => `${x} shape`),
  ].slice(0, 4);
  box.innerHTML = `<h3>Play observations</h3>
    <p><strong>Favorite games:</strong> ${favorites}</p>
    <p><strong>Completed activities:</strong> ${data.totalWins || 0}</p>
    <p><strong>Currently practicing:</strong> ${needs.join(', ') || 'The app is still learning'}</p>
    <div class="progress-list">${ranked.map(g => `<div><span>${g.title}</span><span>${g.plays} plays · level ${g.level || 1}</span></div>`).join('')}</div>
    <p class="privacy-note">Stored only on this device. No scores, comparisons, accounts or uploads.</p>
    <button class="big-btn progress-reset">Reset progress</button>`;
  box.querySelector('.progress-reset').addEventListener('pointerdown', () => {
    if (window.confirm('Reset all local play observations and difficulty levels?')) {
      progress.reset();
      box.remove();
      showProgress(parentPanel);
    }
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

const SOUND_ON_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="#3a3357"/>
  <path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="#3a3357" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M19 6a9 9 0 0 1 0 12" fill="none" stroke="#3a3357" stroke-width="2.2" stroke-linecap="round" opacity="0.6"/>
</svg>`;
const SOUND_OFF_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="#3a3357"/>
  <path d="M16 9l5 6M21 9l-5 6" stroke="#c0392b" stroke-width="2.4" stroke-linecap="round"/>
</svg>`;

// Per-game mute toggle — a parent can silence just the game in progress
// without leaving it to open Parent Settings. Always resets to unmuted for
// the next game so it never accidentally leaves the whole app silent.
function makeMuteButton(parent) {
  const btn = el('button', 'mute-btn', parent);
  const render = () => { btn.innerHTML = audio.isMuted() ? SOUND_OFF_ICON : SOUND_ON_ICON; };
  render();
  btn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const next = !audio.isMuted();
    if (next) speech.stop();
    audio.setMuted(next);
    if (!next) audio.chime();
    render();
  });
  return btn;
}

let lastStart = 0;

function startGame(game, mix = false) {
  // Toddlers tap with several fingers at once — don't start a game twice.
  const now = performance.now();
  if (now - lastStart < 600) return;
  lastStart = now;

  audio.setMuted(false);
  clearScreen();
  const s = el('div', 'screen game-screen', screenEl);
  const stage = el('div', 'game-stage', s);
  makeHomeButton(s);
  makeMuteButton(s);
  progress.start(game.id);

  const ctx = {
    stage,
    audio,
    speech,
    celebrate,
    setReprompt,
    exitToMenu: showMenu,
    difficulty: () => progress.level(game.id),
    recordOutcome: (correct, detail) => progress.outcome(game.id, correct, detail),
  };
  currentCleanup = game.start(ctx) || null;
  if (mix) {
    const mixTimer = setTimeout(() => {
      const pool = games.filter(g => profileGames().includes(g.id) && !hiddenGames().has(g.id) && g.id !== game.id && g.id !== 'stickers');
      if (pool.length) startGame(pool[Math.floor(Math.random() * pool.length)], true);
    }, 90000);
    const cleanup = currentCleanup;
    currentCleanup = () => { clearTimeout(mixTimer); if (cleanup) cleanup(); };
  }
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
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (!navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () =>
        localStorage.setItem('tinytaps-offline-ready', '1'), { once: true });
    } else localStorage.setItem('tinytaps-offline-ready', '1');
  }).catch(() => {});
}

showSplash();
