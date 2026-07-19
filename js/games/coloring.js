// Coloring: coloring-book pages. Pick a fat color dot, tap a region to fill.

import { cycler } from '../engine/rand.js';

const PALETTE = ['#f04e3e', '#ff8c2e', '#ffcf3d', '#4db84d', '#3d7ef0', '#9b5fe0', '#ff9fce', '#8a5a3c'];
const LINE = '#3a3357';
const SW = 5;

// Each page: an SVG with data-region elements (white until filled).
const PAGES = [
  {
    id: 'frog', name: 'frog',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <ellipse data-region="pad" cx="100" cy="178" rx="78" ry="14" fill="#fff" stroke="${LINE}" stroke-width="${SW}"/>
      <path data-region="body" d="M40 138 C40 90 66 64 100 64 C134 64 160 90 160 138 C160 166 132 184 100 184 C68 184 40 166 40 138 Z" fill="#fff" stroke="${LINE}" stroke-width="${SW}"/>
      <circle data-region="eyeL" cx="66" cy="62" r="24" fill="#fff" stroke="${LINE}" stroke-width="${SW}"/>
      <circle data-region="eyeR" cx="134" cy="62" r="24" fill="#fff" stroke="${LINE}" stroke-width="${SW}"/>
      <ellipse data-region="belly" cx="100" cy="150" rx="40" ry="29" fill="#fff" stroke="${LINE}" stroke-width="${SW}"/>
      <circle cx="66" cy="60" r="9" fill="${LINE}"/>
      <circle cx="134" cy="60" r="9" fill="${LINE}"/>
      <circle cx="63" cy="57" r="3" fill="#fff"/>
      <circle cx="131" cy="57" r="3" fill="#fff"/>
      <path d="M66 106 Q100 128 134 106" fill="none" stroke="${LINE}" stroke-width="${SW}" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'fish', name: 'fish',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="tail" d="M140 100 L182 66 C177 78 177 88 182 100 C177 112 177 122 182 134 Z" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <path data-region="fin" d="M74 62 C82 44 106 40 120 50 C108 56 100 64 96 74 Z" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <ellipse data-region="body" cx="90" cy="104" rx="56" ry="38" fill="#fff" stroke="${LINE}" stroke-width="${SW}"/>
      <path data-region="finlow" d="M92 108 C104 104 116 106 120 116 C110 122 98 122 90 116 Z" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <circle cx="56" cy="96" r="7" fill="${LINE}"/>
      <circle cx="53.5" cy="93.5" r="2.4" fill="#fff"/>
      <path d="M44 114 q7 6 14 2" fill="none" stroke="${LINE}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="30" cy="62" r="6" fill="none" stroke="${LINE}" stroke-width="4"/>
      <circle cx="22" cy="44" r="4" fill="none" stroke="${LINE}" stroke-width="3.4"/>
    </svg>`,
  },
  {
    id: 'duck', name: 'duck',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="body" d="M54 108 C54 84 70 66 96 66 C110 66 122 74 126 88 C152 88 168 104 166 126 C164 152 140 168 106 168 C72 168 54 144 54 108 Z" fill="#fff" stroke="${LINE}" stroke-width="${SW}"/>
      <path data-region="wing" d="M92 116 C108 108 126 112 130 126 C132 140 118 150 102 146 C90 142 86 128 92 116 Z" fill="#fff" stroke="${LINE}" stroke-width="${SW}"/>
      <path data-region="bill" d="M54 92 C42 88 32 92 30 100 C32 108 42 112 54 108 C58 104 58 96 54 92 Z" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
      <circle cx="76" cy="88" r="7" fill="${LINE}"/>
      <circle cx="73.5" cy="85.5" r="2.4" fill="#fff"/>
      <path d="M96 168 L90 184 M112 166 L112 184" fill="none" stroke="${LINE}" stroke-width="4.6" stroke-linecap="round"/>
      <path d="M84 184 q6 -5 12 0 M106 184 q6 -5 12 0" fill="none" stroke="${LINE}" stroke-width="4.6" stroke-linecap="round"/>
    </svg>`,
  },
];

const CHECK_ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 54 L42 76 L84 26" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="co-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#ff9fce"/><stop offset="100%" stop-color="#e5548a"/>
    </linearGradient>
  </defs>
  <g transform="rotate(40 50 50)">
    <rect x="40" y="24" width="20" height="58" rx="4" fill="url(#co-i)"/>
    <path d="M40 24 L50 6 L60 24 Z" fill="url(#co-i)"/>
    <path d="M46 12 L50 6 L54 12 Z" fill="#3a3357"/>
    <rect x="40" y="76" width="20" height="8" rx="4" fill="#e0b8cb"/>
  </g>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let selected = PALETTE[3];
  let touched = false;
  const nextPage = cycler(PAGES);

  const area = document.createElement('div');
  area.className = 'color-stage';
  const pic = document.createElement('div');
  pic.className = 'color-pic';
  area.appendChild(pic);
  const bar = document.createElement('div');
  bar.className = 'palette-row';
  stage.appendChild(area);
  stage.appendChild(bar);

  const dots = [];
  PALETTE.forEach(c => {
    const d = document.createElement('button');
    d.className = 'palette-dot';
    d.style.background = `radial-gradient(circle at 35% 30%, ${c}cc, ${c})`;
    d.addEventListener('pointerdown', () => {
      selected = c;
      dots.forEach(x => x.classList.remove('selected'));
      d.classList.add('selected');
      audio.pop();
    });
    bar.appendChild(d);
    dots.push(d);
  });
  dots[3].classList.add('selected');

  const done = document.createElement('button');
  done.className = 'big-btn done-btn';
  done.innerHTML = CHECK_ICON;
  done.addEventListener('pointerdown', () => {
    if (!alive || !touched) return;
    celebrate.big();
    speech.speak('What a beautiful picture!');
    setTimeout(newPage, 2600);
  });
  bar.appendChild(done);

  function newPage() {
    if (!alive) return;
    touched = false;
    const page = nextPage();
    pic.innerHTML = page.svg;
    pic.classList.remove('pop-in');
    void pic.offsetWidth;
    pic.classList.add('pop-in');
    pic.querySelectorAll('[data-region]').forEach(region => {
      region.addEventListener('pointerdown', () => {
        if (!alive) return;
        region.setAttribute('fill', selected);
        touched = true;
        audio.sparkle();
      });
    });
    speech.speak(`Let's color the ${page.name}! Pick a color, then tap the picture!`);
  }

  setReprompt(() => speech.speak('Tap a color dot, then tap the picture to color it!'));
  newPage();
  return () => { alive = false; };
}

export default {
  id: 'coloring',
  title: 'Coloring',
  icon: ICON,
  start,
};
