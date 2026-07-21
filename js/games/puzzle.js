// Puzzle Fit 3.1: classic animal silhouettes plus a spatial-pattern mode.
// Shapes mode presents a 3×3 alternating block pattern with one gap; the
// child drags the block that preserves the pattern into the missing space.

import { ANIMALS } from '../data/animals.js';
import { shuffle, pickN, randInt } from '../engine/rand.js';
import { makeDraggable } from '../engine/drag.js';
import { fadeSwap } from '../engine/ui.js';

const MODE_KEY = 'tinytaps-puzzle-mode';

const BLOCKS = [
  { id: 'red-circle', shape: 'circle', color: '#f04e3e' },
  { id: 'blue-square', shape: 'square', color: '#3d7ef0' },
  { id: 'yellow-triangle', shape: 'triangle', color: '#ffcf3d' },
  { id: 'green-diamond', shape: 'diamond', color: '#4db84d' },
  { id: 'purple-star', shape: 'star', color: '#9b5fe0' },
  { id: 'orange-hexagon', shape: 'hexagon', color: '#ff8c2e' },
];

function blockSvg(block) {
  const shapes = {
    circle: '<circle cx="50" cy="50" r="34"/>',
    square: '<rect x="17" y="17" width="66" height="66" rx="8"/>',
    triangle: '<path d="M50 12 L90 84 H10 Z"/>',
    diamond: '<path d="M50 8 L92 50 L50 92 L8 50 Z"/>',
    star: '<path d="M50 7 L61 38 L94 38 L67 57 L78 90 L50 70 L22 90 L33 57 L6 38 L39 38 Z"/>',
    hexagon: '<path d="M25 12 H75 L94 50 L75 88 H25 L6 50 Z"/>',
  };
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="${block.color}" stroke="#fff" stroke-width="4" stroke-linejoin="round">${shapes[block.shape]}</g></svg>`;
}

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="pz-i" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0%" stop-color="#7ed67e"/><stop offset="100%" stop-color="#3a9a4a"/></linearGradient></defs>
  <path d="M20 20 H44 C40 12 48 6 53 12 C58 6 66 12 62 20 H84 V42 C92 38 98 46 92 51 C98 56 92 64 84 60 V84 H60 C64 92 56 98 51 92 C46 98 38 92 42 84 H20 V60 C12 64 6 56 12 51 C6 46 12 38 20 42 Z" fill="url(#pz-i)"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt, recordOutcome } = ctx;
  let alive = true;
  let mode = localStorage.getItem(MODE_KEY) === 'shapes' ? 'shapes' : 'animals';
  let epoch = 0;

  const shell = document.createElement('div');
  shell.className = 'puzzle-shell';
  shell.innerHTML = '<div class="puzzle-tabs" role="group" aria-label="Puzzle type"></div><div class="puzzle-content"></div>';
  stage.appendChild(shell);
  const tabs = shell.querySelector('.puzzle-tabs');
  const content = shell.querySelector('.puzzle-content');

  [['animals', 'Animals'], ['shapes', 'Shapes']].forEach(([id, label]) => {
    const button = document.createElement('button');
    button.className = 'puzzle-tab';
    button.dataset.mode = id;
    button.textContent = label;
    button.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (mode === id) return;
      mode = id;
      epoch++;
      localStorage.setItem(MODE_KEY, mode);
      audio.pop();
      newRound(true);
    });
    tabs.appendChild(button);
  });

  function markMode() {
    tabs.querySelectorAll('.puzzle-tab').forEach(b =>
      b.classList.toggle('selected', b.dataset.mode === mode));
  }

  function buildAnimals(roundEpoch) {
    let remaining = 4;
    const four = pickN(ANIMALS, 4);
    content.innerHTML = '<div class="puzzle-board"></div><div class="puzzle-tray"></div>';
    const board = content.querySelector('.puzzle-board');
    const tray = content.querySelector('.puzzle-tray');
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
          .filter(([, slot]) => !slot.classList.contains('filled'))
          .map(([id, slot]) => ({ el: slot, data: id })),
        onDrop: hitId => {
          if (!alive || epoch !== roundEpoch || !hitId) return 'reject';
          if (hitId !== a.id) {
            if (recordOutcome) recordOutcome(false, `animal:${a.name}`);
            audio.boing();
            speech.encourage();
            return 'reject';
          }
          if (recordOutcome) recordOutcome(true, `animal:${a.name}`);
          const slot = slots.get(a.id);
          slot.classList.add('filled');
          piece.style.visibility = 'hidden';
          audio.chime();
          const r = slot.getBoundingClientRect();
          celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 18 });
          remaining--;
          if (remaining === 0) {
            setTimeout(() => {
              if (!alive || epoch !== roundEpoch) return;
              celebrate.big();
              setTimeout(() => { if (alive && epoch === roundEpoch) newRound(false); }, 800);
            }, 400);
          }
          return 'accept';
        },
      });
    });
  }

  function buildShapes(roundEpoch) {
    const [a, b] = pickN(BLOCKS, 2);
    const missing = randInt(0, 8);
    const expected = (Math.floor(missing / 3) + (missing % 3)) % 2 === 0 ? a : b;
    const distractors = pickN(BLOCKS.filter(x => x.id !== expected.id), 2);
    content.innerHTML = '<div class="spatial-title">Complete the pattern</div><div class="spatial-board"></div><div class="spatial-tray"></div>';
    const board = content.querySelector('.spatial-board');
    const tray = content.querySelector('.spatial-tray');
    let gap = null;

    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'spatial-cell pop-in';
      if (i === missing) {
        cell.classList.add('spatial-gap');
        cell.innerHTML = '<span>?</span>';
        gap = cell;
      } else {
        const token = (Math.floor(i / 3) + (i % 3)) % 2 === 0 ? a : b;
        cell.innerHTML = blockSvg(token);
      }
      board.appendChild(cell);
    }

    shuffle([expected, ...distractors]).forEach(token => {
      const piece = document.createElement('div');
      piece.className = 'spatial-piece pop-in';
      piece.innerHTML = blockSvg(token);
      tray.appendChild(piece);
      makeDraggable(piece, {
        getTargets: () => [{ el: gap, data: 'gap' }],
        onDrop: hit => {
          if (!alive || epoch !== roundEpoch || !hit) return 'reject';
          if (token.id !== expected.id) {
            if (recordOutcome) recordOutcome(false, `shape:${expected.id}`);
            audio.boing();
            speech.encourage();
            return 'reject';
          }
          if (recordOutcome) recordOutcome(true, `shape:${expected.id}`);
          gap.classList.add('filled');
          gap.innerHTML = blockSvg(expected);
          piece.style.visibility = 'hidden';
          audio.chime();
          const r = gap.getBoundingClientRect();
          celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 28 });
          setTimeout(() => {
            if (!alive || epoch !== roundEpoch) return;
            celebrate.big({ quick: false });
            setTimeout(() => { if (alive && epoch === roundEpoch) newRound(false); }, 800);
          }, 350);
          return 'accept';
        },
      });
    });
  }

  function newRound(first) {
    const roundEpoch = ++epoch;
    const build = () => {
      if (!alive || epoch !== roundEpoch) return;
      markMode();
      if (mode === 'animals') buildAnimals(roundEpoch);
      else buildShapes(roundEpoch);
    };
    if (first || !content.children.length) build();
    else fadeSwap(content, build);
  }

  setReprompt(null);
  newRound(true);
  return () => { alive = false; epoch++; };
}

export default { id: 'puzzle', title: 'Puzzle Fit', icon: ICON, start };
