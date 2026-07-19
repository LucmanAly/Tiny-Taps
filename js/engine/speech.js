// Spoken prompts via the device's text-to-speech. The child can't read, so
// every instruction goes through here. Pluggable: if a recorded clip exists
// for a phrase (added to `recordings`), it plays instead of TTS.

import { pick } from './rand.js';
import * as audio from './audio.js';

const synth = window.speechSynthesis || null;
let voice = null;
let voicesReady = false;

// Map of exact phrase -> audio buffer name, for optional parent recordings.
const recordings = new Map();

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  if (!voices.length) return;
  const en = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
  const score = v => {
    const n = v.name.toLowerCase();
    let s = 0;
    if (n.includes('natural') || n.includes('neural') || n.includes('premium') || n.includes('enhanced')) s += 8;
    if (n.includes('google')) s += 6;
    if (n.includes('samantha') || n.includes('zira') || n.includes('aria') || n.includes('jenny')) s += 5;
    if (v.localService) s += 2;
    if (v.lang.toLowerCase() === 'en-us') s += 1;
    return s;
  };
  voice = en.sort((a, b) => score(b) - score(a))[0] || voices[0];
  voicesReady = true;
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
  if (!synth) return Promise.resolve();
  if (interrupt) synth.cancel();
  if (!voice) pickVoice();
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = pitch;
    u.volume = 1;
    u.onend = resolve;
    u.onerror = resolve;
    synth.speak(u);
    // Safety: some browsers drop onend; don't hang forever.
    setTimeout(resolve, 1000 + text.length * 120);
  });
}

export function stop() {
  if (synth) synth.cancel();
}

const PRAISE = ['Great job!', 'Yay! You did it!', 'Hooray!', 'Wonderful!', 'Amazing!', 'Way to go!', 'Super!'];
const ENCOURAGE = ['Try again!', 'Almost! Try again!', 'You can do it!', 'Oops! One more try!'];

export function praise() {
  return speak(pick(PRAISE));
}

export function encourage() {
  return speak(pick(ENCOURAGE));
}
