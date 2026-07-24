// WebAudio manager: real-recording playback + synthesized cheerful earcons.
// iOS requires a user gesture before audio can play; call unlock() from the
// first pointerdown (the splash screen does this).

let ctx = null;
let master = null;
let muteGain = null; // separate node so a per-game mute toggle never has to
                      // know or restore the user's actual volume setting
let muted = false;
const buffers = new Map();
const pending = new Map();
let currentSource = null;
let currentName = null;
let currentFinish = null; // promise resolving when currentSource's playback ends

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    muteGain = ctx.createGain();
    muteGain.gain.value = muted ? 0 : 1;
    master.connect(muteGain);
    muteGain.connect(ctx.destination);
  }
  return ctx;
}

// Per-game mute toggle (independent of the persisted volume setting in
// Parent Settings) — silences all WebAudio playback until unmuted.
export function setMuted(b) {
  muted = !!b;
  if (muteGain) muteGain.gain.value = muted ? 0 : 1;
}

export function isMuted() {
  return muted;
}

// True only when the context exists and is actually producing sound. Callers
// that fire on a timer rather than a tap (the opening sequence) check this so
// they stay silent instead of scheduling notes into a suspended context that
// browsers will never play.
export function isRunning() {
  return !!ctx && ctx.state === 'running';
}

// Creates the context and asks it to start, for code that runs without a user
// gesture behind it. Browsers are free to refuse — the rejection is swallowed
// and the context simply stays suspended, so the caller falls back to silence
// rather than surfacing an error. Unlike unlock(), this makes no sound of its
// own and is safe to call before any interaction.
export function tryResume() {
  ensureCtx();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx.state === 'running';
}

export function unlock() {
  ensureCtx();
  if (ctx.state === 'suspended') ctx.resume();
  // Play a silent buffer to fully unlock playback on iOS.
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(master);
  src.start(0);
}

// decodeAudioData with a callback-form fallback (older iOS Safari rejects
// the promise form).
function decode(data) {
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(data, resolve, reject);
    if (p && p.then) p.then(resolve, reject);
  });
}

async function loadOnce(name, url) {
  const p = fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`audio ${url}: HTTP ${r.status}`);
      return r.arrayBuffer();
    })
    .then(data => decode(data))
    .then(buf => { buffers.set(name, buf); pending.delete(name); return buf; })
    .catch(err => { pending.delete(name); console.warn(err); return null; });
  pending.set(name, p);
  return p;
}

// Loads (and caches) an audio file. Retries once on failure — a flaky
// network blip shouldn't permanently silence an animal for the rest of the
// session.
export async function load(name, url) {
  ensureCtx();
  if (buffers.has(name)) return buffers.get(name);
  if (pending.has(name)) return pending.get(name);
  let buf = await loadOnce(name, url);
  if (!buf) buf = await loadOnce(name, url);
  return buf;
}

// Resolves ctx.resume() or gives up after a short timeout — some mobile
// browsers can leave resume() hanging indefinitely, which would otherwise
// silently block all playback forever.
function resumeWithTimeout(ms = 400) {
  return Promise.race([
    ctx.resume().catch(() => {}),
    new Promise(r => setTimeout(r, ms)),
  ]);
}

// Plays a loaded (or still-loading) buffer. Stops any other recording already
// playing so animal sounds never talk over each other. Always resolves — even
// if the context is suspended or onended never fires — so games can't hang.
// `maxDuration` (seconds), when given, plays only the clip's opening and
// fades out just before the cutoff instead of an abrupt stop.
export async function play(name, { volume = 1, rate = 1, maxDuration = null } = {}) {
  ensureCtx();
  if (ctx.state === 'suspended') await resumeWithTimeout();
  let buf = buffers.get(name);
  if (!buf && pending.has(name)) buf = await pending.get(name);
  if (!buf) return;
  // Never cut off a parent's own recorded voice with an incidental sound
  // (an animal-hello at the start of the next round, etc). Let it finish
  // first, then play. Two recordings back-to-back still interrupt normally.
  if (currentName && currentName.startsWith('rec:') && !name.startsWith('rec:') && currentFinish) {
    await currentFinish;
  } else {
    stopPlayback();
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  const playLen = maxDuration ? Math.min(buf.duration, maxDuration) : buf.duration;
  const truncated = maxDuration && buf.duration > maxDuration;
  const t0 = ctx.currentTime;
  if (truncated) {
    const fade = Math.min(0.15, playLen * 0.3);
    g.gain.setValueAtTime(volume, t0);
    g.gain.setValueAtTime(volume, t0 + playLen - fade);
    g.gain.linearRampToValueAtTime(0.0001, t0 + playLen);
  } else {
    g.gain.value = volume;
  }
  src.connect(g).connect(master);
  currentSource = src;
  currentName = name;
  currentFinish = new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (currentSource === src) { currentSource = null; currentName = null; currentFinish = null; }
      resolve();
    };
    src.onended = finish;
    setTimeout(finish, (playLen / rate) * 1000 + 400);
    if (truncated) src.start(0, 0, playLen);
    else src.start(0);
  });
  await currentFinish;
}

// Decode an in-memory blob (e.g. a parent voice recording) into a named
// buffer. Retries the decode once — some browsers intermittently fail
// decodeAudioData on the first attempt right after a MediaRecorder stop.
export async function loadBlob(name, blob) {
  ensureCtx();
  if (!blob || blob.size < 200) { console.warn('loadBlob', name, 'empty/near-empty blob:', blob && blob.size); return null; }
  const data = await blob.arrayBuffer();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const buf = await decode(data);
      buffers.set(name, buf);
      return buf;
    } catch (e) {
      if (attempt === 1) { console.warn('loadBlob', name, e); return null; }
    }
  }
}

export function hasBuffer(name) {
  return buffers.has(name);
}

export function setVolume(v) {
  ensureCtx();
  master.gain.value = Math.max(0, Math.min(1, v));
}

export function stopPlayback() {
  if (currentSource) {
    try { currentSource.stop(); } catch (e) { /* already stopped */ }
    currentSource = null;
  }
  currentName = null;
  currentFinish = null;
}

export function duration(name) {
  const buf = buffers.get(name);
  return buf ? buf.duration : 0;
}

/* ---------------- synthesized earcons ---------------- */

function tone(freq, start, dur, { type = 'sine', vol = 0.25, glide = 0 } = {}) {
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function pop() {
  ensureCtx();
  tone(520, 0, 0.09, { type: 'triangle', vol: 0.35, glide: 900 });
}

export function boing() {
  ensureCtx();
  tone(300, 0, 0.25, { type: 'sine', vol: 0.3, glide: 150 });
  tone(450, 0.06, 0.22, { type: 'sine', vol: 0.15, glide: 220 });
}

export function chime() {
  ensureCtx();
  [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.09, 0.5, { vol: 0.22 }));
}

export function sparkle() {
  ensureCtx();
  [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, i * 0.05, 0.25, { vol: 0.12 }));
}

export function tada() {
  ensureCtx();
  const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.5];
  const times = [0, 0.12, 0.24, 0.36, 0.48, 0.66];
  notes.forEach((f, i) => tone(f, times[i], i === notes.length - 1 ? 0.7 : 0.18, { type: 'triangle', vol: 0.22 }));
  sparkleAt(0.66);
}

function sparkleAt(offset) {
  [1568, 2093, 2637].forEach((f, i) => tone(f, offset + i * 0.06, 0.3, { vol: 0.1 }));
}

// Single musical note for the music game.
export function note(freq) {
  ensureCtx();
  tone(freq, 0, 0.55, { type: 'triangle', vol: 0.32 });
  tone(freq * 2, 0, 0.3, { type: 'sine', vol: 0.08 });
}

// A happy "yum!" bite — ascending triangle glide with a soft sparkle tail,
// matching pop()'s positive character (was previously a descending square
// wave, which read as an error buzzer rather than a reward).
export function chomp() {
  ensureCtx();
  tone(240, 0, 0.09, { type: 'triangle', vol: 0.32, glide: 520 });
  tone(600, 0.07, 0.16, { type: 'sine', vol: 0.16, glide: 950 });
}

/* --- opening-sequence earcons ---
   Deliberately quieter than the in-game set: these play under an animation
   rather than as feedback for something the child did, so they should colour
   the scene without demanding attention. */

// A soft, round footfall. Low and short so it reads as a cosy step on carpet
// rather than a thud.
export function footstep() {
  ensureCtx();
  tone(160, 0, 0.10, { type: 'sine', vol: 0.09, glide: 104 });
}

// Friendly two-note "hello" for the wave.
export function greet() {
  ensureCtx();
  tone(523.25, 0, 0.15, { type: 'triangle', vol: 0.17 });
  tone(698.46, 0.12, 0.24, { type: 'triangle', vol: 0.15 });
}

// Airy rising sweep as the wand comes down — the wind-up before the magic.
export function whoosh() {
  ensureCtx();
  tone(300, 0, 0.30, { type: 'sine', vol: 0.09, glide: 1250 });
}

// One rainbow band sweeping in. Called on a pentatonic scale so the notes
// still sound sweet together when they overlap.
export function shimmer(freq) {
  ensureCtx();
  tone(freq, 0, 0.45, { type: 'sine', vol: 0.12 });
  tone(freq * 2, 0, 0.20, { type: 'sine', vol: 0.04 });
}

// Warm resolving chord as the logo settles. A gentle finish rather than a
// fanfare, because the menu appears immediately afterwards.
export function softFanfare() {
  ensureCtx();
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone(f, i * 0.055, 0.8, { type: 'triangle', vol: 0.12 }));
}
