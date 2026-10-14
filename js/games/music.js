// Music: a rainbow xylophone. Pure free play — every bar plays a note,
// bounces, and sparkles. No rules, no rounds.
//
// The xylophone also listens: every tune the child taps is remembered, and
// the green replay button plays it back with the bars lighting up in time.
// The star keeps a tune as a little chip to replay later (six at most, kept
// on this device). The instrument button swaps the notes for a real animal
// recording sung up the scale — a mooing, barking, quacking xylophone.

import { S } from '../data/strings.js';
import { animal } from '../data/animals.js';
import { childKey } from '../engine/children.js';

const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
const COLORS = ['#f04e3e', '#ff8c2e', '#ffcf3d', '#4db84d', '#2ba49a', '#3d7ef0', '#9b5fe0', '#ff9fce'];

const TUNES_KEY = 'tinytaps-music-tunes';
const INSTRUMENT_KEY = 'tinytaps-music-instrument';
const NEW_TUNE_GAP = 3500; // ms of quiet that starts a new tune
const MAX_NOTES = 24;
const MAX_TUNES = 6;
const MAX_PAUSE = 1200;    // replay never waits longer than this between notes
const MIN_PAUSE = 110;

// Animal voices: the recording is played faster for higher bars, from three
// quarters speed at the lowest bar to one and a half at the top.
const VOICES = ['dog', 'cat', 'cow', 'duck', 'sheep', 'pig']
  .map(id => animal(id))
  .filter(a => a && a.sound);
const INSTRUMENTS = [{ id: 'bars' }, ...VOICES.map(a => ({ id: a.id, animal: a }))];

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  ${COLORS.slice(0, 5).map((c, i) => `
    <rect x="${12 + i * 16}" y="${16 + i * 7}" width="12" height="${68 - i * 14}" rx="6" fill="${c}"/>`).join('')}
  <circle cx="78" cy="24" r="7" fill="#3a3357"/>
  <rect x="76" y="28" width="4" height="30" rx="2" fill="#3a3357" transform="rotate(-18 78 28)"/>
</svg>`;

const REPLAY_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M18.5 8.5 A7.5 7.5 0 1 0 19.5 13" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M19.8 4.2 L19.3 9.3 L14.3 8.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M10 9 L15 12 L10 15 Z" fill="#fff"/>
</svg>`;

const STAR_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 3.2 L14.6 8.6 L20.5 9.3 L16.1 13.3 L17.3 19.2 L12 16.2 L6.7 19.2 L7.9 13.3 L3.5 9.3 L9.4 8.6 Z"
        fill="#fff" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
</svg>`;

function savedTunes() {
  try {
    const list = JSON.parse(localStorage.getItem(childKey(TUNES_KEY)) || '[]');
    return Array.isArray(list) ? list.filter(t => t && Array.isArray(t.notes) && t.notes.length) : [];
  } catch (e) { return []; }
}

function writeTunes(list) {
  try { localStorage.setItem(childKey(TUNES_KEY), JSON.stringify(list)); } catch (e) { /* optional */ }
}

function instrumentIcon(inst) {
  return inst.animal ? `<img src="${inst.animal.art}" alt="">` : ICON;
}

// A saved tune's chip: its first few notes as little coloured bars.
function chipSvg(tune) {
  const notes = tune.notes.slice(0, 5);
  const w = 100 / notes.length;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${
    notes.map(([i], n) => `<rect x="${n * w + w * 0.18}" y="${18 + i * 6}" width="${w * 0.64}" height="${64 - i * 6}" rx="${w * 0.3}" fill="${COLORS[i]}"/>`).join('')
  }</svg>`;
}

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let taps = 0;
  let instIndex = Math.max(0, INSTRUMENTS.findIndex(x => x.id === localStorage.getItem(childKey(INSTRUMENT_KEY))));
  let tune = null;       // the tune being tapped right now
  let previous = null;   // the one before it
  let lastTapAt = 0;
  let playback = null;   // { timers, button }
  let tunes = savedTunes();

  const shell = document.createElement('div');
  shell.className = 'music-shell';
  const controls = document.createElement('div');
  controls.className = 'music-controls';
  const favs = document.createElement('div');
  favs.className = 'music-favs';
  const row = document.createElement('div');
  row.className = 'music-row';
  shell.append(favs, row);
  stage.append(shell, controls);

  const instButton = document.createElement('button');
  instButton.className = 'music-ctl music-inst';
  instButton.setAttribute('aria-label', 'Change instrument');
  const replay = document.createElement('button');
  replay.className = 'music-ctl music-replay';
  replay.setAttribute('aria-label', 'Play my tune again');
  replay.innerHTML = REPLAY_ICON;
  const keep = document.createElement('button');
  keep.className = 'music-ctl music-keep';
  keep.setAttribute('aria-label', 'Keep this tune');
  keep.innerHTML = STAR_ICON;
  controls.append(instButton, replay, keep);

  const inst = () => INSTRUMENTS[instIndex];

  function warm(instrument) {
    if (instrument.animal) audio.load('animal:' + instrument.id, instrument.animal.sound).catch(() => {});
  }

  function sound(i, instrument) {
    if (instrument.animal) {
      audio.play('animal:' + instrument.id, { rate: 0.75 * (NOTES[i] / NOTES[0]), maxDuration: 0.8 });
    } else {
      audio.note(NOTES[i]);
    }
  }

  function bounce(bar, lit) {
    bar.classList.remove('bounce');
    void bar.offsetWidth;
    bar.classList.add('bounce');
    if (lit) {
      bar.classList.add('lit');
      setTimeout(() => bar.classList.remove('lit'), 320);
    }
  }

  // The tune the replay button would play: the one being tapped, or the
  // last finished one.
  function replayable() {
    if (tune && tune.notes.length >= 2) return tune;
    if (previous && previous.notes.length >= 2) return previous;
    return null;
  }

  function syncButtons() {
    const t = replayable();
    replay.disabled = !t;
    keep.disabled = !t || t.kept;
    instButton.innerHTML = instrumentIcon(inst());
  }

  function stopPlayback() {
    if (!playback) return;
    playback.timers.forEach(clearTimeout);
    playback.button.classList.remove('playing');
    playback = null;
  }

  function playTune(t, button) {
    stopPlayback();
    const instrument = INSTRUMENTS.find(x => x.id === t.inst) || INSTRUMENTS[0];
    warm(instrument);
    const timers = [];
    playback = { timers, button };
    button.classList.add('playing');
    let at = 200;
    t.notes.forEach(([i, pause], n) => {
      if (n) at += Math.max(MIN_PAUSE, Math.min(MAX_PAUSE, pause));
      timers.push(setTimeout(() => {
        if (!alive) return;
        sound(i, instrument);
        bounce(bars[i], true);
      }, at));
    });
    timers.push(setTimeout(() => {
      if (!alive || !playback || playback.timers !== timers) return;
      stopPlayback();
      const r = button.getBoundingClientRect();
      celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 12, sound: false });
    }, at + 500));
  }

  function renderFavs() {
    favs.replaceChildren();
    tunes.forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'music-chip pop-in';
      chip.setAttribute('aria-label', 'Play a saved tune');
      chip.innerHTML = chipSvg(t);
      chip.addEventListener('pointerdown', e => {
        e.stopPropagation();
        if (!alive) return;
        if (playback && playback.button === chip) { stopPlayback(); return; }
        playTune(t, chip);
      });
      favs.appendChild(chip);
    });
  }

  const bars = NOTES.map((freq, i) => {
    const bar = document.createElement('button');
    bar.className = 'music-bar';
    bar.style.background = `linear-gradient(180deg, ${COLORS[i]}dd, ${COLORS[i]})`;
    bar.style.height = `${88 - i * 6}%`;
    bar.setAttribute('aria-label', `Note ${i + 1}`);
    bar.addEventListener('pointerdown', e => {
      if (!alive) return;
      stopPlayback();
      sound(i, inst());
      bounce(bar, false);
      remember(i);
      taps++;
      // A little extra magic every so often, never every tap.
      if (taps % 7 === 0) celebrate.burst(e.clientX, e.clientY, { count: 14, sound: false });
    });
    row.appendChild(bar);
    return bar;
  });

  function remember(i) {
    const now = performance.now();
    if (!tune || now - lastTapAt > NEW_TUNE_GAP || tune.inst !== inst().id) {
      if (tune && tune.notes.length >= 2) previous = tune;
      tune = { inst: inst().id, notes: [] };
    }
    tune.notes.push([i, tune.notes.length ? Math.round(now - lastTapAt) : 0]);
    if (tune.notes.length > MAX_NOTES) {
      tune.notes.shift();
      tune.notes[0][1] = 0;
    }
    tune.kept = false;
    lastTapAt = now;
    syncButtons();
  }

  replay.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (!alive) return;
    if (playback && playback.button === replay) { stopPlayback(); return; }
    const t = replayable();
    if (t) playTune(t, replay);
  });

  keep.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const t = replayable();
    if (!alive || !t || t.kept) return;
    t.kept = true;
    tunes = [...tunes, { inst: t.inst, notes: t.notes.map(n => n.slice()) }].slice(-MAX_TUNES);
    writeTunes(tunes);
    renderFavs();
    audio.chime();
    const r = keep.getBoundingClientRect();
    celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 18, sound: false });
    syncButtons();
  });

  instButton.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (!alive) return;
    stopPlayback();
    instIndex = (instIndex + 1) % INSTRUMENTS.length;
    try { localStorage.setItem(childKey(INSTRUMENT_KEY), inst().id); } catch (err) { /* optional */ }
    warm(inst());
    syncButtons();
    instButton.classList.remove('bounce');
    void instButton.offsetWidth;
    instButton.classList.add('bounce');
    // A quick taste of the new instrument from the middle of the scale.
    const preview = inst();
    if (preview.animal) {
      audio.load('animal:' + preview.id, preview.animal.sound).then(() => {
        if (alive && inst() === preview) sound(4, preview);
      });
    } else {
      sound(4, preview);
    }
  });

  warm(inst());
  renderFavs();
  syncButtons();
  speech.speak(S.musicIntro, { interrupt: false });
  setReprompt(null);
  return () => {
    alive = false;
    stopPlayback();
  };
}

export default {
  id: 'music',
  title: 'Music',
  icon: ICON,
  start,
};
