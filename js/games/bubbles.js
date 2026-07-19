// Bubbles: pure free play. Bubbles float up; tap to pop them.

import { randFloat, randInt, pick } from '../engine/rand.js';

const HUES = [200, 280, 330, 150, 45, 190, 260];

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bb-i" cx="35%" cy="30%" r="85%">
      <stop offset="0%" stop-color="#d8f4ff"/>
      <stop offset="70%" stop-color="#8ad4f0"/>
      <stop offset="100%" stop-color="#4aa8d8"/>
    </radialGradient>
  </defs>
  <circle cx="42" cy="46" r="30" fill="url(#bb-i)" opacity="0.9"/>
  <ellipse cx="32" cy="34" rx="9" ry="5.5" fill="#fff" opacity="0.8" transform="rotate(-24 32 34)"/>
  <circle cx="76" cy="26" r="13" fill="url(#bb-i)" opacity="0.85"/>
  <circle cx="72" cy="74" r="17" fill="url(#bb-i)" opacity="0.85"/>
  <ellipse cx="68" cy="68" rx="5" ry="3" fill="#fff" opacity="0.8" transform="rotate(-24 68 68)"/>
</svg>`;

function start(ctx) {
  const { stage, audio, celebrate, speech, setReprompt } = ctx;
  let alive = true;
  let bubbles = [];
  let raf = 0;
  let lastSpawn = 0;

  const canvas = document.createElement('canvas');
  canvas.className = 'bubble-canvas';
  stage.appendChild(canvas);
  const g = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    canvas.width = Math.floor(canvas.clientWidth * dpr);
    canvas.height = Math.floor(canvas.clientHeight * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn() {
    const w = canvas.clientWidth;
    const r = randFloat(Math.min(w, canvas.clientHeight) * 0.055, Math.min(w, canvas.clientHeight) * 0.11);
    bubbles.push({
      x: randFloat(r, w - r),
      y: canvas.clientHeight + r,
      r,
      vy: randFloat(0.5, 1.4),
      wob: randFloat(0, Math.PI * 2),
      wobSpeed: randFloat(0.01, 0.03),
      hue: pick(HUES),
      star: Math.random() < 0.12,
    });
  }

  function drawBubble(b) {
    const grad = g.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
    grad.addColorStop(0, `hsla(${b.hue}, 90%, 92%, 0.95)`);
    grad.addColorStop(0.7, `hsla(${b.hue}, 75%, 72%, 0.55)`);
    grad.addColorStop(1, `hsla(${b.hue}, 70%, 55%, 0.75)`);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    g.fill();
    // shine
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.ellipse(b.x - b.r * 0.35, b.y - b.r * 0.42, b.r * 0.22, b.r * 0.13, -0.5, 0, Math.PI * 2);
    g.fill();
    if (b.star) {
      g.fillStyle = 'rgba(255, 213, 74, 0.95)';
      g.save();
      g.translate(b.x, b.y);
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? b.r * 0.45 : b.r * 0.2;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  function tick(t) {
    if (!alive) return;
    g.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    if (t - lastSpawn > 700 && bubbles.length < 9) { spawn(); lastSpawn = t; }
    bubbles = bubbles.filter(b => b.y > -b.r * 2);
    for (const b of bubbles) {
      b.wob += b.wobSpeed;
      b.x += Math.sin(b.wob) * 0.6;
      b.y -= b.vy;
      drawBubble(b);
    }
    raf = requestAnimationFrame(tick);
  }

  canvas.addEventListener('pointerdown', e => {
    if (!alive) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // generous hit radius for tiny fingers
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (Math.hypot(x - b.x, y - b.y) < b.r * 1.45) {
        bubbles.splice(i, 1);
        audio.pop();
        if (b.star) {
          audio.chime();
          celebrate.burst(e.clientX, e.clientY, { count: 34 });
        } else {
          celebrate.burst(e.clientX, e.clientY, { count: 10, sound: false });
        }
        break;
      }
    }
  });

  for (let i = 0; i < 5; i++) { spawn(); bubbles[i].y = randFloat(0, canvas.clientHeight); }
  raf = requestAnimationFrame(tick);
  speech.speak('Pop the bubbles!');
  setReprompt(null);

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  };
}

export default {
  id: 'bubbles',
  title: 'Bubbles',
  icon: ICON,
  start,
};
