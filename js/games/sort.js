// Sort It: drag each animal to its home — the barn or the pond.
// Categorization, the biggest untouched cognitive skill in the app.

import { ANIMALS, preloadSounds } from '../data/animals.js';
import { cycler } from '../engine/rand.js';
import { makeDraggable } from '../engine/drag.js';
import { fadeSwap } from '../engine/ui.js';
import { S } from '../data/strings.js';

const POOL = ANIMALS.filter(a => a.habitat === 'farm' || a.habitat === 'water');
const nextAnimal = cycler(POOL);

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
  const barn = document.createElement('div');
  barn.className = 'sort-bin';
  barn.innerHTML = `${BARN_SVG}<div class="sort-bin-label">Farm</div>`;
  const pond = document.createElement('div');
  pond.className = 'sort-bin';
  pond.innerHTML = `${POND_SVG}<div class="sort-bin-label">Water</div>`;
  bins.appendChild(barn);
  bins.appendChild(pond);

  const tray = document.createElement('div');
  tray.className = 'sort-tray';

  stage.appendChild(bins);
  stage.appendChild(tray);

  function newRound(first) {
    const build = () => {
      if (!alive) return;
      placed = false;
      current = nextAnimal();
      tray.innerHTML = '';
      const item = document.createElement('div');
      item.className = 'sort-item pop-in';
      item.innerHTML = `<img src="${current.art}" alt="${current.name}">`;
      tray.appendChild(item);

      if (current.sound) preloadSounds(audio, [current.id]);

      makeDraggable(item, {
        getTargets: () => [
          { el: barn, data: 'farm' },
          { el: pond, data: 'water' },
        ],
        onDrop: hit => {
          if (!alive || placed || !hit) return 'reject';
          if (hit === current.habitat) {
            placed = true;
            audio.chime();
            const target = hit === 'farm' ? barn : pond;
            const r = target.getBoundingClientRect();
            celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 24 });
            speech.speak(S.sortYes(current.name)).then(async () => {
              if (!alive) return;
              if (current.sound) await audio.play('animal:' + current.id);
              if (!alive) return;
              celebrate.big();
              setTimeout(() => newRound(false), 2200);
            });
            return 'accept';
          }
          audio.boing();
          speech.speak(S.sortNo).then(() => { if (alive) speech.encourage(); });
          return 'reject';
        },
      });

      speech.speak(S.sortIntro, { interrupt: !first });
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
