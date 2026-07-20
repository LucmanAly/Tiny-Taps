// Feed Me: drag the right food to the hungry animal. Wrong food gently
// bounces back; the right food is eaten once with a happy reaction, then the
// next animal comes along.

import { animal, food, DIET, FOODS } from '../data/animals.js';
import { shuffle, pickN, cycler } from '../engine/rand.js';
import { makeDraggable } from '../engine/drag.js';
import { fadeSwap } from '../engine/ui.js';
import { S } from '../data/strings.js';

const PAIR_IDS = Object.keys(DIET);

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fm-i" cx="40%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#fffdf4"/><stop offset="100%" stop-color="#dcc691"/>
    </radialGradient>
  </defs>
  <g transform="rotate(-25 50 50)">
    <rect x="30" y="43" width="40" height="14" rx="7" fill="url(#fm-i)"/>
    <circle cx="30" cy="43" r="10" fill="url(#fm-i)"/>
    <circle cx="30" cy="57" r="10" fill="url(#fm-i)"/>
    <circle cx="70" cy="43" r="10" fill="url(#fm-i)"/>
    <circle cx="70" cy="57" r="10" fill="url(#fm-i)"/>
  </g>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let current = null;
  let fed = false;
  const nextPair = cycler(PAIR_IDS);

  const arena = document.createElement('div');
  arena.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;width:100%';
  const animalImg = document.createElement('img');
  animalImg.className = 'feed-animal';
  animalImg.alt = '';
  arena.appendChild(animalImg);
  const tray = document.createElement('div');
  tray.className = 'food-tray';
  stage.appendChild(arena);
  stage.appendChild(tray);

  function say(first) {
    if (current) speech.speak(S.feedHungry(current.name), { interrupt: false });
  }

  function fillTray() {
    tray.innerHTML = '';
    const correct = food(DIET[current.id]);
    const options = shuffle([correct, ...pickN(FOODS.filter(f => f.id !== correct.id), 2)]);
    options.forEach(f => {
      const item = document.createElement('div');
      item.className = 'food-item pop-in';
      item.innerHTML = `<img src="${f.art}" alt="${f.name}">`;
      tray.appendChild(item);
      makeDraggable(item, {
        getTargets: () => [{ el: animalImg, data: 'animal' }],
        autoCompleteIfCorrect: f === correct ? () => !fed : null,
        autoCompleteTarget: f === correct ? () => ({ el: animalImg, data: 'animal' }) : null,
        onDrop: hit => {
          if (!alive || fed || !hit) return 'reject';
          if (f === correct) {
            fed = true;
            item.classList.add('eaten');
            audio.chomp();
            animalImg.classList.remove('munch');
            void animalImg.offsetWidth;
            animalImg.classList.add('munch');
            setTimeout(async () => {
              if (!alive) return;
              const r = animalImg.getBoundingClientRect();
              celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 30 });
              await speech.speak(S.feedYum(current.name));
              if (!alive) return;
              if (current.sound) await audio.play('animal:' + current.id, { maxDuration: 2.2 });
              if (!alive) return;
              const upcoming = animal(nextPair());
              celebrate.big({ nextAnimalId: upcoming.id });
              setTimeout(() => newRound(false, upcoming), 900);
            }, 550);
            return 'accept';
          }
          audio.boing();
          speech.speak(S.feedNo(current.name)).then(() => { if (alive) speech.encourage(); });
          return 'reject';
        },
      });
    });
  }

  function newRound(first, preset) {
    const build = () => {
    if (!alive) return;
    fed = false;
    current = preset || animal(nextPair());
    animalImg.src = current.art;
    animalImg.classList.remove('munch', 'pop-in', 'slide-in');
    void animalImg.offsetWidth;
    animalImg.classList.add('slide-in');
    if (current.sound) {
      audio.load('animal:' + current.id, current.sound).then(() => {
        if (alive && current) audio.play('animal:' + current.id, { maxDuration: 2.2 });
      });
    }
    fillTray();
    say(first);
    };
    if (first) build();
    else fadeSwap(tray, build);
  }

  setReprompt(() => {
    if (current) speech.speak(S.feedReprompt(current.name));
  });
  newRound(true);
  return () => { alive = false; };
}

export default {
  id: 'feedme',
  title: 'Feed Me',
  icon: ICON,
  start,
};
