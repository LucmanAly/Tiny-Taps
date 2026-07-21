// Colors: a color is shown (and spoken); tap the matching balloon.

import { shuffle, pickN, cycler } from '../engine/rand.js';
import { fadeSwap } from '../engine/ui.js';
import { S } from '../data/strings.js';

const COLORS = [
  { id: 'red',    name: 'red',    main: '#f04e3e', light: '#ff9c8a', dark: '#c02a1e' },
  { id: 'blue',   name: 'blue',   main: '#3d7ef0', light: '#8ab4ff', dark: '#1e50c0' },
  { id: 'yellow', name: 'yellow', main: '#ffcf3d', light: '#fff0a8', dark: '#e8a416' },
  { id: 'green',  name: 'green',  main: '#4db84d', light: '#96e08a', dark: '#2a8a2a' },
  { id: 'purple', name: 'purple', main: '#9b5fe0', light: '#c9a2f5', dark: '#6f35b0' },
  { id: 'orange', name: 'orange', main: '#ff8c2e', light: '#ffbe85', dark: '#d9620a' },
];

function balloonSvg(c) {
  return `
  <svg viewBox="0 0 100 150" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bl-${c.id}" cx="38%" cy="30%" r="85%">
        <stop offset="0%" stop-color="${c.light}"/>
        <stop offset="55%" stop-color="${c.main}"/>
        <stop offset="100%" stop-color="${c.dark}"/>
      </radialGradient>
    </defs>
    <path d="M50 118 Q46 126 50 132 Q54 138 50 146" fill="none" stroke="#8a8098" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="60" rx="38" ry="48" fill="url(#bl-${c.id})"/>
    <path d="M44 106 L50 116 L56 106 Z" fill="${c.dark}"/>
    <ellipse cx="36" cy="38" rx="12" ry="18" fill="#ffffff" opacity="0.4" transform="rotate(-18 36 38)"/>
  </svg>`;
}

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cl-i1" cx="38%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#ff9c8a"/><stop offset="100%" stop-color="#c02a1e"/>
    </radialGradient>
    <radialGradient id="cl-i2" cx="38%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#8ab4ff"/><stop offset="100%" stop-color="#1e50c0"/>
    </radialGradient>
  </defs>
  <ellipse cx="36" cy="42" rx="22" ry="27" fill="url(#cl-i1)"/>
  <path d="M36 68 Q33 78 36 90" fill="none" stroke="#8a8098" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="68" cy="52" rx="19" ry="24" fill="url(#cl-i2)"/>
  <path d="M68 75 Q66 84 68 94" fill="none" stroke="#8a8098" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="28" cy="30" rx="7" ry="10" fill="#fff" opacity="0.4" transform="rotate(-18 28 30)"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt, difficulty, recordOutcome } = ctx;
  let alive = true;
  let target = null;
  const nextColor = cycler(COLORS);

  const promptArea = document.createElement('div');
  promptArea.className = 'prompt-area';
  const row = document.createElement('div');
  row.className = 'options-row balloon-row';
  row.style.display = 'flex';
  stage.appendChild(promptArea);
  stage.appendChild(row);

  function say(first) {
    if (target) speech.speak(S.colorsPrompt(target.name), { interrupt: false });
  }

  function newRound(first) {
    const build = () => {
    if (!alive) return;
    target = nextColor();
    const level = difficulty ? difficulty() : 2;
    const optionCount = level === 1 ? 2 : level === 2 ? 3 : 4;
    const options = shuffle([target, ...pickN(COLORS.filter(c => c !== target), optionCount - 1)]);
    promptArea.innerHTML = `<div class="color-swatch pop-in" style="background:radial-gradient(circle at 38% 30%, ${target.light}, ${target.main} 60%, ${target.dark})"></div>`;
    row.innerHTML = '';
    let done = false;
    options.forEach(c => {
      const b = document.createElement('button');
      b.className = 'balloon pop-in';
      b.innerHTML = balloonSvg(c);
      b.addEventListener('pointerdown', e => {
        if (!alive || done) return;
        if (c === target) {
          if (recordOutcome) recordOutcome(true, target.name);
          done = true;
          b.classList.add('popped');
          audio.pop();
          celebrate.burst(e.clientX, e.clientY, { count: 30 });
          speech.praise();
          setTimeout(() => newRound(false), 900);
        } else {
          if (recordOutcome) recordOutcome(false, target.name);
          b.classList.remove('wiggle');
          void b.offsetWidth;
          b.classList.add('wiggle');
          audio.boing();
          speech.encourage();
        }
      });
      row.appendChild(b);
    });
    say(first);
    };
    if (first) build();
    else fadeSwap(row, build);
  }

  setReprompt(() => say(false));
  newRound(true);
  return () => { alive = false; };
}

export default {
  id: 'colors',
  title: 'Colors',
  icon: ICON,
  start,
};
