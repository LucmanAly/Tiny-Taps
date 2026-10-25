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
import { tapPlaceEnabled, setTapPlace } from './engine/drag.js';
import { traceWidth, setTraceWidth } from './games/trace.js';
import * as calm from './engine/calm.js';
import {
  childKey, children, activeChild, setActive, addChild, updateChild, removeChild,
  avatarArt, displayName, isFirst, AVATARS, MAX_CHILDREN,
} from './engine/children.js';

const screenEl = document.getElementById('screen');
let currentView = 'splash';   // splash | who | menu | game | goodnight
let currentCleanup = null;
let repromptFn = null;
let repromptTimer = null;
const REPROMPT_MS = 9000;

/* ---------------- settings (parent-facing) ---------------- */

const LS_VOLUME = 'tinytaps-volume';
const LS_HIDDEN = 'tinytaps-hidden';
const LS_PROFILE = 'tinytaps-profile';
const LS_MIX = 'tinytaps-mix';
const LS_HOME_GAMES = 'tinytaps-home-games';
const LS_MORE_GAMES = 'tinytaps-more-games';

const PROFILES = {
  little: {
    label: 'Little Explorer', age: '18–30 months',
    games: ['babyboo', 'playhouse', 'peekaboo', 'animals', 'vehicles', 'faces', 'bubbles', 'music', 'wash', 'coloring', 'counting', 'stickers'],
  },
  early: {
    label: 'Early Learner', age: '2½–3½ years',
    games: ['babyboo', 'playhouse', 'sounds', 'animals', 'vehicles', 'faces', 'paintpots', 'colors', 'shapes', 'feedme', 'puzzle', 'bigsmall', 'memory', 'stickers'],
  },
  growing: {
    label: 'Growing Thinker', age: '3½–4½ years',
    games: ['babyboo', 'pattern', 'shadow', 'sort', 'trace', 'paintpots', 'counting', 'numberbook', 'memory', 'stickers'],
  },
  custom: { label: 'Custom', age: 'your choices', games: [] },
};

function profileId() { return localStorage.getItem(childKey(LS_PROFILE)) || 'little'; }
function profileGames() {
  if (profileId() === 'custom') return reconcileGameGroups().home;
  const p = PROFILES[profileId()] || PROFILES.little;
  return p.games.length ? p.games : games.map(g => g.id);
}

function hiddenGames() {
  try { return new Set(JSON.parse(localStorage.getItem(childKey(LS_HIDDEN)) || '[]')); }
  catch (e) { return new Set(); }
}

function setHiddenGames(set) {
  localStorage.setItem(childKey(LS_HIDDEN), JSON.stringify([...set]));
}

// Custom profile's home/more grouping and order, kept in localStorage as two
// plain id arrays. Hidden games stay in whichever array they're already in
// (hiding/showing is orthogonal, same as it is for the preset profiles) so a
// parent's arrangement survives toggling a game's visibility.
function idList(key) {
  try {
    const list = JSON.parse(localStorage.getItem(childKey(key)) || 'null');
    return Array.isArray(list) ? list : [];
  } catch (e) { return []; }
}
function homeGames() { return idList(LS_HOME_GAMES); }
function setHomeGames(list) { localStorage.setItem(childKey(LS_HOME_GAMES), JSON.stringify(list)); }
function moreGames() { return idList(LS_MORE_GAMES); }
function setMoreGames(list) { localStorage.setItem(childKey(LS_MORE_GAMES), JSON.stringify(list)); }

// Reconciles the stored home/more id lists against the live game registry:
// drops ids for games that no longer exist, and appends any game the parent
// has never placed (new install, or a game added after this shipped) to Home.
function reconcileGameGroups() {
  const knownIds = new Set(games.map(g => g.id));
  const home = homeGames().filter(id => knownIds.has(id));
  const homeSet = new Set(home);
  const more = moreGames().filter(id => knownIds.has(id) && !homeSet.has(id));
  const placed = new Set([...home, ...more]);
  for (const g of games) if (!placed.has(g.id)) home.push(g.id);
  return { home, more };
}

// Per-game accent tints so a pre-reader can navigate by color.
const ACCENTS = {
  babyboo: '#e6daf2', peekaboo: '#f1e6ff', sounds: '#dff5f3', colors: '#ffe7e1', shapes: '#e4efff',
  counting: '#fff1d6', numberbook: '#eee8ff', puzzle: '#e5f6df', feedme: '#f7eedd', coloring: '#ffe3f0',
  memory: '#fdf0d0', music: '#fff9d9', bubbles: '#e0f2ff', stickers: '#ffeede',
  shadow: '#ece4fb', bigsmall: '#ffe0ec', pattern: '#e2f7e9', sort: '#d9f2e0',
  wash: '#dcf0fa', trace: '#fff4d6', playhouse: '#dbefff', animals: '#e2f5ee',
  vehicles: '#ffe9d6', paintpots: '#f3e6ff', faces: '#ffeedd',
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

// Children's names are typed by parents; never trust them as markup.
function esc(text) {
  return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
    // Several children on this device: ask who is playing first.
    if (children().length > 1) showWhoIsPlaying();
    else showMenu();
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

/* ---------------- who's playing ---------------- */

function showWhoIsPlaying() {
  if (calm.goodnightLocked()) { showGoodnight(); return; }
  clearScreen();
  currentView = 'who';
  const s = el('div', 'screen menu who-screen', screenEl);
  el('div', 'menu-title', s).textContent = 'Who’s playing?';
  const grid = el('div', 'who-grid', s);
  const playing = activeChild().id;
  children().forEach(child => {
    const card = el('button', 'who-card' + (child.id === playing ? ' current' : ''), grid);
    card.innerHTML = `<span class="who-avatar"><img src="${avatarArt(child)}" alt=""></span><span class="who-name">${esc(displayName(child))}</span>`;
    addTap(card, () => {
      setActive(child.id);
      audio.chime();
      showMenu();
    });
  });
  makeSettingsButton(s);
}

/* ---------------- menu ---------------- */

function showMenu(showAll = false) {
  if (calm.goodnightLocked()) { showGoodnight(); return; }
  clearScreen();
  currentView = 'menu';
  const s = el('div', 'screen menu', screenEl);
  const profile = PROFILES[profileId()] || PROFILES.little;
  const windingDown = calm.isWindingDown();
  el('div', 'menu-title', s).textContent = windingDown ? '🌙 Wind-down time' : showAll ? 'All games' : profile.label;
  const grid = el('div', 'menu-grid', s);
  const hidden = hiddenGames();

  let visible, hasMore;
  if (windingDown) {
    // Bedtime is near: only the slow, open-ended games stay on the menu.
    visible = games.filter(g => calm.CALM_GAMES.includes(g.id) && !hidden.has(g.id));
    if (!visible.length) visible = games.filter(g => calm.CALM_GAMES.includes(g.id));
    hasMore = false;
    showAll = false;
  } else if (profileId() === 'custom') {
    const byId = new Map(games.map(g => [g.id, g]));
    const { home, more } = reconcileGameGroups();
    const homeVisible = home.map(id => byId.get(id)).filter(g => g && !hidden.has(g.id));
    const moreVisible = more.map(id => byId.get(id)).filter(g => g && !hidden.has(g.id));
    visible = showAll ? [...homeVisible, ...moreVisible] : homeVisible;
    hasMore = moreVisible.length > 0;
  } else {
    const featured = new Set(profileGames());
    visible = games.filter(g => !hidden.has(g.id) && (showAll || featured.has(g.id)));
    hasMore = games.some(g => !hidden.has(g.id) && !featured.has(g.id));
  }

  for (const game of visible) {
    const card = el('button', 'menu-card', grid);
    card.style.backgroundColor = ACCENTS[game.id] || '#ffffff';
    card.innerHTML = `<div class="card-icon">${game.icon}</div><div class="card-label">${game.title}</div>`;
    addTap(card, () => {
      audio.pop();
      startGame(game);
    });
  }
  if (!showAll && hasMore) {
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
  if (children().length > 1) makeChildChip(s);
  makeCreditsButton(s);
  makeSettingsButton(s);
}

// Who is playing, top-left of the menu; a tap goes back to choosing.
function makeChildChip(parent) {
  const child = activeChild();
  const chip = el('button', 'child-chip', parent);
  chip.setAttribute('aria-label', `${displayName(child)} is playing. Change child`);
  chip.innerHTML = `<img src="${avatarArt(child)}" alt=""><span>${esc(displayName(child))}</span>`;
  addTap(chip, () => {
    audio.pop();
    showWhoIsPlaying();
  });
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
    const pool = mixPool();
    if (pool.length) startGame(pool[Math.floor(Math.random() * pool.length)], true);
  });
}

// Mix plays the menu's games (calm ones only while winding down).
function mixPool(exceptId = null) {
  return games.filter(g => profileGames().includes(g.id) && !hiddenGames().has(g.id)
    && g.id !== 'stickers' && g.id !== exceptId
    && (!calm.isWindingDown() || calm.CALM_GAMES.includes(g.id)));
}

let activeRecorder = null;

function formatBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// How much room Tiny Taps takes up on this device. Prefers the browser's own
// storage estimate, which covers the offline cache plus saved drawings and
// voice recordings. Falls back to adding up the cached files by hand where
// that API is missing (older iOS), and stays quiet if neither works — this is
// a nice-to-know line, never something worth showing an error for.
async function appSize() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage } = await navigator.storage.estimate();
      const s = formatBytes(usage);
      if (s) return s;
    }
  } catch (e) { /* fall through to counting the cache */ }
  try {
    if (!window.caches) return null;
    let total = 0;
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      for (const req of await c.keys()) {
        const res = await c.match(req);
        if (!res) continue;
        const len = res.headers.get('content-length');
        total += len ? Number(len) : (await res.clone().blob()).size;
      }
    }
    return formatBytes(total);
  } catch (e) { return null; }
}

// Drag-and-drop editor for the two "custom" game groups (Home / More Games).
// Built with Pointer Events rather than native HTML5 drag-and-drop, which
// doesn't work reliably for touch on iOS Safari — matching how every other
// gesture in this app is handled (see addTap() in engine/ui.js).
function setupGameGroups(panel) {
  const homeList = panel.querySelector('#set-home-list');
  const moreList = panel.querySelector('#set-more-list');
  const byId = new Map(games.map(g => [g.id, g]));
  let { home, more } = reconcileGameGroups();
  let dragState = null;

  function persist() {
    setHomeGames(home);
    setMoreGames(more);
    localStorage.setItem(childKey(LS_PROFILE), 'custom');
  }

  function renderRow(id, listEl) {
    const g = byId.get(id);
    if (!g) return;
    const hidden = hiddenGames();
    const row = el('div', 'set-game-row', listEl);
    row.dataset.id = id;
    row.innerHTML = `
      <button type="button" class="set-drag-handle" aria-label="Drag ${g.title} to reorder">☰</button>
      <span class="set-game-icon">${g.icon}</span>
      <span class="set-game-title">${g.title}</span>
      <label class="set-game-show"><input type="checkbox" ${hidden.has(id) ? '' : 'checked'}></label>`;
    row.querySelector('.set-game-show input').addEventListener('change', e => {
      const h = hiddenGames();
      if (e.target.checked) h.delete(id);
      else h.add(id);
      // Never allow hiding every game.
      if (h.size >= games.length) { h.delete(id); e.target.checked = true; }
      setHiddenGames(h);
      localStorage.setItem(childKey(LS_PROFILE), 'custom');
    });
    row.querySelector('.set-drag-handle').addEventListener('pointerdown', e => startDrag(e, row, id));
  }

  function renderAll() {
    homeList.innerHTML = '';
    moreList.innerHTML = '';
    home.forEach(id => renderRow(id, homeList));
    more.forEach(id => renderRow(id, moreList));
  }

  function positionGhost(x, y) {
    const { ghost, offsetX, offsetY } = dragState;
    ghost.style.left = `${x - offsetX}px`;
    ghost.style.top = `${y - offsetY}px`;
  }

  // Both game groups can be long, and the settings panel scrolls — so a drag
  // needs to be able to carry a row past the edge of the visible panel, not
  // just among currently-visible rows. Auto-scroll the panel while the
  // pointer sits near its top/bottom edge, same idea as any mobile
  // reorderable list.
  const SCROLL_EDGE = 60;
  const SCROLL_SPEED = 12;
  function autoScrollStep() {
    if (!dragState) return;
    if (dragState.scrollDir) panel.scrollTop += dragState.scrollDir * SCROLL_SPEED;
    requestAnimationFrame(autoScrollStep);
  }

  function startDrag(e, row, id) {
    e.preventDefault();
    e.stopPropagation();
    const rect = row.getBoundingClientRect();
    const ghost = row.cloneNode(true);
    ghost.className = 'set-game-row set-game-ghost';
    ghost.style.width = `${rect.width}px`;
    document.body.appendChild(ghost);

    const placeholder = el('div', 'set-game-placeholder');
    placeholder.style.height = `${rect.height}px`;
    row.replaceWith(placeholder);

    dragState = {
      id, ghost, placeholder,
      offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top,
      pointerId: e.pointerId,
      scrollDir: 0,
    };
    positionGhost(e.clientX, e.clientY);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    requestAnimationFrame(autoScrollStep);
  }

  function onMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    positionGhost(e.clientX, e.clientY);

    const panelRect = panel.getBoundingClientRect();
    if (e.clientY < panelRect.top + SCROLL_EDGE) dragState.scrollDir = -1;
    else if (e.clientY > panelRect.bottom - SCROLL_EDGE) dragState.scrollDir = 1;
    else dragState.scrollDir = 0;

    const { placeholder } = dragState;
    const overEl = document.elementFromPoint(e.clientX, e.clientY);
    if (!overEl) return;
    const overRow = overEl.closest('.set-game-row');
    const overListEl = overEl.closest('.set-game-list');
    if (overRow && overRow !== placeholder) {
      const list = overRow.parentElement;
      const before = e.clientY < overRow.getBoundingClientRect().top + overRow.offsetHeight / 2;
      list.insertBefore(placeholder, before ? overRow : overRow.nextSibling);
    } else if (overListEl && !overListEl.contains(placeholder)) {
      overListEl.appendChild(placeholder);
    }
  }

  function endDrag() {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    dragState.ghost.remove();
    dragState = null;
  }

  function onCancel(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    endDrag();
    renderAll(); // restore the original arrangement
  }

  function onUp(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const { id, placeholder } = dragState;
    const targetList = placeholder.parentElement;

    const readList = listEl => [...listEl.children].map(child => (child === placeholder ? id : child.dataset.id));
    let newHome = readList(homeList);
    let newMore = readList(moreList);

    // Never allow the Home group to become empty.
    if (targetList !== homeList && newHome.length === 0) {
      newHome = [id];
      newMore = newMore.filter(x => x !== id);
    }

    endDrag();
    home = newHome;
    more = newMore;
    persist();
    renderAll();
  }

  renderAll();
}

// The Children rows: picture (tap to change), name, who is playing, remove.
// Switching child or adding/removing one reopens Settings, because the
// child settings further down belong to whoever is playing.
function setupChildren(panel, reopen) {
  const rows = panel.querySelector('#kid-rows');
  const playing = activeChild().id;
  children().forEach(child => {
    const row = el('div', 'kid-row' + (child.id === playing ? ' playing' : ''), rows);
    row.dataset.id = child.id;
    row.innerHTML = `
      <button type="button" class="kid-avatar" aria-label="Change picture"><img src="${avatarArt(child)}" alt=""></button>
      <input type="text" class="kid-name" maxlength="16" autocomplete="off" spellcheck="false" aria-label="Child’s name" placeholder="${esc(displayName({ ...child, name: '' }))}" value="${esc(child.name)}">
      <button type="button" class="kid-play">${child.id === playing ? '★ Playing' : 'Play'}</button>
      ${isFirst(child.id) ? '' : '<button type="button" class="kid-remove" aria-label="Remove this child">✕</button>'}`;
    const img = row.querySelector('.kid-avatar img');
    row.querySelector('.kid-avatar').addEventListener('click', () => {
      const current = children().find(c => c.id === child.id);
      const next = AVATARS[(AVATARS.indexOf(current.avatar) + 1) % AVATARS.length];
      updateChild(child.id, { avatar: next });
      img.src = avatarArt({ avatar: next });
      audio.pop();
    });
    row.querySelector('.kid-name').addEventListener('input', e => updateChild(child.id, { name: e.target.value }));
    row.querySelector('.kid-play').addEventListener('click', () => {
      if (child.id === playing) return;
      setActive(child.id);
      audio.chime();
      reopen();
    });
    const remove = row.querySelector('.kid-remove');
    if (remove) remove.addEventListener('click', () => {
      const name = displayName(children().find(c => c.id === child.id));
      if (!window.confirm(`Remove ${name} and all of their stickers, pictures and progress from this device?`)) return;
      removeChild(child.id);
      reopen();
    });
  });
  const add = panel.querySelector('.kid-add');
  if (add) add.addEventListener('click', () => {
    const child = addChild();
    if (child) reopen(child.id);
  });
}

function showSettings(focusChildId = null) {
  const overlay = el('div', 'credits-overlay', document.body);
  const panel = el('div', 'credits-panel settings-panel', overlay);

  const vol = Number(localStorage.getItem(LS_VOLUME) || 0.9);
  const canRecord = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const child = activeChild();
  const whose = children().length > 1 ? ` for ${esc(displayName(child))}` : '';

  panel.innerHTML = `
    <button class="settings-close" aria-label="Close settings">✕ Close</button>
    <h2>Parent settings</h2>
    <h3>Children</h3>
    <p class="set-note">Each child keeps their own stickers, pictures, progress, learning stage and game choices on this device. The highlighted child is playing now; settings marked “for” a name are theirs. Trace It’s Name tab traces the playing child’s name.</p>
    <div class="kid-rows" id="kid-rows"></div>
    ${children().length < MAX_CHILDREN ? '<button type="button" class="big-btn kid-add">+ Add a child</button>' : ''}
    <label class="set-row">Learning stage${whose}
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
    <label class="set-check"><input type="checkbox" id="set-tap-place" ${tapPlaceEnabled() ? 'checked' : ''}> Tap to move pieces (tap a piece, then where it goes — easier than dragging)</label>
    <button class="big-btn progress-open">View on-device progress</button>
    <div class="offline-status">${localStorage.getItem('tinytaps-offline-ready') === '1' ? '✓ Ready to play offline' : 'Offline files finish saving after the first online visit'}</div>
    <details class="install-help"><summary>Install on iPhone or iPad</summary><p>Open Tiny Taps in Safari, tap Share, choose <strong>Add to Home Screen</strong>, then tap Add. Open it once while online before taking it offline.</p></details>
    <h3>Trace It</h3>
    <label class="set-row">Path width${whose}
      <select id="set-trace-width">
        ${[['narrow', 'Narrow (more practice)'], ['normal', 'Normal'], ['wide', 'Wide (easier)']].map(([id, label]) => `<option value="${id}"${id === traceWidth() ? ' selected' : ''}>${label}</option>`).join('')}
      </select>
    </label>
    <h3>Calm &amp; bedtime</h3>
    <label class="set-row">Celebrations
      <select id="set-celebrate">
        ${[['full', 'Full (confetti and fanfare)'], ['gentle', 'Gentle'], ['calm', 'Calm (no confetti)']].map(([id, label]) => `<option value="${id}"${id === calm.celebrationLevel() ? ' selected' : ''}>${label}</option>`).join('')}
      </select>
    </label>
    <label class="set-check"><input type="checkbox" id="set-keep-mute" ${calm.keepMute() ? 'checked' : ''}> Keep sound muted between games</label>
    <label class="set-row">Bedtime timer
      <select id="set-bedtime">
        ${calm.BEDTIME_CHOICES.map(n => `<option value="${n}"${n === calm.bedtimeMinutes() ? ' selected' : ''}>${n ? `${n} minutes` : 'Off'}</option>`).join('')}
      </select>
    </label>
    <p class="set-note">The timer starts when Tiny Taps is opened (or when you choose a time). Near the end, only calm games stay on the menu and the sound softens; then a goodnight screen appears. Hold the moon for two seconds to unlock it.</p>
    <h3>Your voice</h3>
    <p>Record yourself for praise and encouragement. These recordings remain
    active even though general computer narration is off.${canRecord ? '' : ' (Not supported on this browser.)'}</p>
    <div id="rec-rows"></div>
    <h3>Games on the menu${whose}</h3>
    <p class="set-games-hint">Drag ☰ to reorder a game, or move it between the two groups.</p>
    <div class="set-group-label">On Home Screen</div>
    <div class="set-game-list" id="set-home-list"></div>
    <div class="set-group-label">More Games</div>
    <div class="set-game-list" id="set-more-list"></div>
    <div class="settings-version">Tiny Taps v${VERSION} · <span id="set-size">measuring…</span></div>`;

  // Filled in asynchronously; the panel is usable either way.
  appSize().then(size => {
    const el2 = panel.querySelector('#set-size');
    if (el2) el2.textContent = size ? `${size} on this device` : 'size unavailable';
  });

  panel.querySelector('#set-vol').addEventListener('input', e => {
    const v = Number(e.target.value);
    localStorage.setItem(LS_VOLUME, String(v));
    audio.setVolume(v);
  });
  panel.querySelector('#set-profile').addEventListener('change', e => {
    localStorage.setItem(childKey(LS_PROFILE), e.target.value);
  });
  panel.querySelector('#set-mix').addEventListener('change', e =>
    localStorage.setItem(LS_MIX, e.target.checked ? '1' : '0'));
  panel.querySelector('#set-tap-place').addEventListener('change', e => setTapPlace(e.target.checked));
  setupChildren(panel, focusId => {
    overlay.remove();
    showSettings(focusId);
  });
  panel.querySelector('#set-trace-width').addEventListener('change', e => setTraceWidth(e.target.value));
  panel.querySelector('#set-celebrate').addEventListener('change', e => {
    calm.setCelebrationLevel(e.target.value);
    const r = e.target.getBoundingClientRect();
    celebrate.burst(r.left + r.width / 2, r.top, { count: 18 });
  });
  panel.querySelector('#set-keep-mute').addEventListener('change', e => calm.setKeepMute(e.target.checked));
  panel.querySelector('#set-bedtime').addEventListener('change', e => calm.setBedtimeMinutes(Number(e.target.value)));
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

  setupGameGroups(panel);
  if (focusChildId) {
    const input = panel.querySelector(`.kid-row[data-id="${focusChildId}"] .kid-name`);
    if (input) input.focus();
  }

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
    ...progress.hardestDetails('animals').map(x => `the word “${x}”`),
  ].slice(0, 5);
  const whose = children().length > 1 ? ` · ${esc(displayName(activeChild()))}` : '';
  box.innerHTML = `<h3>Play observations${whose}</h3>
    <p><strong>Favorite games:</strong> ${favorites}</p>
    <p><strong>Completed activities:</strong> ${data.totalWins || 0}</p>
    <p><strong>Currently practicing:</strong> ${needs.join(', ') || 'The app is still learning'}</p>
    <div class="progress-list">${ranked.map(g => `<div><span>${g.title}</span><span>${g.plays} plays · level ${g.level || 1}</span></div>`).join('')}</div>
    <p class="privacy-note">Stored only on this device. No scores, comparisons, accounts or uploads.</p>
    <button class="big-btn progress-reset">Reset progress</button>`;
  box.querySelector('.progress-reset').addEventListener('pointerdown', () => {
    if (window.confirm(`Reset ${children().length > 1 ? `${displayName(activeChild())}’s` : 'all local'} play observations and difficulty levels?`)) {
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
    calm.rememberMute(next);
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

  if (calm.goodnightLocked()) { showGoodnight(); return; }
  // Unmuted for every new game, unless a parent asked to keep a mute.
  audio.setMuted(calm.savedMute());
  clearScreen();
  currentView = 'game';
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
      const pool = mixPool(game.id);
      if (pool.length) startGame(pool[Math.floor(Math.random() * pool.length)], true);
    }, 90000);
    const cleanup = currentCleanup;
    currentCleanup = () => { clearTimeout(mixTimer); if (cleanup) cleanup(); };
  }
}

/* ---------------- goodnight (bedtime timer) ---------------- */

const MOON_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M64 10 A40 40 0 1 0 90 66 A32 32 0 1 1 64 10 Z" fill="#fff3b0" stroke="#ffd54a" stroke-width="3"/>
  <circle cx="44" cy="62" r="5" fill="#f5df8a"/><circle cx="32" cy="42" r="3.5" fill="#f5df8a"/>
</svg>`;

// Twinkle, twinkle on the music-box bell — once, softly.
const LULLABY = [0, 0, 3, 3, 4, 4, 3];

function showGoodnight() {
  clearScreen();
  currentView = 'goodnight';
  const s = el('div', 'screen goodnight', screenEl);
  const stars = Array.from({ length: 26 }, () =>
    `<span class="gn-star" style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 62).toFixed(1)}%;animation-delay:${(Math.random() * 3).toFixed(2)}s"></span>`).join('');
  s.innerHTML = `
    <div class="gn-sky">${stars}</div>
    <button class="gn-moon" aria-label="Grown-ups: hold the moon for two seconds to keep playing">${MOON_SVG}</button>
    <img class="gn-sleeper" src="assets/mascot_winter_sleep.PNG" alt="">
    <div class="gn-title">Goodnight!</div>
    <div class="gn-hint">Grown-ups: hold the moon to keep playing</div>`;
  if (audio.isRunning()) {
    LULLABY.forEach((step, i) => setTimeout(() => {
      if (currentView === 'goodnight') audio.bell(step);
    }, 400 + i * 650));
  }
  const moon = s.querySelector('.gn-moon');
  let hold = null;
  const cancel = () => { clearTimeout(hold); hold = null; moon.classList.remove('holding'); };
  moon.addEventListener('pointerdown', e => {
    e.preventDefault();
    cancel();
    moon.classList.add('holding');
    hold = setTimeout(() => {
      hold = null;
      calm.unlockGoodnight();
      audio.setVolume(baseVolume());
      audio.chime();
      showMenu();
    }, 2000);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => moon.addEventListener(ev, cancel));
}

function baseVolume() {
  return Number(localStorage.getItem(LS_VOLUME) || 0.9);
}

/* ---------------- boot ---------------- */

celebrate.init(document.getElementById('celebrate-canvas'));
speech.init();
audio.setVolume(baseVolume());

calm.startBedtime({
  // Wind-down starting (or the timer changing) refreshes an open menu.
  onChange: () => { if (currentView === 'menu') showMenu(); },
  onVolume: f => audio.setVolume(baseVolume() * f),
  onGoodnight: () => showGoodnight(),
});

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
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    localStorage.setItem('tinytaps-offline-ready', '1');
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    location.reload();
  });

  navigator.serviceWorker.register('sw.js').then(reg => {
    if (navigator.serviceWorker.controller) {
      localStorage.setItem('tinytaps-offline-ready', '1');
      reg.update().catch(() => {});
    }
  }).catch(() => {});
}

if (calm.goodnightLocked()) showGoodnight();
else showSplash();
