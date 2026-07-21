// Puzzle Fit: classic animal silhouettes plus a negative-space picture mode.
// In Shapes mode, one geometric piece is cut out of a large familiar picture;
// the child chooses the one piece whose outline exactly fills that gap.

import { ANIMALS } from '../data/animals.js';
import { shuffle, pickN, cycler } from '../engine/rand.js';
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

const PICTURE_PUZZLES = [
  {
    id: 'robot', title: 'Fix the robot', answer: 'circle', color: '#ffcf3d',
    art: '<rect x="72" y="42" width="156" height="164" rx="24" fill="#7fb3ff"/><rect x="102" y="12" width="96" height="44" rx="18" fill="#9b5fe0"/><circle cx="112" cy="92" r="12" fill="#3a3357"/><circle cx="188" cy="92" r="12" fill="#3a3357"/><path d="M108 148 H192" stroke="#fff" stroke-width="12" stroke-linecap="round"/><path d="M72 102 L38 142 M228 102 L262 142 M105 205 L92 230 M195 205 L208 230" stroke="#5b83c6" stroke-width="18" stroke-linecap="round"/>',
    gap: '<circle cx="150" cy="148" r="30"/>',
  },
  {
    id: 'house', title: 'Fix the house', answer: 'square', color: '#ffd8a8',
    art: '<path d="M42 112 L150 24 L258 112" fill="#f06f61" stroke="#d94c43" stroke-width="8" stroke-linejoin="round"/><rect x="62" y="106" width="176" height="122" rx="8" fill="#ffcf66"/><rect x="128" y="160" width="44" height="68" rx="6" fill="#8a5a3c"/><circle cx="160" cy="194" r="4" fill="#ffd54a"/>',
    gap: '<rect x="82" y="126" width="54" height="54" rx="5"/>',
  },
  {
    id: 'boat', title: 'Fix the sailboat', answer: 'triangle', color: '#fff4b5',
    art: '<path d="M54 160 H250 L220 210 H88 Z" fill="#ef765d"/><path d="M150 36 V166" stroke="#7b5a44" stroke-width="10" stroke-linecap="round"/><path d="M150 44 L244 148 H150 Z" fill="#76b9f4"/><path d="M40 224 Q78 204 116 224 T192 224 T268 224" fill="none" stroke="#5fc9e8" stroke-width="12" stroke-linecap="round"/>',
    gap: '<path d="M140 52 L140 146 L62 146 Z"/>',
  },
  {
    id: 'kite', title: 'Fix the kite', answer: 'diamond', color: '#ff8a70',
    art: '<path d="M150 28 L242 112 L150 196 L58 112 Z" fill="#9b5fe0" stroke="#7040aa" stroke-width="7"/><path d="M150 196 Q190 210 164 226 Q140 240 188 252" fill="none" stroke="#6b6389" stroke-width="7" stroke-linecap="round"/><path d="M180 222 L194 208 L202 230 Z M162 244 L174 232 L184 252 Z" fill="#ffcf3d"/>',
    gap: '<path d="M150 70 L194 112 L150 154 L106 112 Z"/>',
  },
  {
    id: 'night', title: 'Fix the night sky', answer: 'star', color: '#ffdf4d',
    art: '<rect x="28" y="26" width="244" height="202" rx="34" fill="#5168b8"/><path d="M102 70 Q70 120 112 158 Q145 188 190 158 Q140 166 122 126 Q108 96 128 62 Q112 62 102 70 Z" fill="#f7efc2"/><circle cx="224" cy="74" r="7" fill="#fff"/><circle cx="70" cy="184" r="5" fill="#fff"/>',
    gap: '<path d="M208 116 L218 142 L246 142 L224 158 L232 184 L208 168 L184 184 L192 158 L170 142 L198 142 Z"/>',
  },
  {
    id: 'hive', title: 'Fix the beehive', answer: 'hexagon', color: '#ffbd3f',
    art: '<path d="M82 210 Q50 174 68 134 Q48 96 84 76 Q94 36 138 42 Q170 18 198 52 Q238 54 236 96 Q266 122 242 154 Q254 196 214 214 Z" fill="#f4a72c" stroke="#d88818" stroke-width="8"/><path d="M78 104 H232 M68 146 H244 M84 186 H226" stroke="#ffd36f" stroke-width="10"/><path d="M126 210 Q126 162 174 162 Q222 162 222 210" fill="#6b4324"/>',
    gap: '<path d="M112 86 H148 L166 116 L148 146 H112 L94 116 Z"/>',
  },
];

const nextPicture = cycler(PICTURE_PUZZLES);

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

function pictureSvg(puzzle) {
  return `<svg class="fit-picture-svg" viewBox="0 0 300 260" xmlns="http://www.w3.org/2000/svg">
    ${puzzle.art}
    <g class="fit-gap-target" fill="#fff" stroke="#3a3357" stroke-width="6" stroke-dasharray="8 7" stroke-linejoin="round">
      ${puzzle.gap}
    </g>
  </svg>`;
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
    const puzzle = nextPicture();
    const expected = BLOCKS.find(block => block.shape === puzzle.answer);
    const distractors = pickN(BLOCKS.filter(x => x.id !== expected.id), 2);
    content.innerHTML = `<div class="fit-title">${puzzle.title}</div><div class="fit-picture pop-in">${pictureSvg(puzzle)}</div><div class="fit-tray"></div>`;
    const tray = content.querySelector('.fit-tray');
    const gap = content.querySelector('.fit-gap-target');

    shuffle([expected, ...distractors]).forEach(token => {
      const piece = document.createElement('div');
      piece.className = 'fit-piece pop-in';
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
          gap.setAttribute('fill', puzzle.color);
          gap.setAttribute('stroke', 'rgba(58,51,87,0.18)');
          gap.removeAttribute('stroke-dasharray');
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
