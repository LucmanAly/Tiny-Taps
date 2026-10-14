// Play House "Play Together" photos.
//
// When brother and sister share a moment, a camera flashes and a polaroid of
// that moment pops up, then flies to its own frame on the photo wall in the
// house. The ten frames fill up over time and stay filled between visits
// (kept in this device's localStorage only). Tapping a filled frame shows the
// photo big again.

import { PLACES } from './layout.js';
import { MOMENTS, MOMENT_ORDER, loadImages } from './assets.js';
import { heartPath } from './fx.js';
import { childKey } from '../../engine/children.js';

const LS_PHOTOS = 'tinytaps-playhouse-photos';
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const ease = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const FRAME_COLORS = ['#c98d55', '#fff3df', '#f6b7c3', '#bfe2e3', '#ffd37a'];

export function createMoments(W) {
  const { audio, fx } = W;
  let collected = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(childKey(LS_PHOTOS)) || '[]');
    if (Array.isArray(saved)) collected = new Set(saved.filter(id => MOMENTS[id]));
  } catch (e) { /* private mode or bad data: start empty */ }

  const loads = new Map();
  function loadMoment(id) {
    if (!loads.has(id)) {
      loads.set(id, loadImages({ ['moment_' + id]: MOMENTS[id].src }).then(m => {
        if (m['moment_' + id]) W.img['moment_' + id] = m['moment_' + id];
      }));
    }
    return loads.get(id);
  }
  // Frames that are already filled need their pictures straight away; the
  // rest arrive quietly a little later so the first one is instant.
  collected.forEach(loadMoment);
  const warm = setTimeout(() => MOMENT_ORDER.forEach(loadMoment), 2500);
  W.on('destroy', () => clearTimeout(warm));

  const P = PLACES.photos;
  function frameRect(id) {
    const i = MOMENT_ORDER.indexOf(id);
    const col = i % P.cols, row = Math.floor(i / P.cols);
    return { x: P.x0 + col * (P.size + P.gap), y: P.y0 + row * (P.size + P.gap), w: P.size, h: P.size, i };
  }

  /* ---------------- the wall ---------------- */

  const glowAt = new Map();
  const wiggle = new Map();
  const wall = {
    layer: 'houseDecal', x: P.x0 + 250, y: 300,
    draw(g) {
      for (const id of MOMENT_ORDER) {
        const r = frameRect(id);
        const wob = wiggle.get(id) || 0;
        g.save();
        g.translate(r.x + r.w / 2, r.y + r.h / 2);
        g.rotate(((r.i % 3) - 1) * 0.03 + Math.sin(wob * 20) * 0.08 * wob);
        // Frame, mat, then the photo or an empty heart.
        g.fillStyle = 'rgba(90,50,20,0.15)';
        g.fillRect(-r.w / 2 + 4, -r.h / 2 + 6, r.w, r.h);
        g.fillStyle = FRAME_COLORS[r.i % FRAME_COLORS.length];
        g.strokeStyle = 'rgba(107,74,58,0.7)';
        g.lineWidth = 3;
        g.fillRect(-r.w / 2, -r.h / 2, r.w, r.h);
        g.strokeRect(-r.w / 2, -r.h / 2, r.w, r.h);
        const m = 9;
        g.fillStyle = collected.has(id) ? '#fef7e8' : '#f6eadb';
        g.fillRect(-r.w / 2 + m, -r.h / 2 + m, r.w - m * 2, r.h - m * 2);
        const img = W.img['moment_' + id];
        if (collected.has(id) && img) {
          drawContain(g, img, 0, 0, r.w - m * 2 - 4, r.h - m * 2 - 4);
        } else {
          g.fillStyle = 'rgba(240,150,170,0.35)';
          heartPath(g, 20);
          g.fill();
        }
        g.strokeStyle = 'rgba(107,74,58,0.35)';
        g.lineWidth = 2;
        g.strokeRect(-r.w / 2 + m, -r.h / 2 + m, r.w - m * 2, r.h - m * 2);
        const glow = glowAt.get(id);
        if (glow && W.t - glow < 1.6) {
          g.globalAlpha = 1 - (W.t - glow) / 1.6;
          g.strokeStyle = '#ffe680';
          g.lineWidth = 8;
          g.strokeRect(-r.w / 2 - 6, -r.h / 2 - 6, r.w + 12, r.h + 12);
        }
        g.restore();
      }
      // A little hook and string the frames hang from.
      g.strokeStyle = 'rgba(107,74,58,0.4)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(P.x0 - 10, P.y0 - 14); g.lineTo(P.x0 + 5 * (P.size + P.gap) - P.gap + 10, P.y0 - 14); g.stroke();
    },
    hit(x, y) {
      this.picked = MOMENT_ORDER.find(id => {
        const r = frameRect(id);
        return x > r.x - 8 && x < r.x + r.w + 8 && y > r.y - 8 && y < r.y + r.h + 8;
      });
      return !!this.picked;
    },
    tap() {
      const id = this.picked;
      if (!id) return;
      wiggle.set(id, 1);
      if (collected.has(id)) {
        zoom.open(id);
      } else {
        audio.bell(MOMENT_ORDER.indexOf(id));
      }
    },
    update(dt) {
      for (const [id, v] of wiggle) wiggle.set(id, Math.max(0, v - dt * 1.6));
    },
  };

  function drawContain(g, img, cx, cy, w, h) {
    const k = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    g.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  }

  /* ---------------- snapping a photo ---------------- */

  const shots = [];
  let lastSnap = -99;
  W.moments = {
    // Returns true when a photo was taken (they are rationed so a toddler
    // tapping fast still gets the moment, just not a blizzard of photos).
    snap(id, x, y) {
      if (!MOMENTS[id] || W.t - lastSnap < 7) return false;
      lastSnap = W.t;
      loadMoment(id);
      // Beside the moment, toward the middle of the screen, never over it.
      const cam = W.cam;
      const px = x + (x > cam.x + cam.viewW / 2 ? -300 : 300);
      const sx = clamp(px, cam.x + 190, cam.x + cam.viewW - 190);
      const sy = clamp(y - 40, cam.top + 200, 520);
      shots.push({ id, x: sx, y: sy, t0: W.t, fresh: !collected.has(id) });
      fx.flash();
      audio.shutter();
      setTimeout(() => { if (W.isAlive()) W.say(MOMENTS[id].word); }, 380);
      return true;
    },
    has: id => collected.has(id),
    get count() { return collected.size; },
  };

  function arrive(shot) {
    const fresh = !collected.has(shot.id);
    collected.add(shot.id);
    try { localStorage.setItem(childKey(LS_PHOTOS), JSON.stringify([...collected])); } catch (e) { /* storage full or blocked */ }
    glowAt.set(shot.id, W.t);
    const r = frameRect(shot.id);
    fx.sparkle(r.x + r.w / 2, r.y + r.h / 2, fresh ? 18 : 8, 160);
    audio.bell(fresh ? 7 : 4);
    if (fresh && collected.size === MOMENT_ORDER.length) {
      // Every frame filled: a proper party.
      setTimeout(() => {
        if (!W.isAlive()) return;
        audio.tada();
        for (let i = 0; i < 4; i++) fx.confetti(P.x0 + 120 * i, P.y0, 26);
      }, 500);
    }
  }

  // Polaroids live in world space so they really travel to the wall, even
  // when the wall is off screen.
  const polaroids = {
    layer: 'none',
    drawUI(g) {
      for (const s of shots) drawShot(g, s);
    },
    update() {
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (W.t - s.t0 > 2.6) { arrive(s); shots.splice(i, 1); }
      }
    },
  };

  function drawShot(g, s) {
    const age = W.t - s.t0;
    const r = frameRect(s.id);
    const big = 300;
    let x = s.x, y = s.y, size = big, rot = -0.08;
    if (age < 0.35) {
      const k = ease(age / 0.35);
      size = big * (0.3 + 0.7 * k);
      rot = -0.4 + 0.32 * k;
      y = s.y + (1 - k) * 60;
    } else if (age > 1.5) {
      const k = easeInOut(clamp((age - 1.5) / 1.1, 0, 1));
      x = s.x + (r.x + r.w / 2 - s.x) * k;
      y = s.y + (r.y + r.h / 2 - s.y) * k - Math.sin(k * Math.PI) * 160;
      size = big + (r.w - big) * k;
      rot = -0.08 * (1 - k) + k * 0.6 * Math.sin(k * Math.PI);
    } else {
      rot = -0.08 + Math.sin(age * 5) * 0.02;
    }
    const k = size / big;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(k, k);
    g.fillStyle = 'rgba(40,30,20,0.25)';
    g.fillRect(-big / 2 + 8, -big * 0.56 + 12, big, big * 1.16);
    g.fillStyle = '#fffdf6';
    g.strokeStyle = 'rgba(107,74,58,0.6)';
    g.lineWidth = 4;
    g.fillRect(-big / 2, -big * 0.56, big, big * 1.16);
    g.strokeRect(-big / 2, -big * 0.56, big, big * 1.16);
    const sky = g.createLinearGradient(0, -big * 0.48, 0, big * 0.4);
    sky.addColorStop(0, '#cfeefe');
    sky.addColorStop(1, '#fff1dc');
    g.fillStyle = sky;
    g.fillRect(-big * 0.44, -big * 0.48, big * 0.88, big * 0.88);
    const img = W.img['moment_' + s.id];
    if (img) drawContain(g, img, 0, -big * 0.04, big * 0.86, big * 0.86);
    if (s.fresh && age < 1.5) {
      g.fillStyle = '#ff7a9c';
      g.translate(big * 0.36, big * 0.5);
      heartPath(g, 26 + Math.sin(age * 10) * 3);
      g.fill();
    }
    g.restore();
  }

  /* ---------------- looking at a photo again ---------------- */

  const zoom = {
    id: null, t0: 0,
    open(id) {
      this.id = id;
      this.t0 = W.t;
      loadMoment(id);
      audio.chime();
      W.say(MOMENTS[id].word);
    },
    draw(g) {
      if (!this.id) return;
      const sw = W.cam.screenW, sh = W.cam.screenH;
      const age = W.t - this.t0;
      if (age > 5) { this.id = null; return; }
      const a = Math.min(1, age * 5) * (age > 4.6 ? (5 - age) / 0.4 : 1);
      g.save();
      g.globalAlpha = a;
      g.fillStyle = 'rgba(30,24,50,0.72)';
      g.fillRect(0, 0, sw, sh);
      const side = Math.min(sw * 0.7, sh * 0.72);
      const k = 0.85 + 0.15 * ease(Math.min(1, age * 4));
      g.translate(sw / 2, sh / 2);
      g.scale(k, k);
      g.rotate(-0.03);
      g.fillStyle = '#fffdf6';
      g.fillRect(-side * 0.56, -side * 0.6, side * 1.12, side * 1.24);
      const img = W.img['moment_' + this.id];
      if (img) drawContain(g, img, 0, -side * 0.04, side, side);
      g.restore();
    },
    hit() { return !!this.id; },
    tap() { this.id = null; audio.pop(); },
  };

  W.add(wall);
  W.add(polaroids);
  W.ui.push(zoom);
  return W.moments;
}
