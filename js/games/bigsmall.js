// Big or Small: the same animal appears twice, one huge and one tiny; tap
// the one matching the spoken size word. Comparison vocabulary.

import { ANIMALS } from '../data/animals.js';
import { shuffle, cycler } from '../engine/rand.js';
import { makeRoundGame } from '../engine/roundgame.js';
import { S } from '../data/strings.js';

const nextAnimal = cycler(ANIMALS);

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bs-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#ffb8d0"/><stop offset="100%" stop-color="#e5548a"/>
    </linearGradient>
  </defs>
  <circle cx="35" cy="55" r="32" fill="url(#bs-i)"/>
  <circle cx="76" cy="72" r="12" fill="url(#bs-i)"/>
</svg>`;

export default makeRoundGame({
  id: 'bigsmall',
  title: 'Big or Small',
  icon: ICON,
  promptAreaClass: 'prompt-area bigsmall-prompt',
  optionClass: 'bigsmall-opt',
  rowClass: 'bigsmall-row',
  nextRound() {
    return { animal: nextAnimal(), size: Math.random() < 0.5 ? 'big' : 'small' };
  },
  renderPrompt(promptEl, target) {
    promptEl.innerHTML = `<div class="bigsmall-label pop-in">${target.size === 'big' ? 'BIG' : 'little'}</div>`;
  },
  options(target) {
    return shuffle(['big', 'small']).map(size => ({
      correct: size === target.size,
      render(btn) {
        btn.classList.add('bigsmall-' + size);
        btn.innerHTML = `<img src="${target.animal.art}" alt="">`;
      },
    }));
  },
  speakPrompt(target, first, ctx) {
    ctx.speech.speak(S.bigSmallPrompt(target.size, target.animal.name), { interrupt: false });
  },
  reprompt(target, ctx) {
    if (target) ctx.speech.speak(S.bigSmallPrompt(target.size, target.animal.name));
  },
  nextAnimalId: target => target.animal.id,
});
