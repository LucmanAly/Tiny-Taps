// Counting: counting is touching, not quizzing. The child taps the animals
// themselves; every tap instantly counts aloud, stamps a number badge on the
// animal, and grows a big numeral up top. Tapping the last one celebrates the
// total and the next round starts by itself — no number buttons, no wrong
// answers, no waiting on speech.
// Parent-gated toggle (hold 2s) switches between counting to 5 and to 10.

import { ANIMALS } from '../data/animals.js';
import { pick, randInt } from '../engine/rand.js';
import { fadeSwap } from '../engine/ui.js';
import { S } from '../data/strings.js';

const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

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
  let n = 0;
  let counted = 0;
  let animalName = '';
  let max = Number(localStorage.getItem('tinytaps-count-max') || 5);

  const bigNum = document.createElement('div');
  bigNum.className = 'count-big';
  const field = document.createElement('div');
  field.className = 'count-field';
  stage.appendChild(bigNum);
  stage.appendChild(field);

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

  function newRound(first) {
    const build = () => {
    if (!alive) return;
    counted = 0;
    n = randInt(1, max);
    const a = pick(ANIMALS);
    animalName = a.name;

    bigNum.textContent = '';
    bigNum.classList.remove('total');
    field.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const item = document.createElement('div');
      item.className = 'count-item pop-in';
      item.style.animationDelay = `${i * 0.07}s`;
      item.innerHTML = `<img src="${a.art}" alt=""><div class="count-badge"></div>`;
      item.addEventListener('pointerdown', () => {
        if (!alive || item.classList.contains('counted')) return;
        counted++;
        item.classList.add('counted');
        item.querySelector('.count-badge').textContent = String(counted);
        audio.pop();
        bigNum.textContent = String(counted);
        bigNum.classList.remove('bump');
        void bigNum.offsetWidth;
        bigNum.classList.add('bump');
        // Never awaited: the game must keep up with fast little fingers.
        speech.speak(WORDS[counted]);
        if (counted === n) {
          setTimeout(() => {
            if (!alive) return;
            bigNum.classList.add('total');
            speech.speak(S.countTotal(WORDS[n], animalName, n > 1));
            celebrate.big({ praise: false });
            setTimeout(() => newRound(false), 2600);
          }, 450);
        }
      });
      field.appendChild(item);
    }

    // Only one animal on screen: let it make its sound. With several visible
    // we stay quiet so the counting voice has the stage.
    if (n === 1 && a.sound) {
      audio.load('animal:' + a.id, a.sound).then(() => {
        if (alive && counted === 0) audio.play('animal:' + a.id);
      });
    }

    speech.speak(S.countIntro(animalName), { interrupt: !first });
    };
    if (first) build();
    else fadeSwap(field, build);
  }

  setReprompt(() => {
    if (animalName) speech.speak(S.countReprompt(animalName));
  });
  newRound(true);
  return () => { alive = false; };
}

export default {
  id: 'counting',
  title: 'Counting',
  icon: ICON,
  start,
};
