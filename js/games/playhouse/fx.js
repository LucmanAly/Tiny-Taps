// Play House particles: sparkles, hearts, stars, notes, confetti, puffs,
// splashes, leaves and tappable soap bubbles. All positions are world units.

import { quietMotion } from '../../engine/calm.js';

const PALETTE = ['#ff9fb2', '#ffd166', '#8fd3ff', '#b5e48c', '#d4b5ff', '#ffb38a'];
const pick = a => a[(Math.random() * a.length) | 0];

export function createFx() {
  let parts = [];
  let bubbles = [];

  function add(p) {
    parts.push(Object.assign({ age: 0, life: 1, vx: 0, vy: 0, g: 0, rot: 0, vr: 0, size: 20, alpha: 1 }, p));
    // A toddler can produce a lot of taps; never let effects pile up.
    if (parts.length > 420) parts.splice(0, parts.length - 420);
  }

  const fx = {
    sparkle(x, y, n = 10, spread = 140, colors = PALETTE) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = spread * (0.4 + Math.random() * 0.8);
        add({ kind: 'sparkle', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: 60,
          life: 0.6 + Math.random() * 0.4, size: 9 + Math.random() * 10, color: pick(colors), vr: (Math.random() - 0.5) * 6 });
      }
    },
    hearts(x, y, n = 4) {
      for (let i = 0; i < n; i++) {
        add({ kind: 'heart', x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 40, vy: -90 - Math.random() * 60,
          life: 1.3 + Math.random() * 0.5, size: 18 + Math.random() * 12, color: pick(['#ff7a9c', '#ff9fb2', '#ff6b8b']), wob: Math.random() * 6 });
      }
    },
    stars(x, y, n = 8, spread = 260) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4, v = spread * (0.5 + Math.random() * 0.6);
        add({ kind: 'star', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 300,
          life: 0.9 + Math.random() * 0.4, size: 16 + Math.random() * 12, color: pick(['#ffd54a', '#ffe680', '#ffc23a']), vr: (Math.random() - 0.5) * 8 });
      }
    },
    notes(x, y, n = 1) {
      for (let i = 0; i < n; i++) {
        add({ kind: 'note', x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 30, vy: -70 - Math.random() * 30,
          life: 1.6, size: 26, color: pick(['#7d6bd6', '#e86f9a', '#4aa3c9', '#e39b2a']), wob: Math.random() * 6 });
      }
    },
    confetti(x, y, n = 36) {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 260 + Math.random() * 320;
        add({ kind: 'confetti', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 520,
          life: 1.4 + Math.random() * 0.6, size: 12 + Math.random() * 10, color: pick(PALETTE), vr: (Math.random() - 0.5) * 12, drag: 1.6 });
      }
    },
    poof(x, y, n = 9, r = 80) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        add({ kind: 'puff', x: x + Math.cos(a) * r * 0.3, y: y + Math.sin(a) * r * 0.3, vx: Math.cos(a) * r * 1.6, vy: Math.sin(a) * r * 1.2 - 20,
          life: 0.55, size: r * (0.35 + Math.random() * 0.25), color: '#ffffff', drag: 3 });
      }
    },
    dust(x, y, dir = 0) {
      for (let i = 0; i < 3; i++) {
        add({ kind: 'puff', x: x + (Math.random() - 0.5) * 30, y, vx: -dir * (30 + Math.random() * 40), vy: -20 - Math.random() * 20,
          life: 0.45, size: 10 + Math.random() * 8, color: '#efe2cc', drag: 2.5, alpha: 0.8 });
      }
    },
    splash(x, y, big = 1) {
      for (let i = 0; i < 14 * big; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = (220 + Math.random() * 260) * Math.sqrt(big);
        add({ kind: 'drop', x: x + (Math.random() - 0.5) * 50, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900,
          life: 0.7, size: 7 + Math.random() * 6, color: '#9fd6f5' });
      }
      add({ kind: 'ring', x, y, life: 0.6, size: 60 * big, color: '#d7f0ff' });
    },
    // One drop of water falling from (x, y) until it reaches `landY`.
    drip(x, y, landY, vx = 0) {
      const g = 1500, vy = 120;
      const d = Math.max(10, landY - y);
      const life = (-vy + Math.sqrt(vy * vy + 2 * g * d)) / g;
      add({ kind: 'drop', x, y, vx, vy, g, life, size: 5 + Math.random() * 3, color: '#8fcdf2', alpha: 0.95 });
    },
    // A sprinkle of seeds tumbling into the soil.
    seeds(x, y, n = 8) {
      for (let i = 0; i < n; i++) {
        add({ kind: 'drop', x: x + (Math.random() - 0.5) * 40, y, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 80,
          g: 900, life: 0.45 + Math.random() * 0.2, size: 4 + Math.random() * 2, color: pick(['#8a5a35', '#c9a36b', '#6b4a3a']) });
      }
    },
    leaves(x, y, n = 8, spread = 200) {
      for (let i = 0; i < n; i++) {
        add({ kind: 'leaf', x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread * 0.4,
          vx: (Math.random() - 0.5) * 60, vy: 30 + Math.random() * 40, g: 30, life: 2.2 + Math.random(), size: 16 + Math.random() * 8,
          color: pick(['#7dbd66', '#a6d88a', '#e8c35a', '#f0a25a']), vr: (Math.random() - 0.5) * 5, wob: Math.random() * 6, drag: 0.8 });
      }
    },
    zzz(x, y) {
      add({ kind: 'zzz', x, y, vx: 26, vy: -46, life: 2.2, size: 30, color: '#6c6ab0' });
    },
    ripple(x, y) {
      add({ kind: 'tap', x, y, life: 0.42, size: 70, color: '#ffffff' });
    },
    flash() {
      // No white flash for a child who should not have one (Calm or
      // the device's reduce motion): the shutter sound is enough.
      if (quietMotion()) return;
      add({ kind: 'flash', x: 0, y: 0, life: 0.32 });
    },
    // Soap bubbles float up, wobble, and pop when touched or when they age.
    bubble(x, y, n = 1) {
      for (let i = 0; i < n; i++) {
        bubbles.push({ x: x + (Math.random() - 0.5) * 30, y, vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 70,
          r: 18 + Math.random() * 26, age: 0, life: 4 + Math.random() * 3, wob: Math.random() * 6 });
      }
      if (bubbles.length > 40) bubbles.splice(0, bubbles.length - 40);
    },
    popBubbleAt(x, y, pad = 30) {
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (Math.hypot(b.x - x, b.y - y) < b.r + pad) {
          bubbles.splice(i, 1);
          fx.sparkle(b.x, b.y, 6, 90, ['#ffffff', '#d8f0ff', '#ffd6f0']);
          return b;
        }
      }
      return null;
    },
    bubblesNear(x, y, r) {
      return bubbles.some(b => Math.hypot(b.x - x, b.y - y) < r);
    },
    get bubbleCount() { return bubbles.length; },

    update(dt) {
      for (const p of parts) {
        p.age += dt;
        if (p.drag) { p.vx *= Math.exp(-p.drag * dt); p.vy *= Math.exp(-p.drag * dt); }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
      parts = parts.filter(p => p.age < p.life);
      for (const b of bubbles) {
        b.age += dt;
        b.vx *= Math.exp(-0.8 * dt);
        b.vy += (-40 - b.vy) * dt * 0.8;
        b.x += (b.vx + Math.sin(b.age * 2 + b.wob) * 25) * dt;
        b.y += b.vy * dt;
      }
      const popped = bubbles.filter(b => b.age >= b.life);
      for (const b of popped) fx.sparkle(b.x, b.y, 4, 60, ['#ffffff', '#d8f0ff']);
      bubbles = bubbles.filter(b => b.age < b.life);
      return popped.length;
    },

    draw(g) {
      for (const b of bubbles) drawBubble(g, b);
      for (const p of parts) drawPart(g, p);
    },
    hasFlash() { return parts.some(p => p.kind === 'flash'); },
    flashAlpha() {
      const f = parts.find(p => p.kind === 'flash');
      return f ? 0.85 * (1 - f.age / f.life) : 0;
    },
    clear() { parts = []; bubbles = []; },
  };
  return fx;
}

function drawBubble(g, b) {
  const k = Math.min(1, b.age * 4);
  g.save();
  g.globalAlpha = k * 0.9;
  g.translate(b.x, b.y);
  const r = b.r * (0.6 + 0.4 * k);
  const grad = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.15)');
  grad.addColorStop(0.75, 'rgba(200,235,255,0.18)');
  grad.addColorStop(1, 'rgba(255,190,240,0.55)');
  g.fillStyle = grad;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = Math.max(1.5, r * 0.06);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.ellipse(-r * 0.38, -r * 0.4, r * 0.2, r * 0.11, -0.6, 0, Math.PI * 2); g.fill();
  g.restore();
}

function starPath(g, r, inner = 0.45, points = 5) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  g.closePath();
}

export function heartPath(g, s) {
  g.beginPath();
  g.moveTo(0, s * 0.35);
  g.bezierCurveTo(-s * 0.9, -s * 0.25, -s * 0.45, -s * 0.95, 0, -s * 0.45);
  g.bezierCurveTo(s * 0.45, -s * 0.95, s * 0.9, -s * 0.25, 0, s * 0.35);
  g.closePath();
}

function drawPart(g, p) {
  const t = p.age / p.life;
  g.save();
  g.globalAlpha = p.alpha * (t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25);
  switch (p.kind) {
    case 'sparkle': {
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      const s = p.size * (1 - t * 0.6);
      g.fillStyle = p.color;
      starPath(g, s, 0.3, 4);
      g.fill();
      break;
    }
    case 'star': {
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.strokeStyle = 'rgba(160,100,20,0.45)';
      g.lineWidth = 2.5;
      starPath(g, p.size);
      g.fill(); g.stroke();
      break;
    }
    case 'heart': {
      g.translate(p.x + Math.sin(p.age * 4 + p.wob) * 10, p.y);
      g.scale(1, 1);
      g.fillStyle = p.color;
      heartPath(g, p.size * (0.6 + Math.min(1, p.age * 5) * 0.4));
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 2;
      g.stroke();
      break;
    }
    case 'note': {
      g.translate(p.x + Math.sin(p.age * 3 + p.wob) * 12, p.y);
      g.fillStyle = p.color;
      g.strokeStyle = p.color;
      g.lineWidth = 4;
      g.beginPath(); g.ellipse(0, 0, 9, 7, -0.4, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(8, -2); g.lineTo(8, -28); g.quadraticCurveTo(16, -22, 20, -14); g.stroke();
      break;
    }
    case 'confetti': {
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      break;
    }
    case 'puff': {
      g.fillStyle = p.color;
      g.globalAlpha *= 0.85;
      g.beginPath(); g.arc(p.x, p.y, p.size * (1 + t * 0.8), 0, Math.PI * 2); g.fill();
      break;
    }
    case 'drop': {
      g.fillStyle = p.color;
      g.beginPath(); g.arc(p.x, p.y, p.size * (1 - t * 0.4), 0, Math.PI * 2); g.fill();
      break;
    }
    case 'ring': {
      g.strokeStyle = p.color;
      g.lineWidth = 6 * (1 - t);
      g.beginPath(); g.ellipse(p.x, p.y, p.size * (0.4 + t * 1.2), p.size * 0.3 * (0.4 + t * 1.2), 0, 0, Math.PI * 2); g.stroke();
      break;
    }
    case 'leaf': {
      g.translate(p.x + Math.sin(p.age * 3 + p.wob) * 20, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.beginPath(); g.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(80,60,30,0.3)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(-p.size * 0.8, 0); g.lineTo(p.size * 0.8, 0); g.stroke();
      break;
    }
    case 'zzz': {
      g.fillStyle = p.color;
      g.font = `800 ${Math.round(p.size * (0.7 + t * 0.6))}px "Comic Sans MS", "Chalkboard SE", system-ui, sans-serif`;
      g.textAlign = 'center';
      g.fillText('z', p.x, p.y);
      break;
    }
    case 'tap': {
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.lineWidth = 7 * (1 - t);
      g.beginPath(); g.arc(p.x, p.y, p.size * (0.25 + t), 0, Math.PI * 2); g.stroke();
      break;
    }
    default: break;
  }
  g.restore();
}
