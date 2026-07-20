// Wash the Animal: rub the mud off with a finger until the animal shines.
// A new rubbing fine-motor mechanic toddlers can't resist.

import { ANIMALS, preloadSounds } from '../data/animals.js';
import { cycler } from '../engine/rand.js';
import { S } from '../data/strings.js';

const nextAnimal = cycler(ANIMALS);
const CLEAR_TARGET = 0.78; // fraction of mud that must be rubbed away to finish

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="wa-i" cx="35%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#bfe6ff"/><stop offset="100%" stop-color="#4aa8d8"/>
    </radialGradient>
  </defs>
  <circle cx="50" cy="55" r="34" fill="url(#wa-i)"/>
  <path d="M50 20 C56 30 60 36 56 44 C52 50 44 48 44 40 C44 32 46 26 50 20 Z" fill="#8ac4e0"/>
  <circle cx="38" cy="50" r="6" fill="#6b4a2a" opacity="0.7"/>
  <circle cx="60" cy="60" r="8" fill="#6b4a2a" opacity="0.6"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let current = null;
  let done = false;
  let rubbing = false;
  let lastCheck = 0;

  const scene = document.createElement('div');
  scene.className = 'wash-scene';
  const img = document.createElement('img');
  img.className = 'wash-animal';
  img.alt = '';
  const canvas = document.createElement('canvas');
  canvas.className = 'wash-canvas';
  scene.appendChild(img);
  scene.appendChild(canvas);
  stage.appendChild(scene);

  const g = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintMud();
  }
  window.addEventListener('resize', resize);

  function paintMud() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(120, 84, 48, 0.9)';
    if (g.roundRect) {
      g.beginPath();
      g.roundRect(0, 0, w, h, Math.min(w, h) * 0.14);
      g.fill();
    } else {
      g.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = `rgba(90, 60, 32, ${0.25 + Math.random() * 0.2})`;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, w * (0.1 + Math.random() * 0.12), 0, Math.PI * 2);
      g.fill();
    }
  }

  function clearedFraction() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const grid = 10;
    let cleared = 0, total = 0;
    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        const x = Math.min(canvas.width - 1, Math.floor(((i + 0.5) / grid) * w * dpr));
        const y = Math.min(canvas.height - 1, Math.floor(((j + 0.5) / grid) * h * dpr));
        const data = g.getImageData(x, y, 1, 1).data;
        total++;
        if (data[3] < 40) cleared++;
      }
    }
    return total ? cleared / total : 0;
  }

  function rubAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(x, y, canvas.clientWidth * 0.14, 0, Math.PI * 2);
    g.fill();
  }

  async function checkDone() {
    if (done || !alive) return;
    if (clearedFraction() >= CLEAR_TARGET) {
      done = true;
      g.globalCompositeOperation = 'destination-out';
      g.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      const r = scene.getBoundingClientRect();
      celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 30 });
      if (current.sound) await audio.play('animal:' + current.id, { maxDuration: 2.2 });
      if (!alive) return;
      const upcoming = nextAnimal();
      celebrate.big({ quick: false, nextAnimalId: upcoming.id });
      setTimeout(() => newRound(false, upcoming), 1000);
    }
  }

  function onDown(e) {
    if (!alive || done) return;
    rubbing = true;
    canvas.setPointerCapture(e.pointerId);
    rubAt(e.clientX, e.clientY);
    audio.pop();
  }
  function onMove(e) {
    if (!alive || done || !rubbing) return;
    rubAt(e.clientX, e.clientY);
    const now = performance.now();
    if (now - lastCheck > 220) {
      lastCheck = now;
      checkDone();
    }
  }
  function onUp() {
    rubbing = false;
    checkDone();
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  function newRound(first, preset) {
    if (!alive) return;
    done = false;
    current = preset || nextAnimal();
    img.src = current.art;
    if (current.sound) preloadSounds(audio, [current.id]);
    resize();
    speech.speak(S.washIntro(current.name), { interrupt: false });
  }

  setReprompt(() => speech.speak(S.washReprompt));
  newRound(true);

  return () => {
    alive = false;
    window.removeEventListener('resize', resize);
  };
}

export default {
  id: 'wash',
  title: 'Wash the Animal',
  icon: ICON,
  start,
};
