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
  nextRound() {
    const [x, y] = shuffle(PALETTE).slice(0, 2);
    const len = Math.random() < 0.5 ? 3 : 4;
    const seq = Array.from({ length: len }, (_, i) => (i % 2 === 0 ? x : y));
    const next = len % 2 === 0 ? x : y;
    return { x, y, seq, next };
  },
  renderPrompt(promptEl, target) {
    promptEl.innerHTML = `<div class="pattern-row pop-in">${
      target.seq.map(c => dot(c.c)).join('') + dot('#ffffff', 'pattern-blank')
    }</div>`;
  },
  options(target) {
    return shuffle([target.x, target.y]).map(c => ({
      correct: c.id === target.next.id,
      render(btn) { btn.innerHTML = dot(c.c, 'pattern-opt-dot'); },
    }));
  },
  speakPrompt(target, first, ctx) {
    ctx.speech.speak(S.patternPrompt, { interrupt: !first });
  },
  reprompt(target, ctx) {
    ctx.speech.speak(S.patternPrompt);
  },
});
