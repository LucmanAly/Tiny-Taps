// Peekaboo: every tap is a win. Tap a covered tile to reveal an animal and
// hear its real sound.

import { ANIMALS, preloadSounds } from '../data/animals.js';
import { pickN } from '../engine/rand.js';

const COVER_COLORS = [
  ['#ff8a70', '#e85c40'], ['#ffd54a', '#f0a416'], ['#7ed67e', '#4aa84a'],
  ['#62d9d0', '#2ba49a'], ['#b98aef', '#8a54c9'], ['#ff9fce', '#e56b9f'],
];

function coverSvg([c1, c2]) {
  return `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="cv-${c1.slice(1)}" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#cv-${c1.slice(1)})"/>
    <circle cx="22" cy="24" r="5" fill="#ffffff" opacity="0.35"/>
    <circle cx="80" cy="70" r="7" fill="#ffffff" opacity="0.25"/>
    <circle cx="70" cy="20" r="3.5" fill="#ffffff" opacity="0.3"/>
    <circle cx="24" cy="78" r="4" fill="#ffffff" opacity="0.3"/>
    <text x="50" y="66" font-size="46" text-anchor="middle" fill="#ffffff"
          font-family="Chalkboard SE, Comic Sans MS, sans-serif" font-weight="bold">?</text>
  </svg>`;
}

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pk-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#b98aef"/><stop offset="100%" stop-color="#8a54c9"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="80" height="80" rx="18" fill="url(#pk-i)"/>
  <circle cx="30" cy="30" r="4" fill="#fff" opacity="0.4"/>
  <circle cx="74" cy="68" r="5" fill="#fff" opacity="0.3"/>
  <text x="50" y="68" font-size="48" text-anchor="middle" fill="#fff"
        font-family="Chalkboard SE, Comic Sans MS, sans-serif" font-weight="bold">?</text>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let revealed = 0;

  const grid = document.createElement('div');
  grid.className = 'peek-grid';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;width:100%';
  wrap.appendChild(grid);
  stage.appendChild(wrap);

  function newRound(first) {
    revealed = 0;
    grid.innerHTML = '';
    const six = pickN(ANIMALS, 6);
    preloadSounds(audio, six.map(a => a.id));
    six.forEach((a, i) => {
      const tile = document.createElement('div');
      tile.className = 'peek-tile pop-in';
      tile.innerHTML = `<img src="${a.art}" alt=""><div class="peek-cover">${coverSvg(COVER_COLORS[i % COVER_COLORS.length])}</div>`;
      const cover = tile.querySelector('.peek-cover');
      tile.addEventListener('pointerdown', async () => {
        if (!alive || cover.classList.contains('off')) return;
        cover.classList.add('off');
        revealed++;
        const done = revealed === 6;
        const r = tile.getBoundingClientRect();
        celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 18 });
        speech.stop();
        if (a.sound) await audio.play('animal:' + a.id);
        if (!alive) return;
        speech.speak(`A ${a.name}!`);
        if (done) {
          setTimeout(() => {
            if (!alive) return;
            celebrate.big();
            setTimeout(() => { if (alive) newRound(false); }, 2300);
          }, 900);
        }
      });
      grid.appendChild(tile);
    });
    speech.speak(first ? 'Peekaboo! Who is hiding? Tap and see!' : 'More friends are hiding! Tap and see!');
  }

  setReprompt(() => speech.speak('Tap a square! Who is hiding?'));
  newRound(true);

  return () => { alive = false; };
}

export default {
  id: 'peekaboo',
  title: 'Peekaboo',
  icon: ICON,
  start,
};
