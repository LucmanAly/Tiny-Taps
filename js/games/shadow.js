// Shadow Match: a black silhouette appears; tap the animal it belongs to.
// Visual discrimination + shape recognition, using existing animal art with
// zero new SVGs (the silhouette is just a CSS filter on the same image).

import { ANIMALS, preloadSounds } from '../data/animals.js';
import { shuffle, pickN, cycler } from '../engine/rand.js';
import { makeRoundGame } from '../engine/roundgame.js';
import { S } from '../data/strings.js';

const nextAnimal = cycler(ANIMALS);

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sd-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#c9a2f5"/><stop offset="100%" stop-color="#6f35b0"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="80" height="80" rx="18" fill="url(#sd-i)"/>
  <ellipse cx="50" cy="58" rx="26" ry="18" fill="#2e2140"/>
  <circle cx="34" cy="38" rx="10" fill="#2e2140"/>
  <circle cx="34" cy="38" r="10" fill="#2e2140"/>
  <circle cx="60" cy="34" r="7" fill="#2e2140"/>
</svg>`;

export default makeRoundGame({
  id: 'shadow',
  title: 'Shadow Match',
  icon: ICON,
  promptAreaClass: 'prompt-area shadow-prompt',
  nextRound: () => nextAnimal(),
  renderPrompt(promptEl, target, ctx) {
    promptEl.innerHTML = `<div class="shadow-target pop-in"><img src="${target.art}" alt=""></div>`;
    if (target.sound) preloadSounds(ctx.audio, [target.id]);
  },
  options(target) {
    const picks = shuffle([target, ...pickN(ANIMALS.filter(a => a !== target), 2)]);
    return picks.map(a => ({
      correct: a === target,
      render(btn) { btn.innerHTML = `<img src="${a.art}" alt="${a.name}">`; },
    }));
  },
  async onWin({ target, ctx }) {
    const shadow = ctx.stage.querySelector('.shadow-target');
    if (shadow) shadow.classList.add('revealed');
    if (target.sound) await ctx.audio.play('animal:' + target.id, { maxDuration: 2.2 });
  },
  speakPrompt(target, first, ctx) {
    ctx.speech.speak(S.shadowPrompt(target.name), { interrupt: false });
  },
  reprompt(target, ctx) {
    if (target) ctx.speech.speak(S.shadowReprompt(target.name));
  },
  nextAnimalId: target => target.id,
});
