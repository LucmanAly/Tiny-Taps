// Music: a rainbow xylophone. Pure free play — every bar plays a note,
// bounces, and sparkles. No rules, no rounds.

import { S } from '../data/strings.js';

const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
const COLORS = ['#f04e3e', '#ff8c2e', '#ffcf3d', '#4db84d', '#2ba49a', '#3d7ef0', '#9b5fe0', '#ff9fce'];

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  ${COLORS.slice(0, 5).map((c, i) => `
    <rect x="${12 + i * 16}" y="${16 + i * 7}" width="12" height="${68 - i * 14}" rx="6" fill="${c}"/>`).join('')}
  <circle cx="78" cy="24" r="7" fill="#3a3357"/>
  <rect x="76" y="28" width="4" height="30" rx="2" fill="#3a3357" transform="rotate(-18 78 28)"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let taps = 0;

  const row = document.createElement('div');
  row.className = 'music-row';
  stage.appendChild(row);

  NOTES.forEach((freq, i) => {
    const bar = document.createElement('button');
    bar.className = 'music-bar';
    bar.style.background = `linear-gradient(180deg, ${COLORS[i]}dd, ${COLORS[i]})`;
    bar.style.height = `${88 - i * 6}%`;
    bar.addEventListener('pointerdown', e => {
      if (!alive) return;
      audio.note(freq);
      bar.classList.remove('bounce');
      void bar.offsetWidth;
      bar.classList.add('bounce');
      taps++;
      // A little extra magic every so often, never every tap.
      if (taps % 7 === 0) celebrate.burst(e.clientX, e.clientY, { count: 14, sound: false });
    });
    row.appendChild(bar);
  });

  speech.speak(S.musicIntro, { interrupt: false });
  setReprompt(null);
  return () => { alive = false; };
}

export default {
  id: 'music',
  title: 'Music',
  icon: ICON,
  start,
};
