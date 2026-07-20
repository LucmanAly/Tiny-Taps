// Confetti + star celebrations drawn on a fullscreen overlay canvas.

import * as audio from './audio.js';
import * as speech from './speech.js';
import * as stickers from './stickers.js';

const COLORS = ['#ff8a70', '#ffd54a', '#7ed67e', '#62d9d0', '#b98aef', '#ff9fce', '#73b9ff'];

let canvas, g;
let particles = [];
let running = false;

export function init(canvasEl) {
  canvas = canvasEl;
  g = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawn(x, y, count, spread) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.3 + Math.random() * 0.7) * spread;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - spread * 0.45,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: 6 + Math.random() * 9,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      star: Math.random() < 0.3,
      life: 1,
      decay: 0.008 + Math.random() * 0.008,
    });
  }
  if (!running) { running = true; requestAnimationFrame(tick); }
}

function drawStar(x, y, r, rot, color) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = color;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath();
  g.fill();
  g.restore();
}

function tick() {
  g.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter(p => p.life > 0 && p.y < innerHeight + 40);
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.vx *= 0.99;
    p.rot += p.vr;
    p.life -= p.decay;
    g.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
    if (p.star) {
      drawStar(p.x, p.y, p.size, p.rot, p.color);
    } else {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      g.restore();
    }
  }
  g.globalAlpha = 1;
  if (particles.length > 0) {
    requestAnimationFrame(tick);
  } else {
    running = false;
    g.clearRect(0, 0, innerWidth, innerHeight);
  }
}

// Small burst at a point (e.g., where the child tapped the right answer).
export function burst(x, y, { count = 26, sound = true } = {}) {
  spawn(x, y, count, 9);
  if (sound) audio.sparkle();
}

// Full celebration: confetti rain + fanfare + spoken praise. Big wins also
// drop an animal sticker into the sticker book until it's full.
export function big({ praise = true, sticker = true } = {}) {
  audio.tada();
  const bursts = 6;
  for (let i = 0; i < bursts; i++) {
    setTimeout(() => {
      spawn(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * 0.3, 34, 11);
    }, i * 160);
  }
  if (praise) speech.praise();
  if (sticker) {
    const a = stickers.award();
    if (a) setTimeout(() => stickers.showToast(a), 900);
  }
}
