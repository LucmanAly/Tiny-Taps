// Calm & bedtime: parent choices that turn the whole app down a notch.
//
// - Celebrations: Full (confetti and fanfare), Gentle (a little confetti and
//   a softer chord) or Calm (no confetti, one soft chime). The device's own
//   "reduce motion" setting also removes confetti, camera flashes and hint
//   sparkles, whatever is chosen here.
// - Keep mute: a muted game stays muted in the next one (off by default, so a
//   game never silently inherits a forgotten mute).
// - Bedtime timer: counted from when the app is opened. Near the end the
//   menu narrows to calm games and the sound eases down; then a goodnight
//   screen stays up until a grown-up holds the moon. Everything is local.

const CELEBRATE_KEY = 'tinytaps-celebrations';
const KEEP_MUTE_KEY = 'tinytaps-keep-mute';
const MUTED_KEY = 'tinytaps-muted';
const BEDTIME_KEY = 'tinytaps-bedtime-minutes';
const GOODNIGHT_KEY = 'tinytaps-goodnight-at';
const GOODNIGHT_HOURS = 8;   // a goodnight screen outlasts a reload, not a night

export const CELEBRATION_LEVELS = ['full', 'gentle', 'calm'];
export const BEDTIME_CHOICES = [0, 10, 15, 20, 30, 45, 60];
// Games that suit winding down: slow, open-ended, no rounds to race through.
export const CALM_GAMES = ['playhouse', 'coloring', 'music', 'stickers', 'animals', 'numberbook'];

function get(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

function set(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch (e) { /* optional */ }
}

export function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

export function celebrationLevel() {
  const saved = get(CELEBRATE_KEY);
  return CELEBRATION_LEVELS.includes(saved) ? saved : 'full';
}

export function setCelebrationLevel(level) {
  set(CELEBRATE_KEY, CELEBRATION_LEVELS.includes(level) ? level : 'full');
}

// How much confetti to draw: 1 is the full amount, 0 none at all.
export function confettiScale() {
  if (reducedMotion()) return 0;
  return { full: 1, gentle: 0.4, calm: 0 }[celebrationLevel()];
}

// Flashes, sparkles and big wiggles are skipped or softened when true.
export function quietMotion() {
  return reducedMotion() || celebrationLevel() === 'calm';
}

export function keepMute() {
  return get(KEEP_MUTE_KEY) === '1';
}

export function setKeepMute(on) {
  set(KEEP_MUTE_KEY, on ? '1' : '0');
  if (!on) set(MUTED_KEY, null);
}

export function savedMute() {
  return keepMute() && get(MUTED_KEY) === '1';
}

export function rememberMute(muted) {
  if (keepMute()) set(MUTED_KEY, muted ? '1' : '0');
}

/* ---------------- bedtime ---------------- */

let openedAt = Date.now();
let ticker = null;
let state = 'off';          // off | play | winddown | goodnight
let handlers = {};

export function bedtimeMinutes() {
  const n = Number(get(BEDTIME_KEY));
  return BEDTIME_CHOICES.includes(n) ? n : 0;
}

// Saving a new time restarts the countdown from now.
export function setBedtimeMinutes(n) {
  set(BEDTIME_KEY, BEDTIME_CHOICES.includes(Number(n)) ? Number(n) : 0);
  openedAt = Date.now();
  if (state !== 'goodnight') state = 'off';
  tick();
}

export function isWindingDown() {
  return state === 'winddown';
}

export function goodnightLocked() {
  const at = Number(get(GOODNIGHT_KEY));
  return at > 0 && Date.now() - at < GOODNIGHT_HOURS * 3600000;
}

// A grown-up's unlock: the goodnight screen goes, and the timer stays off
// until the app is opened again.
export function unlockGoodnight() {
  set(GOODNIGHT_KEY, null);
  state = 'snoozed';
  if (handlers.onVolume) handlers.onVolume(1);
}

// Wind-down is the last five minutes (or the last third of a short timer).
function windDownMs(minutes) {
  return Math.min(5, minutes / 3) * 60000;
}

function tick() {
  if (state === 'snoozed' || state === 'goodnight') return;
  const minutes = bedtimeMinutes();
  if (!minutes) {
    if (state === 'winddown' && handlers.onVolume) handlers.onVolume(1);
    if (state !== 'off') { state = 'off'; if (handlers.onChange) handlers.onChange(); }
    return;
  }
  const end = openedAt + minutes * 60000;
  const windAt = end - windDownMs(minutes);
  const now = Date.now();
  if (now >= end) {
    state = 'goodnight';
    set(GOODNIGHT_KEY, now);
    if (handlers.onVolume) handlers.onVolume(1);
    if (handlers.onGoodnight) handlers.onGoodnight();
    return;
  }
  if (now >= windAt) {
    const first = state !== 'winddown';
    state = 'winddown';
    // Ease the volume down to about half across the wind-down.
    if (handlers.onVolume) handlers.onVolume(1 - 0.45 * Math.min(1, (now - windAt) / (end - windAt)));
    if (first && handlers.onChange) handlers.onChange();
    return;
  }
  if (state !== 'play') { state = 'play'; if (handlers.onChange) handlers.onChange(); }
}

// Wall-clock checks (not one long timeout) so a phone that slept in a
// pocket still ends the session at the right time.
export function startBedtime(h) {
  handlers = h || {};
  clearInterval(ticker);
  ticker = setInterval(tick, 10000);
  tick();
}
