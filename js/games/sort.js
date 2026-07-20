// Sort It: drag each animal to its home — the farm, the water, or the
// jungle. Categorization, the biggest untouched cognitive skill in the app.

import { ANIMALS, preloadSounds } from '../data/animals.js';
import { cycler, pickN } from '../engine/rand.js';
import { makeDraggable } from '../engine/drag.js';
import { fadeSwap } from '../engine/ui.js';
import { S } from '../data/strings.js';

const nextAnimal = cycler(ANIMALS);

const BARN_SVG = `
<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 96 L10 48 L60 14 L110 48 L110 96 Z" fill="#e0685a"/>
  <path d="M10 48 L60 14 L110 48 L100 48 L60 22 L20 48 Z" fill="#c04a3e"/>
  <rect x="46" y="58" width="28" height="38" rx="2" fill="#7a4a2a"/>
  <circle cx="66" cy="78" r="2.4" fill="#4a2c18"/>
  <rect x="18" y="60" width="18" height="18" rx="2" fill="#fffaf0" opacity="0.9"/>
  <path d="M18 69 H36 M27 60 V78" stroke="#c04a3e" stroke-width="2"/>
  <rect x="84" y="60" width="18" height="18" rx="2" fill="#fffaf0" opacity="0.9"/>
  <path d="M84 69 H102 M93 60 V78" stroke="#c04a3e" stroke-width="2"/>
  <path d="M60 14 L60 4" stroke="#8a5a3c" stroke-width="3" stroke-linecap="round"/>
  <circle cx="60" cy="3" r="3.2" fill="#ffcf3d"/>
</svg>`;

const POND_SVG = `
<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
  <ellipse cx="60" cy="60" rx="54" ry="34" fill="#5eb8e0"/>
  <ellipse cx="60" cy="56" rx="46" ry="26" fill="#7ecdf0"/>
  <path d="M30 56 q6 -6 12 0 q6 6 12 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
  <path d="M64 68 q6 -6 12 0 q6 6 12 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.6"/>
  <ellipse cx="82" cy="42" rx="14" ry="8" fill="#5aa84a"/>
  <ellipse cx="30" cy="76" rx="10" ry="6" fill="#5aa84a"/>
  <circle cx="86" cy="40" r="3" fill="#ff9fce"/>
</svg>`;

const JUNGLE_SVG = `
<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="70" width="120" height="30" fill="#6fae4a"/>
  <rect x="34" y="46" width="10" height="40" rx="3" fill="#8a6a3c"/>
  <path d="M39 46 C20 40 10 24 8 12 C24 16 36 28 40 44 Z" fill="#4a9a3a"/>
  <path d="M39 46 C58 38 68 22 70 10 C54 14 42 26 38 44 Z" fill="#5aad42"/>
  <path d="M39 44 C22 46 8 42 2 34 C16 30 32 32 40 42 Z" fill="#3f8f32"/>
  <rect x="82" y="52" width="9" height="34" rx="3" fill="#8a6a3c"/>
  <path d="M86.5 52 C70 46 60 32 58 22 C74 26 84 36 88 50 Z" fill="#5aad42"/>
  <path d="M86.5 52 C102 44 110 30 110 18 C96 24 88 34 84 50 Z" fill="#4a9a3a"/>
  <circle cx="20" cy="80" r="6" fill="#ffcf3d"/>
  <circle cx="100" cy="82" r="5" fill="#ff9fce"/>
</svg>`;

const BINS = [
  { habitat: 'farm', label: 'Farm', svg: BARN_SVG },
  { habitat: 'water', label: 'Water', svg: POND_SVG },
  { habitat: 'wild', label: 'Jungle', svg: JUNGLE_SVG },
];

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="so-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#7ed67e"/><stop offset="100%" stop-color="#3a9a4a"/>
    </linearGradient>
  </defs>
  <rect x="8" y="52" width="38" height="38" rx="10" fill="url(#so-i)"/>
  <circle cx="73" cy="35" r="24" fill="#62d9d0"/>
  <path d="M50 68 L64 60 L64 76 Z" fill="#8a8098"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let current = null;
  let placed = false;

  const bins = document.createElement('div');
  bins.className = 'sort-bins';
  const tray = document.createElement('div');
  tray.className = 'sort-tray';

  stage.appendChild(bins);
  stage.appendChild(tray);

  function newRound(first, preset) {
    const build = () => {
      if (!alive) return;
      placed = false;
      current = preset || nextAnimal();

      // Two bins per round (one always the correct home, one a random
      // distractor from the other two) — three environments total to keep
      // learning it, without crowding every round with all three at once.
      const correctBin = BINS.find(b => b.habitat === current.habitat);
      const distractor = pickN(BINS.filter(b => b !== correctBin), 1)[0];
      const roundBins = Math.random() < 0.5 ? [correctBin, distractor] : [distractor, correctBin];
      bins.innerHTML = '';
      const binEls = roundBins.map(b => {
        const el = document.createElement('div');
        el.className = 'sort-bin pop-in';
        el.innerHTML = `${b.svg}<div class="sort-bin-label">${b.label}</div>`;
        bins.appendChild(el);
        return el;
      });

      tray.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'sort-item pop-in';
      item.innerHTML = `<img src="${current.art}" alt="${current.name}">`;
      tray.appendChild(item);

      if (current.sound) preloadSounds(audio, [current.id]);

      makeDraggable(item, {
        getTargets: () => roundBins.map((b, i) => ({ el: binEls[i], data: b.habitat })),
        onDrop: hit => {
          if (!alive || placed || !hit) return 'reject';
          if (hit === current.habitat) {
            placed = true;
            audio.chime();
            const target = binEls[roundBins.findIndex(b => b.habitat === hit)];
            const r = target.getBoundingClientRect();
            celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 24 });
            (async () => {
              if (current.sound) await audio.play('animal:' + current.id, { maxDuration: 2.2 });
              if (!alive) return;
              const upcoming = nextAnimal();
              celebrate.big({ nextAnimalId: upcoming.id });
              setTimeout(() => newRound(false, upcoming), 900);
            })();
            return 'accept';
          }
          audio.boing();
          speech.encourage();
          return 'reject';
        },
      });

      speech.speak(S.sortIntro, { interrupt: false });
    };
    if (first) build();
    else fadeSwap(tray, build);
  }

  setReprompt(() => speech.speak(S.sortReprompt));
  newRound(true);
  return () => { alive = false; };
}

export default {
  id: 'sort',
  title: 'Sort It',
  icon: ICON,
  start,
};
