// Feed Me: drag the right food to the hungry animal. Wrong food gently
// bounces back. While still hungry the app says "More!".

import { animal, food, DIET } from '../data/animals.js';
import { shuffle, pickN, randInt, cycler } from '../engine/rand.js';
import { makeDraggable } from '../engine/drag.js';

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
  let hunger = 0;
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

  function say() {
    if (current) speech.speak(`The ${current.name} is hungry! Feed the ${current.name}!`);
  }

  function fillTray() {
    tray.innerHTML = '';
    const correct = food(DIET[current.id]);
    const options = shuffle([correct, ...pickN(
      Object.values(DIET).filter(f => f !== correct.id).map(food), 2)]);
    options.forEach(f => {
      const item = document.createElement('div');
      item.className = 'food-item pop-in';
      item.innerHTML = `<img src="${f.art}" alt="${f.name}">`;
      tray.appendChild(item);
      makeDraggable(item, {
        getTargets: () => [{ el: animalImg, data: 'animal' }],
        onDrop: hit => {
          if (!alive || !hit) return 'reject';
          if (f === correct) {
            item.classList.add('eaten');
            audio.chomp();
            animalImg.classList.remove('munch');
            void animalImg.offsetWidth;
            animalImg.classList.add('munch');
            hunger--;
            setTimeout(() => {
              if (!alive) return;
              if (hunger > 0) {
                speech.speak('More!');
                audio.play('animal:' + current.id);
                fillTray();
              } else {
                const r = animalImg.getBoundingClientRect();
                celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 30 });
                speech.speak(`Yum yum! The ${current.name} is all full!`);
                celebrate.big({ praise: false });
                setTimeout(newRound, 2400);
              }
            }, 550);
            return 'accept';
          }
          audio.boing();
          speech.speak(`No no, the ${current.name} does not eat that! Try again!`);
          return 'reject';
        },
      });
    });
  }

  function newRound() {
    if (!alive) return;
    current = animal(nextPair());
    hunger = randInt(2, 3);
    animalImg.src = current.art;
    animalImg.classList.remove('munch', 'pop-in');
    void animalImg.offsetWidth;
    animalImg.classList.add('pop-in');
    audio.load('animal:' + current.id, current.sound).then(() => {
      if (alive && current) audio.play('animal:' + current.id);
    });
    fillTray();
    say();
  }

  setReprompt(() => {
    if (current) speech.speak(`Drag the food to the ${current.name}'s mouth!`);
  });
  newRound();
  return () => { alive = false; };
}

export default {
  id: 'feedme',
  title: 'Feed Me',
  icon: ICON,
  start,
};
