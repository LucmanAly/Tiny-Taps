// Puzzle Fit: drag each animal piece onto its matching outlined slot.

import { ANIMALS } from '../data/animals.js';
import { shuffle, pickN } from '../engine/rand.js';
import { makeDraggable } from '../engine/drag.js';

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pz-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#7ed67e"/><stop offset="100%" stop-color="#3a9a4a"/>
    </linearGradient>
  </defs>
  <path d="M20 20 H44 C40 12 48 6 53 12 C58 6 66 12 62 20 H84 V42 C92 38 98 46 92 51 C98 56 92 64 84 60 V84 H62 C66 92 58 98 53 92 C48 98 40 92 44 84 H20 V60 C12 64 6 56 12 51 C6 46 12 38 20 42 Z"
        fill="url(#pz-i)"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let remaining = 0;

  const arena = document.createElement('div');
  arena.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;width:100%';
  const board = document.createElement('div');
  board.className = 'puzzle-board';
  arena.appendChild(board);
  const tray = document.createElement('div');
  tray.className = 'puzzle-tray';
  stage.appendChild(arena);
  stage.appendChild(tray);

  function newRound() {
    if (!alive) return;
    board.innerHTML = '';
    tray.innerHTML = '';
    const four = pickN(ANIMALS, 4);
    remaining = 4;

    const slots = new Map();
    four.forEach(a => {
      const slot = document.createElement('div');
      slot.className = 'puzzle-slot pop-in';
      slot.innerHTML = `<img src="${a.art}" alt="">`;
      board.appendChild(slot);
      slots.set(a.id, slot);
    });

    shuffle(four).forEach(a => {
      const piece = document.createElement('div');
      piece.className = 'puzzle-piece pop-in';
      piece.innerHTML = `<img src="${a.art}" alt="${a.name}">`;
      tray.appendChild(piece);
      makeDraggable(piece, {
        getTargets: () => [...slots.entries()]
          .filter(([, s]) => !s.classList.contains('filled'))
          .map(([id, s]) => ({ el: s, data: id })),
        onDrop: hitId => {
          if (!alive || !hitId) return 'reject';
          if (hitId === a.id) {
            const slot = slots.get(a.id);
            slot.classList.add('filled');
            piece.style.visibility = 'hidden';
            audio.chime();
            const r = slot.getBoundingClientRect();
            celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 20 });
            speech.speak(`The ${a.name}!`);
            remaining--;
            if (remaining === 0) {
              setTimeout(() => {
                if (!alive) return;
                celebrate.big();
                setTimeout(newRound, 2400);
              }, 600);
            }
            return 'accept';
          }
          audio.boing();
          speech.encourage();
          return 'reject';
        },
      });
    });
    speech.speak('Put each animal in its spot!');
  }

  setReprompt(() => speech.speak('Drag the animals to their spots!'));
  newRound();
  return () => { alive = false; };
}

export default {
  id: 'puzzle',
  title: 'Puzzle Fit',
  icon: ICON,
  start,
};
