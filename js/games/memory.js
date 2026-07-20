// Matching Pairs: four cards, two animals. Flip two — if they match they
// stay open with a cheer; if not they gently close again. The classic
// first memory game.

import { ANIMALS, preloadSounds } from '../data/animals.js';
import { pickN, shuffle } from '../engine/rand.js';
import { fadeSwap } from '../engine/ui.js';
import { S } from '../data/strings.js';

const COVER_COLORS = [
  ['#ffd54a', '#f0a416'], ['#7ed67e', '#4aa84a'],
  ['#62d9d0', '#2ba49a'], ['#ff9fce', '#e56b9f'],
];

function coverSvg([c1, c2], i) {
  return `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <defs>
      <linearGradient id="mm-${i}" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#mm-${i})"/>
    <circle cx="24" cy="26" r="5" fill="#fff" opacity="0.35"/>
    <circle cx="78" cy="72" r="7" fill="#fff" opacity="0.25"/>
    <path d="M50 30 L56 44 L71 44 L59 53 L64 68 L50 59 L36 68 L41 53 L29 44 L44 44 Z"
          fill="#ffffff" opacity="0.85"/>
  </svg>`;
}

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mm-i1" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#ffd54a"/><stop offset="100%" stop-color="#f0a416"/>
    </linearGradient>
    <linearGradient id="mm-i2" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#62d9d0"/><stop offset="100%" stop-color="#2ba49a"/>
    </linearGradient>
  </defs>
  <rect x="8" y="14" width="40" height="52" rx="10" fill="url(#mm-i1)" transform="rotate(-8 28 40)"/>
  <rect x="52" y="30" width="40" height="52" rx="10" fill="url(#mm-i2)" transform="rotate(8 72 56)"/>
  <path d="M28 32 L32 42 L42 42 L34 48 L37 58 L28 52 L19 58 L22 48 L14 42 L24 42 Z" fill="#fff" opacity="0.9"/>
  <path d="M72 48 L76 58 L86 58 L78 64 L81 74 L72 68 L63 74 L66 64 L58 58 L68 58 Z" fill="#fff" opacity="0.9"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let open = [];
  let lock = false;
  let matched = 0;

  const grid = document.createElement('div');
  grid.className = 'memory-grid';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;width:100%';
  wrap.appendChild(grid);
  stage.appendChild(wrap);

  function newRound(first) {
    const build = () => {
      if (!alive) return;
      open = [];
      lock = false;
      matched = 0;
      grid.innerHTML = '';
      const pair = pickN(ANIMALS, 2);
      preloadSounds(audio, pair.filter(a => a.sound).map(a => a.id));
      const cards = shuffle([pair[0], pair[1], pair[0], pair[1]]);
      cards.forEach((a, i) => {
        const tile = document.createElement('div');
        tile.className = 'peek-tile memory-card pop-in';
        tile.style.animationDelay = `${i * 0.08}s`;
        tile.innerHTML = `<img src="${a.art}" alt=""><div class="peek-cover">${coverSvg(COVER_COLORS[i % COVER_COLORS.length], i)}</div>`;
        const cover = tile.querySelector('.peek-cover');
        tile.addEventListener('pointerdown', () => {
          if (!alive || lock || cover.classList.contains('off')) return;
          cover.classList.add('off');
          audio.pop();
          open.push({ a, cover, tile });
          if (open.length < 2) return;
          const [x, y] = open;
          open = [];
          if (x.a.id === y.a.id) {
            matched++;
            audio.chime();
            const r = y.tile.getBoundingClientRect();
            celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 20 });
            speech.speak(S.memoryMatch(x.a.name));
            if (x.a.sound) audio.play('animal:' + x.a.id);
            if (matched === 2) {
              setTimeout(() => {
                if (!alive) return;
                celebrate.big();
                setTimeout(() => { if (alive) newRound(false); }, 2400);
              }, 800);
            }
          } else {
            lock = true;
            setTimeout(() => { audio.boing(); speech.encourage(); }, 250);
            setTimeout(() => {
              if (!alive) return;
              x.cover.classList.remove('off');
              y.cover.classList.remove('off');
              lock = false;
            }, 1000);
          }
        });
        grid.appendChild(tile);
      });
      speech.speak(S.memoryIntro, { interrupt: !first });
    };
    if (first) build();
    else fadeSwap(grid, build);
  }

  setReprompt(() => speech.speak(S.memoryReprompt));
  newRound(true);
  return () => { alive = false; };
}

export default {
  id: 'memory',
  title: 'Matching',
  icon: ICON,
  start,
};
