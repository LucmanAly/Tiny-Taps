// WebAudio manager: real-recording playback + synthesized cheerful earcons.
// iOS requires a user gesture before audio can play; call unlock() from the
// first pointerdown (the splash screen does this).

let ctx = null;
let master = null;
const buffers = new Map();
const pending = new Map();
let currentSource = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
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

export async function load(name, url) {
  ensureCtx();
  if (buffers.has(name)) return buffers.get(name);
  if (pending.has(name)) return pending.get(name);
  const p = fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`audio ${url}: HTTP ${r.status}`);
      return r.arrayBuffer();
    })
    .then(data => ctx.decodeAudioData(data))
    .then(buf => { buffers.set(name, buf); pending.delete(name); return buf; })
    .catch(err => { pending.delete(name); console.warn(err); return null; });
  pending.set(name, p);
  return p;
}

// Plays a loaded buffer. Stops any other recording already playing so animal
// sounds never talk over each other. Returns a promise resolving when done.
export function play(name, { volume = 1, rate = 1 } = {}) {
  ensureCtx();
  const buf = buffers.get(name);
  if (!buf) return Promise.resolve();
  stopPlayback();
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.value = volume;
  src.connect(g).connect(master);
  currentSource = src;
  return new Promise(resolve => {
    src.onended = () => { if (currentSource === src) currentSource = null; resolve(); };
    src.start(0);
  });
}

export function stopPlayback() {
  if (currentSource) {
    try { currentSource.stop(); } catch (e) { /* already stopped */ }
    currentSource = null;
  }
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

export function chomp() {
  ensureCtx();
  tone(180, 0, 0.1, { type: 'square', vol: 0.18, glide: 90 });
  tone(140, 0.12, 0.1, { type: 'square', vol: 0.18, glide: 70 });
}
