// Spoken prompts via the device's text-to-speech. The child can't read, so
// every instruction goes through here. Pluggable: if a recorded clip exists
// for a phrase (added to `recordings`), it plays instead of TTS.

import { pick } from './rand.js';
import * as audio from './audio.js';

const synth = window.speechSynthesis || null;
let voice = null;
let voicesReady = false;
// A parent-chosen voice, by name, overrides the automatic pick below — voice
// quality varies wildly by device/OS and there's no way to know in advance
// which installed voice actually sounds best, so Settings lets them choose.
let voiceOverride = localStorage.getItem('tinytaps-voice') || '';

// Map of exact phrase -> audio buffer name, for optional parent recordings.
const recordings = new Map();
// Category ('praise' | 'encourage') -> audio buffer name of a parent recording.
const recordedCats = new Map();
// Parent-adjustable speaking speed multiplier.
let userRate = Number(localStorage.getItem('tinytaps-rate') || 1);

export function setUserRate(r) {
  userRate = r;
  localStorage.setItem('tinytaps-rate', String(r));
}

export function getUserRate() {
  return userRate;
}

export function setRecordedCategory(cat, bufferName) {
  if (bufferName) {
    recordedCats.set(cat, bufferName);
    // A freshly (re-)recorded praise clip should be heard on the very next
    // win, not silently skipped by the quick-game throttle below — a parent
    // testing it once right after recording needs to actually hear it.
    if (cat === 'praise') quickPraiseCount = 2;
  } else {
    recordedCats.delete(cat);
  }
}

// Known higher-quality voice names across platforms — Apple's downloadable
// "Enhanced"/"Premium" voices and Android/Chrome's WaveNet-derived voices
// sound noticeably more natural than the default compact ones.
const GOOD_VOICE_NAMES = [
  'samantha', 'ava', 'serena', 'moira', 'tessa', 'karen', 'fiona', 'zira',
  'aria', 'jenny', 'sonia', 'libby', 'natasha', 'zoe',
];

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  if (!voices.length) return;
  if (voiceOverride) {
    const chosen = voices.find(v => v.name === voiceOverride);
    if (chosen) { voice = chosen; voicesReady = true; return; }
  }
  const en = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  const score = v => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (n.includes('natural') || n.includes('neural') || n.includes('premium') || n.includes('enhanced')) s += 8;
    if (n.includes('google')) s += 6;
    if (GOOD_VOICE_NAMES.some(name => n.includes(name))) s += 5;
    if (n.includes('female')) s += 2;
    if (v.localService) s += 2;
    if (v.lang.toLowerCase() === 'en-us') s += 1;
    return s;
  };
  voice = en.sort((a, b) => score(b) - score(a))[0] || voices[0];
  voicesReady = true;
}

// For the Settings voice picker: every English-ish voice available on this
// device, plus which one is currently in effect.
export function listVoices() {
  if (!synth) return [];
  return synth.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
}

export function getVoiceName() {
  return voice ? voice.name : '';
}

export function setVoiceOverride(name) {
  voiceOverride = name || '';
  localStorage.setItem('tinytaps-voice', voiceOverride);
  pickVoice();
}

export function init() {
  if (!synth) return;
  pickVoice();
  if (!voicesReady) synth.addEventListener('voiceschanged', pickVoice, { once: true });
}

export function registerRecording(phrase, bufferName) {
  recordings.set(phrase.toLowerCase(), bufferName);
}

export function speak(text, { interrupt = true, rate = 0.92, pitch = 1.08 } = {}) {
  const rec = recordings.get(text.toLowerCase());
  if (rec) return audio.play(rec);
  if (!synth || audio.isMuted()) return Promise.resolve();
  if (interrupt) synth.cancel();
  if (!voice) pickVoice();
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate * userRate;
    u.pitch = pitch;
    u.volume = 1;
    let settled = false;
    let guard;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    // Safety guards: if speech never starts (broken TTS) resolve quickly;
    // once it does start, allow generous time so we never resolve while the
    // voice is still talking.
    guard = setTimeout(done, 2500);
    u.onstart = () => {
      clearTimeout(guard);
      guard = setTimeout(done, 2000 + text.length * 220);
    };
    synth.speak(u);
  });
}

export function stop() {
  if (synth) synth.cancel();
}

const PRAISE = ['Great job!', 'Yay! You did it!', 'Hooray!', 'Wonderful!', 'Amazing!', 'Way to go!', 'Super!'];
const ENCOURAGE = ['Try again!', 'Almost! Try again!', 'You can do it!', 'Oops! One more try!'];

// Every completed round says something positive; the parent's *recorded*
// clip specifically is the extra-special one. `quick` (fast, frequently-
// repeating games) throttles it to roughly every 3rd win so it stays a
// periodic treat instead of playing every round — a synthesized cheer still
// plays every time either way. Pass `quick: false` for slower games where
// every completion should hear it.
let quickPraiseCount = 0;
export function praise({ quick = true } = {}) {
  const rec = recordedCats.get('praise');
  if (rec) {
    if (quick) {
      quickPraiseCount++;
      if (quickPraiseCount % 3 !== 0) return speak(pick(PRAISE));
    }
    return audio.play(rec);
  }
  return speak(pick(PRAISE));
}

export function encourage() {
  const rec = recordedCats.get('encourage');
  if (rec) return audio.play(rec);
  return speak(pick(ENCOURAGE));
}
