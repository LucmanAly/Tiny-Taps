// Counting: N animals appear; tap the matching number. After a correct
// answer the app counts along, highlighting each animal one by one.
// Parent-gated toggle switches between counting to 5 and to 10.

import { ANIMALS } from '../data/animals.js';
import { pick, randInt } from '../engine/rand.js';

const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const BTN_COLORS = ['#f04e3e', '#3d7ef0', '#ffb62e', '#4db84d', '#9b5fe0', '#ff8c2e', '#e56b9f', '#2ba49a', '#8a54c9', '#d9620a'];

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cn-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#ffb62e"/><stop offset="100%" stop-color="#e8831a"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="80" height="80" rx="18" fill="url(#cn-i)"/>
  <text x="50" y="66" font-size="44" text-anchor="middle" fill="#fff"
        font-family="Chalkboard SE, Comic Sans MS, sans-serif" font-weight="bold">123</text>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let busy = false;
  let n = 0;
  let animalName = '';
  let max = Number(localStorage.getItem('tinytaps-count-max') || 5);

  const field = document.createElement('div');
  field.className = 'count-field';
  const numbers = document.createElement('div');
  numbers.className = 'number-row';
  stage.appendChild(field);
  stage.appendChild(numbers);

  // parent-gated difficulty toggle (hold 2s)
  const level = document.createElement('button');
  level.className = 'big-btn level-btn';
  const setLevelLabel = () => { level.textContent = `1–${max}`; };
  setLevelLabel();
  let holdTimer = null;
  level.addEventListener('pointerdown', e => {
    e.stopPropagation();
    holdTimer = setTimeout(() => {
      max = max === 5 ? 10 : 5;
      localStorage.setItem('tinytaps-count-max', String(max));
      setLevelLabel();
      audio.chime();
      newRound();
    }, 2000);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev =>
    level.addEventListener(ev, () => clearTimeout(holdTimer)));
  stage.appendChild(level);

  function say() {
    if (n) speech.speak(`How many ${animalName}s do you see? Count them, then tap the number!`);
  }

  async function countAlong() {
    const items = field.querySelectorAll('.count-animal');
    for (let i = 0; i < items.length; i++) {
      if (!alive) return;
      items[i].classList.add('counted');
      audio.pop();
      await speech.speak(WORDS[i + 1], { interrupt: true });
      await new Promise(r => setTimeout(r, 120));
    }
    if (!alive) return;
    await speech.speak(`${WORDS[n]} ${animalName}${n > 1 ? 's' : ''}!`);
    celebrate.big();
    setTimeout(newRound, 2300);
  }

  function newRound() {
    if (!alive) return;
    busy = false;
    n = randInt(1, max);
    const a = pick(ANIMALS);
    animalName = a.name;

    field.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const img = document.createElement('img');
      img.src = a.art;
      img.alt = '';
      img.className = 'count-animal pop-in';
      img.style.animationDelay = `${i * 0.08}s`;
      field.appendChild(img);
    }

    // Only one animal on screen: let it make its sound. With several visible
    // we stay quiet so the child can count in peace.
    if (n === 1 && a.sound) {
      audio.load('animal:' + a.id, a.sound).then(() => {
        if (alive && !busy) audio.play('animal:' + a.id);
      });
    }

    numbers.innerHTML = '';
    for (let i = 1; i <= max; i++) {
      const b = document.createElement('button');
      b.className = 'big-btn num-btn';
      b.textContent = String(i);
      b.style.background = `radial-gradient(circle at 35% 30%, ${BTN_COLORS[i - 1]}dd, ${BTN_COLORS[i - 1]})`;
      b.addEventListener('pointerdown', () => {
        if (!alive || busy) return;
        if (i === n) {
          busy = true;
          audio.chime();
          countAlong();
        } else {
          speech.speak(WORDS[i]).then(() => { if (alive && !busy) speech.encourage(); });
          b.classList.remove('wiggle');
          void b.offsetWidth;
          b.classList.add('wiggle');
        }
      });
      numbers.appendChild(b);
    }
    say();
  }

  setReprompt(say);
  newRound();
  return () => { alive = false; };
}

export default {
  id: 'counting',
  title: 'Counting',
  icon: ICON,
  start,
};
