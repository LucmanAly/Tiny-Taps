// Things That Go: vehicles and their sounds.
//
// Garage: a row of garage doors on a little street. Tap a door, it rolls up,
// and whatever is inside drives (or flies, or sails) away with its own sound
// — then a new surprise waits behind the door. Nothing to get wrong.
// Listen: a sound plays; two or three vehicles wait — tap the one that makes
// it. A wrong tap plays that vehicle's own sound, so every tap teaches.
//
// Every sound is a synthesized effect (no computer voice anywhere).

import { shuffle, pickN } from '../engine/rand.js';
import { fadeSwap } from '../engine/ui.js';
import * as stickers from '../engine/stickers.js';
import { childKey } from '../engine/children.js';

const MODE_KEY = 'tinytaps-vehicles-mode';
const INK = '#3a3357';
const GLASS = '#dff0ff';

const wheel = (cx, cy, r) =>
  `<g class="tg-wheel" style="transform-origin:${cx}px ${cy}px">` +
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${INK}"/>` +
  `<circle cx="${cx}" cy="${cy}" r="${r * 0.48}" fill="#e3e8f4"/>` +
  `<path d="M${cx - r * 0.48} ${cy}H${cx + r * 0.48}M${cx} ${cy - r * 0.48}V${cy + r * 0.48}" stroke="#9aa3bf" stroke-width="2.5"/></g>`;

const svg = body => `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;

// `go`: how it leaves — drive along the road, fly up and away, or sail.
export const VEHICLES = [
  {
    id: 'car', name: 'car', sound: 'honk', go: 'drive',
    art: svg(`<path d="M14 70 Q14 54 30 52 L48 50 L62 32 Q66 28 74 28 H108 Q116 28 120 34 L132 50 Q148 52 150 62 V70 Q150 76 144 76 H20 Q14 76 14 70 Z" fill="#f04e3e" ${S}/>
      <path d="M66 50 L76 36 H94 V50 Z" fill="${GLASS}"/><path d="M100 36 H112 L122 50 H100 Z" fill="${GLASS}"/>
      <circle cx="145" cy="62" r="4" fill="#fff3a0"/>${wheel(44, 78, 13)}${wheel(122, 78, 13)}`),
  },
  {
    id: 'bus', name: 'bus', sound: 'beepBeep', go: 'drive',
    art: svg(`<rect x="10" y="20" width="142" height="56" rx="10" fill="#ffcf3d" ${S}/>
      ${[0, 1, 2, 3].map(i => `<rect x="${20 + i * 25}" y="28" width="19" height="17" rx="3" fill="${GLASS}"/>`).join('')}
      <rect x="126" y="28" width="18" height="40" rx="3" fill="${GLASS}" stroke="${INK}" stroke-width="2"/>
      <rect x="10" y="54" width="114" height="5" fill="${INK}" opacity=".75"/>
      <circle cx="148" cy="66" r="3.5" fill="#fff3a0"/>${wheel(38, 78, 12)}${wheel(118, 78, 12)}`),
  },
  {
    id: 'firetruck', name: 'fire truck', sound: 'siren', go: 'drive',
    art: svg(`<rect x="10" y="38" width="104" height="38" rx="6" fill="#e5392d" ${S}/>
      <rect x="108" y="26" width="42" height="50" rx="8" fill="#e5392d" ${S}/>
      <rect x="118" y="33" width="24" height="17" rx="3" fill="${GLASS}"/>
      <rect x="120" y="18" width="16" height="8" rx="3" fill="#3d7ef0"/>
      <rect x="16" y="26" width="88" height="7" rx="3" fill="#e3e8f4" ${S}/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${26 + i * 14} 26V33" stroke="${INK}" stroke-width="2.5"/>`).join('')}
      <circle cx="40" cy="56" r="9" fill="#ffcf3d" ${S}/>
      ${wheel(34, 78, 12)}${wheel(76, 78, 12)}${wheel(130, 78, 12)}`),
  },
  {
    id: 'tractor', name: 'tractor', sound: 'puttPutt', go: 'drive',
    art: svg(`<rect x="82" y="46" width="60" height="26" rx="6" fill="#4db84d" ${S}/>
      <rect x="30" y="16" width="50" height="50" rx="6" fill="#4db84d" ${S}/>
      <rect x="38" y="23" width="34" height="22" rx="3" fill="${GLASS}"/>
      <rect x="98" y="24" width="7" height="24" rx="2" fill="${INK}"/>
      <circle cx="54" cy="70" r="24" fill="${INK}"/><circle cx="54" cy="70" r="12" fill="#ffcf3d"/>
      <g class="tg-wheel" style="transform-origin:54px 70px"><path d="M54 52V88M36 70H72" stroke="#c99a1e" stroke-width="3"/></g>
      ${wheel(126, 80, 12)}`),
  },
  {
    id: 'train', name: 'train', sound: 'toot', go: 'drive',
    art: svg(`<rect x="56" y="40" width="80" height="34" rx="14" fill="#3d7ef0" ${S}/>
      <rect x="14" y="22" width="48" height="52" rx="6" fill="#f04e3e" ${S}/>
      <rect x="22" y="30" width="30" height="20" rx="3" fill="${GLASS}"/>
      <rect x="108" y="20" width="14" height="22" fill="${INK}"/><rect x="104" y="16" width="22" height="7" rx="3" fill="${INK}"/>
      <path d="M136 62 L152 78 H134 Z" fill="#ffcf3d" ${S}/>
      <path d="M62 52 H130" stroke="#ffcf3d" stroke-width="5"/>
      ${wheel(34, 80, 10)}${wheel(80, 80, 12)}${wheel(114, 80, 12)}`),
  },
  {
    id: 'plane', name: 'plane', sound: 'jet', go: 'fly',
    art: svg(`<path d="M22 50 L12 20 H28 L46 44 Z" fill="#3d7ef0" ${S}/>
      <ellipse cx="82" cy="52" rx="66" ry="15" fill="#ffffff" ${S}/>
      <path d="M70 56 H100 L84 84 H68 Z" fill="#3d7ef0" ${S}/>
      ${[0, 1, 2, 3, 4].map(i => `<circle cx="${60 + i * 14}" cy="48" r="3.6" fill="#9fd3ff"/>`).join('')}
      <path d="M134 44 Q144 46 147 52 H134 Z" fill="${GLASS}"/>`),
  },
  {
    id: 'helicopter', name: 'helicopter', sound: 'chopChop', go: 'fly',
    art: svg(`<rect x="10" y="48" width="44" height="9" rx="4" fill="#ff8c2e" ${S}/>
      <circle cx="13" cy="46" r="8" fill="none" stroke="${INK}" stroke-width="3"/>
      <ellipse cx="80" cy="56" rx="40" ry="25" fill="#ff8c2e" ${S}/>
      <ellipse cx="96" cy="52" rx="18" ry="14" fill="${GLASS}"/>
      <rect x="74" y="24" width="7" height="10" fill="${INK}"/>
      <g class="tg-rotor" style="transform-origin:77px 24px"><rect x="28" y="20" width="98" height="6" rx="3" fill="${INK}"/></g>
      <path d="M50 92 H112 M62 80 V92 M98 80 V92" stroke="${INK}" stroke-width="4" stroke-linecap="round" fill="none"/>`),
  },
  {
    id: 'boat', name: 'boat', sound: 'foghorn', go: 'sail',
    art: svg(`<path d="M0 86 Q20 78 40 86 T80 86 T120 86 T160 86 V100 H0 Z" fill="#5fc9e8"/>
      <path d="M14 58 H150 L132 84 H30 Z" fill="#f04e3e" ${S}/>
      <rect x="44" y="34" width="62" height="24" rx="4" fill="#ffffff" ${S}/>
      <circle cx="60" cy="46" r="5" fill="${GLASS}" stroke="${INK}" stroke-width="2"/><circle cx="78" cy="46" r="5" fill="${GLASS}" stroke="${INK}" stroke-width="2"/>
      <rect x="92" y="16" width="14" height="20" fill="#ffcf3d" ${S}/><rect x="92" y="16" width="14" height="6" fill="${INK}"/>`),
  },
  {
    id: 'bike', name: 'bike', sound: 'ringRing', go: 'drive',
    art: svg(`<g class="tg-wheel" style="transform-origin:40px 70px"><circle cx="40" cy="70" r="19" fill="none" stroke="${INK}" stroke-width="5"/><path d="M40 51V89M21 70H59" stroke="#9aa3bf" stroke-width="2"/></g>
      <g class="tg-wheel" style="transform-origin:120px 70px"><circle cx="120" cy="70" r="19" fill="none" stroke="${INK}" stroke-width="5"/><path d="M120 51V89M101 70H139" stroke="#9aa3bf" stroke-width="2"/></g>
      <path d="M40 70 L70 70 L98 42 L60 42 Z M98 42 L120 70 M70 70 L56 36" fill="none" stroke="#9b5fe0" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M46 34 H66" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <path d="M98 42 L94 28 H108" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`),
  },
];

const DOOR_COLORS = ['#ff8a70', '#62d9d0', '#b98aef', '#ffd54a'];

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="66" width="88" height="16" rx="4" fill="#8f93a8"/>
  <path d="M10 74 H90" stroke="#fff" stroke-width="3" stroke-dasharray="9 7"/>
  <path d="M12 60 Q12 46 26 44 L36 43 L46 28 Q49 25 55 25 H72 Q78 25 81 30 L88 43 Q96 45 96 52 V60 Q96 64 92 64 H16 Q12 64 12 60 Z" fill="#f04e3e" stroke="#3a3357" stroke-width="3" stroke-linejoin="round"/>
  <path d="M50 43 L57 32 H67 V43 Z" fill="#dff0ff"/><path d="M71 32 H78 L84 43 H71 Z" fill="#dff0ff"/>
  <circle cx="32" cy="66" r="9" fill="#3a3357"/><circle cx="32" cy="66" r="4" fill="#e3e8f4"/>
  <circle cx="80" cy="66" r="9" fill="#3a3357"/><circle cx="80" cy="66" r="4" fill="#e3e8f4"/>
</svg>`;

const GARAGE_TAB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 10 L12 3 L22 10 V21 H2 Z" fill="#ff8a70"/><rect x="6" y="11" width="12" height="10" fill="#fff"/><path d="M6 14 H18 M6 17 H18" stroke="#ff8a70" stroke-width="1.5"/></svg>';
const LISTEN_TAB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="#2ba49a"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="#2ba49a" stroke-width="2.2" stroke-linecap="round"/></svg>';

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt, difficulty, recordOutcome } = ctx;
  let alive = true;
  let mode = localStorage.getItem(childKey(MODE_KEY)) === 'listen' ? 'listen' : 'garage';
  const timers = new Set();
  const later = (ms, fn) => {
    const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms);
    timers.add(id);
    return id;
  };

  const shell = document.createElement('div');
  shell.className = 'tg-shell';
  shell.innerHTML = `
    <svg class="tg-sky" viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <circle cx="610" cy="120" r="40" fill="#ffd54a"/>
      <g fill="#fff" opacity=".92"><ellipse cx="170" cy="120" rx="70" ry="24"/><ellipse cx="215" cy="104" rx="44" ry="24"/><ellipse cx="470" cy="80" rx="56" ry="18"/><ellipse cx="500" cy="68" rx="34" ry="18"/></g>
      <path d="M0 400 V330 Q120 270 250 320 T520 300 T800 320 V400 Z" fill="#bfe7a8"/>
      <path d="M0 400 V360 Q160 320 330 356 T800 350 V400 Z" fill="#a6dc8a"/>
    </svg>`;
  const tabs = document.createElement('div');
  tabs.className = 'puzzle-tabs sticker-tabs tg-tabs';
  const content = document.createElement('div');
  content.className = 'tg-content';
  const road = document.createElement('div');
  road.className = 'tg-road';
  shell.append(tabs, content, road);
  stage.appendChild(shell);

  [['garage', 'Garage', GARAGE_TAB], ['listen', 'Listen', LISTEN_TAB]].forEach(([id, label, icon]) => {
    const b = document.createElement('button');
    b.className = 'puzzle-tab sticker-tab';
    b.dataset.mode = id;
    b.innerHTML = `${icon}<span>${label}</span>`;
    b.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (!alive || mode === id) return;
      mode = id;
      try { localStorage.setItem(childKey(MODE_KEY), mode); } catch (err) { /* optional */ }
      audio.pop();
      render();
    });
    tabs.appendChild(b);
  });

  function play(v) {
    if (typeof audio[v.sound] === 'function') audio[v.sound]();
  }

  function wiggle(node) {
    node.classList.remove('wiggle');
    void node.offsetWidth;
    node.classList.add('wiggle');
  }

  // Sends a copy of a vehicle across the screen from where `fromEl` sits:
  // along the road, up into the sky, or bobbing over the water.
  function goAway(v, fromEl) {
    const r = fromEl.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    const car = document.createElement('div');
    car.className = `tg-mover tg-${v.go}`;
    car.innerHTML = v.art;
    car.style.left = `${r.left - s.left}px`;
    car.style.top = `${r.top - s.top}px`;
    car.style.width = `${r.width}px`;
    car.style.height = `${r.height}px`;
    stage.appendChild(car);
    const dx = s.width - (r.left - s.left) + 40;
    const frames = v.go === 'fly'
      ? [{ transform: 'translate(0, 0) rotate(0deg)' }, { transform: `translate(${dx * 0.3}px, -20px) rotate(-6deg)`, offset: 0.35 }, { transform: `translate(${dx}px, ${-(r.top - s.top) - r.height - 40}px) rotate(-12deg)` }]
      : v.go === 'sail'
        ? [{ transform: 'translate(0, 0) rotate(0deg)' }, { transform: `translate(${dx * 0.35}px, -6px) rotate(-3deg)`, offset: 0.35 }, { transform: `translate(${dx * 0.7}px, 4px) rotate(3deg)`, offset: 0.7 }, { transform: `translate(${dx}px, 0) rotate(0deg)` }]
        : [{ transform: 'translate(0, 0)' }, { transform: 'translate(-10px, 0)', offset: 0.12 }, { transform: `translate(${dx}px, 0)` }];
    const anim = car.animate(frames, { duration: v.go === 'drive' ? 1700 : 2300, easing: 'ease-in', fill: 'forwards' });
    anim.onfinish = () => car.remove();
    later(2600, () => car.remove());
  }

  /* ---------------- Garage ---------------- */

  function renderGarage() {
    setReprompt(null);
    const row = document.createElement('div');
    row.className = 'tg-garages';
    content.appendChild(row);
    let opened = 0;
    let last = null;
    const pick = () => {
      const pool = VEHICLES.filter(v => v !== last);
      last = pool[Math.floor(Math.random() * pool.length)];
      return last;
    };
    DOOR_COLORS.forEach((color, i) => {
      let inside = pick();
      let busy = false;
      const garage = document.createElement('button');
      garage.className = 'tg-garage pop-in';
      garage.style.animationDelay = `${i * 0.08}s`;
      garage.setAttribute('aria-label', 'Open the garage');
      garage.innerHTML = `
        <svg class="tg-house" viewBox="0 0 100 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M4 32 L50 6 L96 32 V90 H4 Z" fill="#fff6e6" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
          <path d="M0 34 L50 4 L100 34" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="tg-bay"><div class="tg-inside">${inside.art}</div>
          <div class="tg-door" style="--door:${color}"><span>?</span></div></div>`;
      const door = garage.querySelector('.tg-door');
      const insideEl = garage.querySelector('.tg-inside');
      garage.addEventListener('pointerdown', () => {
        if (!alive || busy) return;
        busy = true;
        const v = inside;
        door.classList.add('up');
        audio.pop();
        if (recordOutcome) recordOutcome(true, v.name);
        later(380, () => {
          play(v);
          insideEl.classList.add('tg-gone');
          goAway(v, insideEl);
          opened++;
          if (opened % DOOR_COLORS.length === 0) later(1500, () => celebrate.big());
        });
        // Behind the closed door, a new surprise.
        later(2000, () => door.classList.remove('up'));
        later(2500, () => {
          inside = pick();
          insideEl.innerHTML = inside.art;
          insideEl.classList.remove('tg-gone');
          busy = false;
        });
      });
      row.appendChild(garage);
    });
  }

  /* ---------------- Listen ---------------- */

  function renderListen() {
    const wrap = document.createElement('div');
    wrap.className = 'tg-listen-wrap';
    const listen = document.createElement('button');
    listen.className = 'words-listen tg-listen';
    listen.setAttribute('aria-label', 'Play the sound again');
    listen.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Z" fill="#fff"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><path d="M19 6a9 9 0 0 1 0 12" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';
    const choices = document.createElement('div');
    choices.className = 'tg-choices';
    wrap.append(listen, choices);
    content.appendChild(wrap);

    let target = null;
    let lastTarget = null;
    let answered = false;

    function sayTarget() {
      if (!alive || !target || mode !== 'listen') return;
      wiggle(listen);
      play(target);
    }

    function newRound() {
      const count = difficulty && difficulty() >= 2 ? 3 : 2;
      target = shuffle(VEHICLES.filter(v => v !== lastTarget))[0];
      lastTarget = target;
      answered = false;
      const set = shuffle([target, ...pickN(VEHICLES.filter(v => v !== target && v.sound !== target.sound), count - 1)]);
      const build = () => {
        if (!alive || mode !== 'listen') return;
        choices.replaceChildren();
        set.forEach((v, n) => {
          const b = document.createElement('button');
          b.className = 'tg-choice pop-in';
          b.style.animationDelay = `${n * 0.07}s`;
          b.setAttribute('aria-label', v.name);
          b.innerHTML = `<div class="tg-choice-art">${v.art}</div>`;
          b.addEventListener('pointerdown', e => {
            if (!alive || answered) return;
            if (v === target) {
              answered = true;
              if (recordOutcome) recordOutcome(true, v.name);
              play(v);
              const art = b.querySelector('.tg-choice-art');
              art.classList.add('tg-gone');
              goAway(v, art);
              celebrate.burst(e.clientX, e.clientY, { count: 24 });
              speech.praise({ quick: true });
              const won = stickers.recordWin(null);
              if (won) later(900, () => stickers.showToast(won));
              later(1900, () => fadeSwap(choices, newRound));
            } else {
              if (recordOutcome) recordOutcome(false, target.name);
              wiggle(b);
              play(v);       // every tap teaches: this is what *that* one sounds like
              speech.encourage();
              later(1300, sayTarget);
            }
          });
          choices.appendChild(b);
        });
        later(350, sayTarget);
      };
      build();
    }

    listen.addEventListener('pointerdown', e => { e.stopPropagation(); sayTarget(); });
    // A quiet spell plays the sound again — never words.
    setReprompt(() => { if (!answered) sayTarget(); });
    newRound();
  }

  function render() {
    timers.forEach(clearTimeout);
    timers.clear();
    stage.querySelectorAll('.tg-mover').forEach(n => n.remove());
    content.replaceChildren();
    tabs.querySelectorAll('.sticker-tab').forEach(b => b.classList.toggle('selected', b.dataset.mode === mode));
    shell.classList.toggle('tg-listening', mode === 'listen');
    if (mode === 'listen') renderListen();
    else renderGarage();
  }

  render();
  return () => {
    alive = false;
    timers.forEach(clearTimeout);
    timers.clear();
  };
}

export default {
  id: 'vehicles',
  title: 'Things That Go',
  icon: ICON,
  start,
};
