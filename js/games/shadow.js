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
  <rect x="8" y="8" width="84" height="84" rx="20" fill="#b98aef"/>
  <image href="${ANIMALS.find(a => a.id === 'frog').art}" x="10" y="10" width="80" height="80" style="filter:brightness(0)"/>
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
