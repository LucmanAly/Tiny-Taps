// Pattern Parade: a repeating color sequence marches across the screen;
// tap the color that comes next. Early AB patterning for the older end.

import { shuffle } from '../engine/rand.js';
import { makeRoundGame } from '../engine/roundgame.js';
import { S } from '../data/strings.js';

const PALETTE = [
  { id: 'red', name: 'red', c: '#f04e3e' },
  { id: 'blue', name: 'blue', c: '#3d7ef0' },
  { id: 'yellow', name: 'yellow', c: '#ffcf3d' },
  { id: 'green', name: 'green', c: '#4db84d' },
  { id: 'purple', name: 'purple', c: '#9b5fe0' },
];

function dot(c, extraClass = '') {
  return `<div class="pattern-dot ${extraClass}" style="background:radial-gradient(circle at 35% 30%, ${c}ee, ${c})"></div>`;
}

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="26" cy="50" r="16" fill="#f04e3e"/>
  <circle cx="58" cy="50" r="16" fill="#3d7ef0"/>
  <circle cx="88" cy="50" r="14" fill="none" stroke="#8a8098" stroke-width="4" stroke-dasharray="6 6"/>
</svg>`;

export default makeRoundGame({
  id: 'pattern',
  title: 'Patterns',
  icon: ICON,
  promptAreaClass: 'prompt-area pattern-prompt',
  optionClass: 'pattern-opt',
  nextRound(ctx) {
    const level = ctx && ctx.difficulty ? ctx.difficulty() : 1;
    const [x, y, z] = shuffle(PALETTE).slice(0, 3);
    let unit;
    if (level === 1) unit = [x, y];                 // ABAB
    else if (level === 2) unit = [x, x, y];         // AABAAB
    else unit = [x, y, z];                          // ABCABC
    const len = level === 1 ? (Math.random() < 0.5 ? 3 : 4) : unit.length + 2;
    const seq = Array.from({ length: len }, (_, i) => unit[i % unit.length]);
    const next = unit[len % unit.length];
    return { x, y, z, seq, next, choices: level === 3 ? [x, y, z] : [x, y] };
  },
  renderPrompt(promptEl, target) {
    promptEl.innerHTML = `<div class="pattern-row pop-in">${
      target.seq.map(c => dot(c.c)).join('') + dot('#ffffff', 'pattern-blank')
    }</div>`;
  },
  options(target) {
    return shuffle(target.choices).map(c => ({
      correct: c.id === target.next.id,
      render(btn) { btn.innerHTML = dot(c.c, 'pattern-opt-dot'); },
    }));
  },
  speakPrompt(target, first, ctx) {
    ctx.speech.speak(S.patternPrompt, { interrupt: false });
  },
  reprompt(target, ctx) {
    ctx.speech.speak(S.patternPrompt);
  },
});
