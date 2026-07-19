// Coloring: coloring-book pages. Pick a fat color dot, tap a region to fill.
// Pages are hand-sketched-style line art with ~5 chunky regions each so
// toddlers get an engaging picture without fiddly detail.

import { cycler } from '../engine/rand.js';
import { animal } from '../data/animals.js';

const PALETTE = ['#f04e3e', '#ff8c2e', '#ffcf3d', '#4db84d', '#3d7ef0', '#9b5fe0', '#ff9fce', '#8a5a3c'];
const LINE = '#3a3357';
const SW = 5;

// Shared sketchy stroke attributes: round joins + a hint of a second pass,
// like pencil over ink.
const S = `fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;
const INK = `fill="none" stroke="${LINE}" stroke-linecap="round"`;
const PENCIL = `fill="none" stroke="${LINE}" stroke-linecap="round" opacity="0.45"`;

// Each page: an SVG with data-region elements (white until filled). A
// data-region on a <g> fills every child at once (children carry no fill of
// their own).
const PAGES = [
  {
    id: 'frog', name: 'frog',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <ellipse data-region="pad" cx="100" cy="178" rx="80" ry="15" ${S}/>
      <path data-region="body" d="M40 138 C38 92 65 62 100 63 C135 62 162 92 160 138 C161 166 133 185 100 184 C67 185 39 166 40 138 Z" ${S}/>
      <circle data-region="eyeL" cx="66" cy="60" r="24" ${S}/>
      <circle data-region="eyeR" cx="134" cy="60" r="24" ${S}/>
      <ellipse data-region="belly" cx="100" cy="150" rx="40" ry="29" ${S}/>
      <circle cx="66" cy="58" r="9" fill="${LINE}"/>
      <circle cx="134" cy="58" r="9" fill="${LINE}"/>
      <circle cx="63" cy="55" r="3" fill="#fff"/>
      <circle cx="131" cy="55" r="3" fill="#fff"/>
      <path d="M66 104 Q100 128 134 104" ${INK} stroke-width="${SW}"/>
      <path d="M56 172 q-6 6 -14 6 M144 172 q6 6 14 6" ${PENCIL} stroke-width="3.6"/>
    </svg>`,
  },
  {
    id: 'fish', name: 'fish',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="tail" d="M140 100 L184 62 C178 76 178 88 184 100 C178 112 178 124 184 138 Z" ${S}/>
      <path data-region="fin" d="M72 60 C80 40 108 36 124 48 C110 55 100 64 96 74 Z" ${S}/>
      <ellipse data-region="body" cx="90" cy="106" rx="58" ry="40" ${S}/>
      <path data-region="finlow" d="M90 110 C104 104 118 108 122 120 C110 128 96 126 88 118 Z" ${S}/>
      <path data-region="lips" d="M36 96 C28 96 24 102 26 108 C30 114 38 114 42 110 C44 104 42 98 36 96 Z" ${S}/>
      <circle cx="58" cy="96" r="7" fill="${LINE}"/>
      <circle cx="55.5" cy="93.5" r="2.4" fill="#fff"/>
      <path d="M112 74 C124 86 126 106 118 124" ${PENCIL} stroke-width="4"/>
      <path d="M96 70 C108 84 110 106 102 126" ${PENCIL} stroke-width="4"/>
      <circle cx="30" cy="58" r="6" ${INK} stroke-width="4"/>
      <circle cx="22" cy="40" r="4" ${INK} stroke-width="3.4"/>
    </svg>`,
  },
  {
    id: 'duck', name: 'duck',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="water" d="M18 174 Q40 166 62 174 Q84 182 106 174 Q128 166 150 174 Q170 181 184 175 L184 190 L18 190 Z" ${S}/>
      <path data-region="body" d="M54 104 C52 78 70 60 96 60 C112 60 124 70 128 86 C154 86 170 104 168 126 C166 152 140 168 106 168 C72 168 55 142 54 104 Z" ${S}/>
      <path data-region="wing" d="M90 114 C108 104 128 110 132 126 C134 142 118 152 100 146 C86 141 84 126 90 114 Z" ${S}/>
      <path data-region="bill" d="M54 88 C40 84 30 88 28 98 C30 108 40 112 54 108 C58 102 58 94 54 88 Z" ${S}/>
      <path data-region="tailfeather" d="M156 100 C168 86 180 80 188 84 C184 96 174 106 162 110 Z" ${S}/>
      <circle cx="78" cy="84" r="7" fill="${LINE}"/>
      <circle cx="75.5" cy="81.5" r="2.4" fill="#fff"/>
      <path d="M96 150 q8 5 16 0" ${PENCIL} stroke-width="4"/>
    </svg>`,
  },
  {
    id: 'cat', name: 'cat',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="tail" d="M148 152 C176 150 188 126 176 108 C170 100 158 104 162 114 C168 128 158 140 140 140 Z" ${S}/>
      <ellipse data-region="body" cx="98" cy="148" rx="52" ry="40" ${S}/>
      <path data-region="earL" d="M62 58 L52 20 L90 40 Z" ${S}/>
      <path data-region="earR" d="M138 58 L148 20 L110 40 Z" ${S}/>
      <circle data-region="head" cx="100" cy="80" r="43" ${S}/>
      <ellipse data-region="belly" cx="98" cy="154" rx="26" ry="24" ${S}/>
      <circle cx="84" cy="74" r="6.6" fill="${LINE}"/>
      <circle cx="116" cy="74" r="6.6" fill="${LINE}"/>
      <circle cx="81.9" cy="71.7" r="2.4" fill="#fff"/>
      <circle cx="113.9" cy="71.7" r="2.4" fill="#fff"/>
      <path d="M95 92 Q100 89 105 92 Q103 97 100 97.5 Q97 97 95 92 Z" fill="${LINE}"/>
      <path d="M100 97.5 L100 102 M91 102 Q95.5 108 100 102 Q104.5 108 109 102" ${INK} stroke-width="3"/>
      <path d="M74 92 Q60 89 50 85 M74 98 Q60 98 49 96 M126 92 Q140 89 150 85 M126 98 Q140 98 151 96" ${PENCIL} stroke-width="3"/>
      <path d="M92 36 q2 -6 0 -10 M100 35 q1 -7 0 -12 M108 36 q0 -6 2 -10" ${PENCIL} stroke-width="4"/>
    </svg>`,
  },
  {
    id: 'dog', name: 'dog',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="tail" d="M150 148 C172 142 180 122 172 106 C166 96 154 102 160 112 C164 122 158 132 142 136 Z" ${S}/>
      <ellipse data-region="body" cx="98" cy="150" rx="52" ry="38" ${S}/>
      <path data-region="earL" d="M66 44 C50 40 40 52 44 72 C46 86 56 94 66 92 C72 78 72 58 66 44 Z" ${S}/>
      <path data-region="earR" d="M134 44 C150 40 160 52 156 72 C154 86 144 94 134 92 C128 78 128 58 134 44 Z" ${S}/>
      <circle data-region="head" cx="100" cy="76" r="42" ${S}/>
      <path data-region="tongue" d="M92 112 C92 124 96 132 100 132 C104 132 108 124 108 112 Z" ${S}/>
      <circle cx="84" cy="70" r="6.6" fill="${LINE}"/>
      <circle cx="116" cy="70" r="6.6" fill="${LINE}"/>
      <circle cx="81.9" cy="67.7" r="2.4" fill="#fff"/>
      <circle cx="113.9" cy="67.7" r="2.4" fill="#fff"/>
      <ellipse cx="100" cy="90" rx="8" ry="6.5" fill="${LINE}"/>
      <path d="M100 96 L100 102 M90 104 Q95 110 100 104 Q105 110 110 104" ${INK} stroke-width="3"/>
      <path d="M70 150 q8 -8 18 -6 M60 160 q6 -4 12 -3" ${PENCIL} stroke-width="3.4"/>
      <path d="M100 132 L100 122" ${PENCIL} stroke-width="3"/>
    </svg>`,
  },
  {
    id: 'bunny', name: 'bunny',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <ellipse data-region="earL" cx="76" cy="42" rx="15" ry="34" transform="rotate(-10 76 42)" ${S}/>
      <ellipse data-region="earR" cx="124" cy="42" rx="15" ry="34" transform="rotate(10 124 42)" ${S}/>
      <ellipse data-region="body" cx="100" cy="150" rx="48" ry="38" ${S}/>
      <circle data-region="head" cx="100" cy="92" r="42" ${S}/>
      <ellipse data-region="belly" cx="100" cy="156" rx="24" ry="22" ${S}/>
      <ellipse cx="76" cy="44" rx="7" ry="22" transform="rotate(-10 76 44)" ${PENCIL} stroke-width="3.4"/>
      <ellipse cx="124" cy="44" rx="7" ry="22" transform="rotate(10 124 44)" ${PENCIL} stroke-width="3.4"/>
      <circle cx="84" cy="88" r="6.4" fill="${LINE}"/>
      <circle cx="116" cy="88" r="6.4" fill="${LINE}"/>
      <circle cx="81.9" cy="85.7" r="2.4" fill="#fff"/>
      <circle cx="113.9" cy="85.7" r="2.4" fill="#fff"/>
      <path d="M95 103 Q100 100 105 103 Q103 108 100 108.5 Q97 108 95 103 Z" fill="${LINE}"/>
      <path d="M100 108.5 L100 113 M91 113 Q95.5 118.5 100 113 Q104.5 118.5 109 113" ${INK} stroke-width="3"/>
      <rect x="94" y="114" width="6" height="8" rx="2" fill="#fff" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round"/>
      <rect x="100" y="114" width="6" height="8" rx="2" fill="#fff" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M76 104 Q62 101 52 97 M124 104 Q138 101 148 97" ${PENCIL} stroke-width="3"/>
    </svg>`,
  },
  {
    id: 'bear', name: 'bear',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <g data-region="ears" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round">
        <circle cx="62" cy="38" r="17"/>
        <circle cx="138" cy="38" r="17"/>
      </g>
      <ellipse data-region="body" cx="100" cy="150" rx="54" ry="40" ${S}/>
      <circle data-region="head" cx="100" cy="78" r="46" ${S}/>
      <ellipse data-region="muzzle" cx="100" cy="96" rx="23" ry="17" ${S}/>
      <path data-region="honey" d="M148 138 C140 142 138 158 144 168 C148 176 168 176 172 168 C178 158 176 142 168 138 C170 134 146 134 148 138 Z" ${S}/>
      <circle cx="62" cy="40" r="8" ${PENCIL} stroke-width="3.4"/>
      <circle cx="138" cy="40" r="8" ${PENCIL} stroke-width="3.4"/>
      <circle cx="83" cy="72" r="6.6" fill="${LINE}"/>
      <circle cx="117" cy="72" r="6.6" fill="${LINE}"/>
      <circle cx="80.9" cy="69.7" r="2.4" fill="#fff"/>
      <circle cx="114.9" cy="69.7" r="2.4" fill="#fff"/>
      <ellipse cx="100" cy="90" rx="8" ry="6" fill="${LINE}"/>
      <path d="M100 96 L100 101 M91 101 Q95.5 107 100 101 Q104.5 107 109 101" ${INK} stroke-width="3"/>
      <path d="M146 148 h28" ${PENCIL} stroke-width="3.4"/>
      <path d="M152 158 q8 4 14 0" ${PENCIL} stroke-width="3"/>
    </svg>`,
  },
  {
    id: 'butterfly', name: 'butterfly',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="wingTL" d="M94 96 C70 58 42 36 26 46 C10 56 20 92 52 108 C68 116 86 112 94 96 Z" ${S}/>
      <path data-region="wingTR" d="M106 96 C130 58 158 36 174 46 C190 56 180 92 148 108 C132 116 114 112 106 96 Z" ${S}/>
      <path data-region="wingBL" d="M94 108 C76 118 54 136 54 156 C54 174 74 178 88 162 C98 150 100 128 94 108 Z" ${S}/>
      <path data-region="wingBR" d="M106 108 C124 118 146 136 146 156 C146 174 126 178 112 162 C102 150 100 128 106 108 Z" ${S}/>
      <ellipse data-region="bodymid" cx="100" cy="116" rx="14" ry="48" ${S}/>
      <circle data-region="face" cx="100" cy="66" r="18" ${S}/>
      <path d="M92 52 Q86 38 74 30 M108 52 Q114 38 126 30" ${PENCIL} stroke-width="4" opacity="1"/>
      <circle cx="72" cy="28" r="4.5" fill="${LINE}"/>
      <circle cx="128" cy="28" r="4.5" fill="${LINE}"/>
      <circle cx="94" cy="64" r="2.6" fill="${LINE}"/>
      <circle cx="106" cy="64" r="2.6" fill="${LINE}"/>
      <path d="M94 72 Q100 77 106 72" ${INK} stroke-width="2.8"/>
      <circle cx="52" cy="70" r="8" ${PENCIL} stroke-width="3.4"/>
      <circle cx="148" cy="70" r="8" ${PENCIL} stroke-width="3.4"/>
      <circle cx="76" cy="146" r="6" ${PENCIL} stroke-width="3"/>
      <circle cx="124" cy="146" r="6" ${PENCIL} stroke-width="3"/>
    </svg>`,
  },
  {
    id: 'dinosaur', name: 'dinosaur',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="tail" d="M162 132 C180 128 190 116 192 100 C200 122 190 146 166 156 Z" ${S}/>
      <path data-region="neck" d="M50 72 C46 96 58 118 76 134 L108 122 C92 106 86 88 78 72 Z" ${S}/>
      <ellipse data-region="body" cx="116" cy="146" rx="54" ry="34" ${S}/>
      <g data-region="legs" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round">
        <rect x="88" y="168" width="18" height="26" rx="9"/>
        <rect x="130" y="168" width="18" height="26" rx="9"/>
      </g>
      <ellipse data-region="belly" cx="116" cy="152" rx="30" ry="18" ${S}/>
      <g data-region="plates" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round">
        <path d="M96 116 L104 98 L114 114 Z"/>
        <path d="M120 112 L128 94 L138 110 Z"/>
        <path d="M144 116 L152 100 L160 116 Z"/>
      </g>
      <circle data-region="head" cx="62" cy="56" r="22" ${S}/>
      <circle cx="55" cy="52" r="5" fill="${LINE}"/>
      <circle cx="53.2" cy="50.2" r="1.8" fill="#fff"/>
      <path d="M48 64 Q54 70 62 68" ${INK} stroke-width="3.4"/>
      <circle cx="46" cy="56" r="1.9" fill="${LINE}"/>
    </svg>`,
  },
  {
    id: 'turtle', name: 'turtle',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <g data-region="legs" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round">
        <ellipse cx="66" cy="172" rx="15" ry="13" transform="rotate(16 66 172)"/>
        <ellipse cx="158" cy="172" rx="15" ry="13" transform="rotate(-16 158 172)"/>
        <path d="M168 142 q16 0 22 10 q-12 4 -24 -2 Z"/>
      </g>
      <circle data-region="head" cx="52" cy="98" r="26" ${S}/>
      <path data-region="shell" d="M66 156 C62 112 86 84 116 84 C148 84 170 112 166 156 Z" ${S}/>
      <path data-region="rim" d="M58 156 C58 146 68 140 82 140 L150 140 C164 140 174 146 174 156 C174 164 166 168 154 168 L78 168 C66 168 58 164 58 156 Z" ${S}/>
      <path data-region="pattern" d="M116 92 L100 112 L116 132 L132 112 Z" ${S}/>
      <circle cx="44" cy="94" r="5.6" fill="${LINE}"/>
      <circle cx="58" cy="94" r="5.6" fill="${LINE}"/>
      <circle cx="42.2" cy="92" r="2.1" fill="#fff"/>
      <circle cx="56.2" cy="92" r="2.1" fill="#fff"/>
      <path d="M42 106 Q50 113 60 108" ${INK} stroke-width="3"/>
      <path d="M88 104 L80 124 L94 136 M144 104 L152 124 L138 136" ${PENCIL} stroke-width="4"/>
      <path d="M66 152 L166 152" ${PENCIL} stroke-width="3.4"/>
    </svg>`,
  },
  {
    id: 'elephant', name: 'elephant',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <ellipse data-region="body" cx="120" cy="134" rx="58" ry="44" ${S}/>
      <g data-region="legs" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round">
        <rect x="92" y="156" width="20" height="34" rx="9"/>
        <rect x="136" y="156" width="20" height="34" rx="9"/>
      </g>
      <circle data-region="head" cx="68" cy="88" r="36" ${S}/>
      <path data-region="trunk" d="M46 92 C32 102 26 122 34 142 C38 154 52 156 54 146 C56 138 46 136 46 126 C46 116 52 108 62 102 Z" ${S}/>
      <path data-region="ear" d="M74 56 C96 50 110 66 108 90 C106 112 90 122 76 116 C68 100 66 72 74 56 Z" ${S}/>
      <circle cx="54" cy="82" r="6" fill="${LINE}"/>
      <circle cx="52" cy="80" r="2.2" fill="#fff"/>
      <path d="M56 106 Q62 112 70 110" ${INK} stroke-width="3.4"/>
      <path d="M82 66 C76 80 76 98 82 108" ${PENCIL} stroke-width="3.4"/>
      <path d="M100 188 h4 M144 188 h4" ${PENCIL} stroke-width="3"/>
    </svg>`,
  },
  {
    id: 'monkey', name: 'monkey',
    svg: `
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <path data-region="tail" d="M148 156 C176 154 186 134 176 118 C170 108 158 112 162 122 C166 134 158 144 142 144 Z" ${S}/>
      <ellipse data-region="body" cx="100" cy="152" rx="46" ry="36" ${S}/>
      <g data-region="ears" fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round">
        <circle cx="56" cy="74" r="15"/>
        <circle cx="144" cy="74" r="15"/>
      </g>
      <circle data-region="head" cx="100" cy="76" r="42" ${S}/>
      <path data-region="face" d="M70 68 C70 50 130 50 130 68 C138 90 124 108 100 108 C76 108 62 90 70 68 Z" ${S}/>
      <path data-region="banana" d="M42 148 C30 158 28 174 38 182 C54 174 62 160 60 146 C56 142 48 142 42 148 Z" ${S}/>
      <circle cx="84" cy="72" r="6.4" fill="${LINE}"/>
      <circle cx="116" cy="72" r="6.4" fill="${LINE}"/>
      <circle cx="81.9" cy="69.7" r="2.4" fill="#fff"/>
      <circle cx="113.9" cy="69.7" r="2.4" fill="#fff"/>
      <ellipse cx="94" cy="90" rx="2.6" ry="3.4" fill="${LINE}"/>
      <ellipse cx="106" cy="90" rx="2.6" ry="3.4" fill="${LINE}"/>
      <path d="M88 98 Q100 108 112 98" ${INK} stroke-width="3"/>
      <path d="M44 152 C36 160 34 170 40 176" ${PENCIL} stroke-width="3"/>
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
    // One animal on screen: let it say hello with its real sound.
    const a = animal(page.id);
    if (a && a.sound) {
      audio.load('animal:' + a.id, a.sound).then(() => {
        if (alive) audio.play('animal:' + a.id);
      });
    }
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
