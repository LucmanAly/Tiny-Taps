// Animal Sounds: hear a real recording, tap the animal that makes it.

import { SOUND_ANIMALS, preloadSounds } from '../data/animals.js';
import { shuffle, pickN, cycler } from '../engine/rand.js';
import { fadeSwap } from '../engine/ui.js';
import { S } from '../data/strings.js';

const EAR_ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M30 78 C30 88 44 92 50 84 C54 78 52 72 58 66 C68 56 74 48 74 36 C74 20 62 10 48 10 C34 10 24 20 24 34"
        fill="none" stroke="#3a3357" stroke-width="7" stroke-linecap="round"/>
  <path d="M38 36 C38 28 42 24 48 24 C56 24 60 30 58 38 C56 46 48 48 46 56"
        fill="none" stroke="#3a3357" stroke-width="6" stroke-linecap="round"/>
</svg>`;

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sn-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#62d9d0"/><stop offset="100%" stop-color="#2ba49a"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="42" fill="url(#sn-i)"/>
  <path d="M40 36 L52 28 L52 72 L40 64 L30 64 L30 36 Z" fill="#fff"/>
  <path d="M60 38 Q68 50 60 62 M68 30 Q80 50 68 70" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let target = null;
  let busy = false;
  const nextAnimal = cycler(SOUND_ANIMALS);

  preloadSounds(audio);

  const promptArea = document.createElement('div');
  promptArea.className = 'prompt-area';
  const listen = document.createElement('button');
  listen.className = 'big-btn listen-btn';
  listen.innerHTML = EAR_ICON;
  promptArea.appendChild(listen);
  const row = document.createElement('div');
  row.className = 'options-row';
  row.style.flex = '1';
  stage.appendChild(promptArea);
  stage.appendChild(row);

  async function playTarget() {
    if (!target) return;
    listen.classList.add('playing');
    speech.stop();
    await audio.play('animal:' + target.id);
    listen.classList.remove('playing');
  }

  listen.addEventListener('pointerdown', () => { if (!busy) playTarget(); });

  async function newRound(first) {
    if (!alive) return;
    if (!first) await new Promise(r => fadeSwap(row, r));
    if (!alive) return;
    busy = false;
    target = nextAnimal();
    const options = shuffle([target, ...pickN(SOUND_ANIMALS.filter(a => a !== target), 2)]);
    row.innerHTML = '';
    options.forEach(a => {
      const card = document.createElement('button');
      card.className = 'option-card pop-in';
      card.innerHTML = `<img src="${a.art}" alt="${a.name}">`;
      card.addEventListener('pointerdown', async e => {
        if (!alive || busy) return;
        if (a === target) {
          busy = true;
          card.classList.add('zoom-win');
          celebrate.burst(e.clientX, e.clientY, { count: 26 });
          await speech.speak(S.soundsYes(a.name));
          if (!alive) return;
          await audio.play('animal:' + a.id);
          if (!alive) return;
          celebrate.big();
          setTimeout(() => newRound(false), 2000);
        } else {
          card.classList.remove('wiggle');
          void card.offsetWidth;
          card.classList.add('wiggle');
          audio.boing();
          speech.encourage();
        }
      });
      row.appendChild(card);
    });
    if (first) await speech.speak(S.soundsIntro, { interrupt: false });
    await preloadSounds(audio, [target.id]);
    if (alive) playTarget();
  }

  setReprompt(() => {
    speech.speak(S.soundsReprompt).then(() => {
      if (alive && !busy) playTarget();
    });
  });
  newRound(true);
  return () => { alive = false; };
}

export default {
  id: 'sounds',
  title: 'Animal Sounds',
  icon: ICON,
  start,
};
