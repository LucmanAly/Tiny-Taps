// Shapes: a dashed outline appears; tap the matching shape to fill it in.

import { shuffle, pickN, cycler } from '../engine/rand.js';
import { fadeSwap } from '../engine/ui.js';
import { S } from '../data/strings.js';

const SHAPES = [
  { id: 'circle',   name: 'circle',   d: 'M50 8 A42 42 0 1 1 49.9 8 Z', c: ['#ff9c8a', '#f04e3e'] },
  { id: 'square',   name: 'square',   d: 'M14 14 H86 V86 H14 Z', c: ['#8ab4ff', '#3d7ef0'] },
  { id: 'triangle', name: 'triangle', d: 'M50 10 L90 84 L10 84 Z', c: ['#96e08a', '#4db84d'] },
  { id: 'star',     name: 'star',     d: 'M50 6 L61 38 L95 38 L68 58 L78 92 L50 71 L22 92 L32 58 L5 38 L39 38 Z', c: ['#fff0a8', '#ffb62e'] },
  { id: 'heart',    name: 'heart',    d: 'M50 88 C20 66 8 46 14 30 C19 17 36 12 50 28 C64 12 81 17 86 30 C92 46 80 66 50 88 Z', c: ['#ffb8d0', '#e5548a'] },
  { id: 'diamond',  name: 'diamond',  d: 'M50 6 L88 50 L50 94 L12 50 Z', c: ['#c9a2f5', '#9b5fe0'] },
];

function shapeSvg(s, { filled, dashed } = {}) {
  const grad = `sp-${s.id}-${filled ? 'f' : 'o'}`;
  return `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="${grad}" cx="38%" cy="30%" r="85%">
        <stop offset="0%" stop-color="${s.c[0]}"/>
        <stop offset="100%" stop-color="${s.c[1]}"/>
      </radialGradient>
    </defs>
    <path d="${s.d}"
      fill="${filled ? `url(#${grad})` : 'none'}"
      stroke="${dashed ? 'rgba(58,51,87,0.45)' : s.c[1]}"
      stroke-width="${dashed ? 5 : 4}"
      ${dashed ? 'stroke-dasharray="10 9"' : ''}
      stroke-linejoin="round"/>
  </svg>`;
}

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sh-i1" cx="38%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#fff0a8"/><stop offset="100%" stop-color="#ffb62e"/>
    </radialGradient>
    <radialGradient id="sh-i2" cx="38%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#8ab4ff"/><stop offset="100%" stop-color="#3d7ef0"/>
    </radialGradient>
  </defs>
  <rect x="8" y="46" width="42" height="42" rx="8" fill="url(#sh-i2)"/>
  <path d="M66 10 L73 30 L94 30 L77 43 L83 64 L66 51 L49 64 L55 43 L38 30 L59 30 Z" fill="url(#sh-i1)"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let target = null;
  let busy = false;
  const nextShape = cycler(SHAPES);

  const promptArea = document.createElement('div');
  promptArea.className = 'prompt-area';
  promptArea.style.flex = '1';
  const targetBox = document.createElement('div');
  targetBox.className = 'shape-target';
  promptArea.appendChild(targetBox);
  const row = document.createElement('div');
  row.className = 'options-row';
  row.style.paddingBottom = 'max(3vmin, env(safe-area-inset-bottom))';
  stage.appendChild(promptArea);
  stage.appendChild(row);

  function say(first) {
    if (target) speech.speak(S.shapesPrompt(target.name), { interrupt: !first });
  }

  function newRound(first) {
    const build = () => {
    if (!alive) return;
    busy = false;
    target = nextShape();
    targetBox.innerHTML = shapeSvg(target, { dashed: true });
    targetBox.classList.remove('pop-in');
    void targetBox.offsetWidth;
    targetBox.classList.add('pop-in');
    row.innerHTML = '';
    shuffle([target, ...pickN(SHAPES.filter(s => s !== target), 2)]).forEach(s => {
      const b = document.createElement('button');
      b.className = 'shape-opt pop-in';
      b.innerHTML = shapeSvg(s, { filled: true });
      b.addEventListener('pointerdown', e => {
        if (!alive || busy) return;
        if (s === target) {
          busy = true;
          audio.chime();
          // fly a clone into the outline, then fill it
          const clone = b.firstElementChild.cloneNode(true);
          const from = b.getBoundingClientRect();
          const to = targetBox.getBoundingClientRect();
          Object.assign(clone.style, {
            position: 'fixed', left: from.left + 'px', top: from.top + 'px',
            width: from.width + 'px', height: from.height + 'px',
            transition: 'all 0.6s cubic-bezier(0.5, 0, 0.3, 1)', zIndex: 200,
          });
          document.body.appendChild(clone);
          b.style.visibility = 'hidden';
          requestAnimationFrame(() => {
            Object.assign(clone.style, {
              left: to.left + 'px', top: to.top + 'px',
              width: to.width + 'px', height: to.height + 'px',
            });
          });
          setTimeout(() => {
            targetBox.innerHTML = shapeSvg(target, { filled: true });
            clone.remove();
            celebrate.burst(to.left + to.width / 2, to.top + to.height / 2, { count: 30 });
            speech.praise();
            setTimeout(() => newRound(false), 1800);
          }, 650);
        } else {
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
  id: 'shapes',
  title: 'Shapes',
  icon: ICON,
  start,
};
