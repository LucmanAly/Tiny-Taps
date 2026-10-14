// Play House: the house. A lamp, a bed that brings the night, the baby's
// cot with its music-box mobile, a wardrobe of outfits, curtains that
// sometimes hide a visitor, a toy box that spills and tidies, and the door out
// to the garden.

import { PLACES, WORLD, depthAt, floorFor, roomAt } from './layout.js';
import { OUTFITS, boundsOf, CAT, OWL, BUSH_ANIMALS } from './assets.js';
import { heartPath } from './fx.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - t, 3);
const INK = 'rgba(107,74,58,0.75)';

export function createHome(W) {
  const { audio, fx } = W;
  const sprite = name => W.sprites[name];
  W.lampOn = false;

  /* ---------------- lamp ----------------
     A pull-cord lamp: on, its shade glows gold and it throws a cone of warm
     light down over the nightstand and a halo up the wall, by day as well as
     by night (when it also lights the whole room; see the glow below). */

  const lamp = {
    x: PLACES.nightstand.x, y: PLACES.nightstand.y, z: PLACES.nightstand.y, wob: 0, tug: 0,
    draw(g) {
      W.blit(g, sprite('nightstand'), this.x, this.y);
      const top = this.y - 160;
      if (W.lampOn) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        const halo = g.createRadialGradient(this.x, top - 150, 20, this.x, top - 150, 230);
        halo.addColorStop(0, 'rgba(255,226,140,0.42)');
        halo.addColorStop(1, 'rgba(255,226,140,0)');
        g.fillStyle = halo;
        g.beginPath(); g.arc(this.x, top - 150, 230, 0, Math.PI * 2); g.fill();
        const cone = g.createLinearGradient(0, top - 112, 0, this.y + 70);
        cone.addColorStop(0, 'rgba(255,222,130,0.4)');
        cone.addColorStop(1, 'rgba(255,222,130,0)');
        g.fillStyle = cone;
        g.beginPath();
        g.moveTo(this.x - 58, top - 112);
        g.lineTo(this.x + 58, top - 112);
        g.lineTo(this.x + 175, this.y + 70);
        g.lineTo(this.x - 120, this.y + 70);
        g.closePath();
        g.fill();
        g.restore();
      }
      g.save();
      g.translate(this.x, top);
      const sq = Math.sin(this.wob * 18) * 0.1 * this.wob;
      g.scale(1 + sq, 1 - sq);
      W.blit(g, sprite(W.lampOn ? 'lampOn' : 'lampOff'));
      // The pull cord, which jiggles when it is pulled.
      const sway = Math.sin(this.tug * 22) * 9 * this.tug;
      const end = -76 + this.tug * 12;
      g.strokeStyle = INK;
      g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(40, -110); g.quadraticCurveTo(40 + sway * 0.4, (end - 110) / 2, 40 + sway, end); g.stroke();
      g.fillStyle = '#f4a9a0';
      g.beginPath(); g.arc(40 + sway, end + 5, 6, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    },
    hit(x, y) { return x > this.x - 80 && x < this.x + 80 && y > this.y - 360 && y < this.y + 10; },
    tap() {
      W.lampOn = !W.lampOn;
      this.wob = 0.6;
      this.tug = 1;
      audio.click();
      setTimeout(() => { if (W.isAlive()) audio.bell(W.lampOn ? 5 : 2); }, 70);
      if (W.lampOn) fx.sparkle(this.x, this.y - 300, 10, 120, ['#fff2b0', '#ffe07a', '#ffffff']);
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.8);
      this.tug = Math.max(0, this.tug - dt * 1.6);
    },
    hint() { this.wob = 0.8; this.tug = 0.7; },
  };

  W.on('glow', ({ g, n }) => {
    if (W.lampOn) {
      const lx = lamp.x, ly = lamp.y - 300;
      const glow = g.createRadialGradient(lx, ly, 30, lx, ly, 720);
      glow.addColorStop(0, `rgba(255,205,120,${0.6 * n})`);
      glow.addColorStop(0.4, `rgba(255,190,110,${0.22 * n})`);
      glow.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = glow;
      g.fillRect(0, -100, 1640, 920);
    }
    // A warm light in the attic window, so the house looks lived in.
    const at = g.createRadialGradient(830, -150, 10, 830, -150, 90);
    at.addColorStop(0, `rgba(255,214,140,${0.75 * n})`);
    at.addColorStop(1, 'rgba(255,214,140,0)');
    g.fillStyle = at;
    g.beginPath(); g.arc(830, -150, 90, 0, Math.PI * 2); g.fill();
  });

  /* ---------------- bed ---------------- */

  const bed = {
    x: PLACES.bed.x, y: PLACES.bed.y, z: PLACES.bed.y, wob: 0,
    draw(g) {
      const sq = Math.sin(this.wob * 16) * 0.05 * this.wob;
      g.save();
      g.translate(this.x, this.y);
      g.scale(1 + sq, 1 - sq);
      W.blit(g, sprite('bedBack'));
      const boy = W.boy;
      if (boy && boy.state === 'sleep' && boy.imgs.sleep) drawSleeper(g, boy.imgs.sleep);
      W.blit(g, sprite('bedQuilt'));
      g.restore();
    },
    hit(x, y) { return x > this.x - 250 && x < this.x + 250 && y > this.y - 270 && y < this.y + 10; },
    tap() {
      this.wob = 1;
      audio.boing();
      const boy = W.boy;
      if (boy.state === 'sleep') boy.wake();
      else boy.goToBed();
    },
    update(dt) { this.wob = Math.max(0, this.wob - dt * 1.6); },
    hint() { this.wob = 0.8; },
  };

  // Lying down, head on the pillow, the quilt drawn over him afterwards.
  function drawSleeper(g, img) {
    const bb = boundsOf(img);
    const contentW = 262;
    const scale = contentW / ((bb.x1 - bb.x0) * img.naturalWidth);
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    const breathe = 1 + Math.sin(W.t * 2) * 0.015;
    g.save();
    g.translate(-196 - bb.x0 * dw, -98);
    g.scale(1, breathe);
    g.drawImage(img, 0, -bb.y1 * dh, dw, dh);
    g.restore();
  }

  /* ---------------- the baby's cot ----------------
     Carrying the baby over it makes it glow, and letting go there lays her
     in it: the mobile turns to a music-box tune and she drifts off. Tapping
     the cot plays the tune again, or calls her over to it from anywhere in
     the house; touching her wakes her, lifting her takes her out, and once
     she has been awake a while she climbs out by herself. */

  const COT = PLACES.cot;
  const COT_DEPTH = depthAt(COT.y);
  const MATTRESS = -84;
  const TUNE_SECS = 2.6;
  const cot = {
    x: COT.x, y: COT.y, z: COT.y, wob: 0, glow: 0, hover: false, squeakAt: 0,
    spin: 0, spinV: 0.2, playingUntil: 0, hop: null, awakeSince: 0,
    get playing() { return W.t < this.playingUntil; },
    hasBaby() { return W.baby.state === 'cot' && W.baby.cot === this; },
    draw(g) {
      if (this.glow > 0) {
        const pulse = 0.8 + Math.sin(W.t * 7) * 0.2;
        g.save();
        g.globalAlpha = this.glow;
        g.strokeStyle = '#ffc93c';
        g.lineWidth = 9;
        g.setLineDash([18, 12]);
        g.lineDashOffset = -W.t * 40;
        g.beginPath(); g.ellipse(this.x, this.y + 6, 160 * pulse, 26 * pulse, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      g.fillStyle = 'rgba(70,40,20,0.18)';
      g.beginPath(); g.ellipse(this.x, this.y + 2, 150, 16, 0, 0, Math.PI * 2); g.fill();
      const sq = Math.sin(this.wob * 16) * 0.04 * this.wob;
      g.save();
      g.translate(this.x, this.y);
      g.scale(1 + sq, 1 - sq);
      W.blit(g, sprite('cotBack'));
      if (this.hasBaby()) drawBabyInCot(g);
      W.blit(g, sprite('cotFront'));
      g.restore();
      drawMobile(g);
    },
    hit(x, y) {
      if (Math.abs(x - this.x) < 150 && y > this.y - 280 && y < this.y + 16) return true;
      // The mobile above it.
      return x > this.x - 40 && x < this.x + 150 && y > this.y - 340 && y < this.y - 250;
    },
    // Her part of the cot (lifting her out, waking her): above the mattress.
    seatHit(x, y) { return Math.abs(x - this.x) < 125 && y > this.y - 300 && y < this.y - 40; },
    // Whether the baby, carried with her feet at (x, foot), would go in.
    takes(x, foot) { return Math.abs(x - this.x) < 170 && foot > this.y - 320 && foot < this.y + 110; },
    press() { this.wob = 0.8; this.spinV = Math.max(this.spinV, 1.2); },
    tap() {
      audio.pop();
      if (this.hasBaby()) {
        if (!W.baby.nap) this.playTune(true);
        return;
      }
      if (!this.callBaby()) this.playTune(false);
    },
    // A music-box tune while the mobile turns; with `lull`, the baby in the
    // cot is asleep by the end of it.
    playTune(lull) {
      if (this.playing) return;
      this.playingUntil = W.t + TUNE_SECS;
      this.spinV = 2.4;
      const still = () => !lull || (this.hasBaby() && !W.baby.nap);
      W.kids.hum(this.x + 60, this.y - 300, still, () => {
        if (!lull || !this.hasBaby()) return;
        W.baby.nap = true;
        W.baby.stateT = 0;
        audio.sleepyCoo();
        fx.hearts(this.x, this.y - 210, 2);
      });
    },
    // The baby crawls over from wherever she is in the house and climbs in.
    callBaby() {
      const baby = W.baby;
      if (!baby.free() || roomAt(baby.x) !== 'home') return false;
      const f = floorFor(this.x);
      const side = baby.x < this.x ? -1 : 1;
      audio.babble();
      baby.crawlOver(clamp(this.x + side * 165, f.x0, f.x1), f.y0 + 30, () => {
        if (!this.hasBaby() && baby.free() && Math.abs(baby.x - this.x) < 260) seatInCot({ x: baby.x, y: baby.y });
      });
      return true;
    },
    release() {
      this.hop = null;
      this.playingUntil = 0;
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      this.spin += this.spinV * dt;
      this.spinV = Math.max(0.2, this.spinV * Math.exp(-0.5 * dt));
      // Glows while the baby is carried over it.
      const b = W.baby;
      const hover = b.held && this.takes(b.hold.x, b.heldFoot(b.hold.y));
      if (hover && !this.hover && W.t > this.squeakAt) {
        this.squeakAt = W.t + 0.45;
        this.wob = 0.8;
        audio.bell(6);
        fx.sparkle(this.x, this.y - 240, 6, 110);
      }
      this.hover = hover;
      this.glow = clamp(this.glow + (hover ? 6 : -4) * dt, 0, 1);
      if (this.hop && W.t - this.hop.t0 > 0.55) this.hop = null;
      // Awake for a while with nothing happening, she climbs out by herself.
      if (!this.hasBaby() || b.nap || this.playing) this.awakeSince = W.t;
      else if (W.t - this.awakeSince > 10) climbOut();
    },
    hint() { this.wob = 0.8; this.spinV = Math.max(this.spinV, 1.4); },
  };
  W.cot = cot;

  // Lays the baby in the cot. `from` is where she hops in from, if she
  // climbed in by herself rather than being carried.
  function seatInCot(from = null) {
    const baby = W.baby;
    baby.held = false;
    baby.stroller = null;
    baby.cot = cot;
    baby.nap = false;
    baby.crawlTo = null;
    baby.then = null;
    if (baby.want !== 'brother') baby.want = null;
    baby.setState('cot');
    baby.x = cot.x;
    baby.y = cot.y + 1;
    baby.squash = 0.6;
    cot.hop = from ? { from, t0: W.t } : null;
    cot.wob = 1;
    cot.awakeSince = W.t;
    audio.giggle();
    fx.sparkle(cot.x, cot.y - 200, 10, 140);
    setTimeout(() => { if (W.isAlive() && cot.hasBaby()) cot.playTune(true); }, from ? 650 : 350);
  }

  // Out she climbs, onto the rug in front.
  function climbOut() {
    const baby = W.baby;
    cot.release();
    baby.cot = null;
    baby.x = cot.x + 30;
    baby.y = PLACES.babyHome.y;
    baby.air = baby.y - (cot.y + MATTRESS);
    baby.vAir = 260;
    baby.setState('fall');
    audio.boing();
  }

  function drawBabyInCot(g) {
    const baby = W.baby;
    let bx = 0, foot = MATTRESS;
    if (cot.hop) {
      // Climbing in: a little hop from where she was sitting.
      const k = ease(clamp((W.t - cot.hop.t0) / 0.55, 0, 1));
      bx = lerp(cot.hop.from.x - cot.x, 0, k);
      foot = lerp(cot.hop.from.y - cot.y, MATTRESS, k) - Math.sin(k * Math.PI) * 130;
    }
    baby.drawAt(g, bx, foot, COT_DEPTH, baby.nap ? 'sleep' : baby.poseKey());
    if (baby.nap && !cot.hop) {
      // Tucked in under a little quilt.
      g.beginPath();
      g.moveTo(-34, MATTRESS + 2);
      g.bezierCurveTo(-30, MATTRESS - 50, 96, MATTRESS - 52, 112, MATTRESS + 2);
      g.closePath();
      g.fillStyle = '#bfe2e3';
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.stroke();
      g.fillStyle = '#ffffff';
      for (const [hx, hy] of [[10, -22], [50, -30], [86, -18]]) {
        g.save(); g.translate(hx, MATTRESS + hy); heartPath(g, 12); g.fill(); g.restore();
      }
    }
  }

  // The mobile: a star, a moon and a heart turning on a pole from the cot.
  function drawMobile(g) {
    const px = cot.x + 130, top = cot.y - 334, hub = { x: cot.x + 50, y: top + 8 };
    g.save();
    g.strokeStyle = INK;
    g.lineCap = 'round';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(px, cot.y - 270);
    g.lineTo(px, top + 14);
    g.quadraticCurveTo(px, top, px - 16, top);
    g.lineTo(hub.x, top);
    g.stroke();
    g.strokeStyle = '#fff3e3';
    g.lineWidth = 3;
    g.stroke();
    const items = [0, 1, 2].map(i => {
      const a = cot.spin + (i / 3) * Math.PI * 2;
      return { i, x: hub.x + Math.cos(a) * 46, k: 0.85 + Math.sin(a) * 0.15, y: hub.y + 40 + i * 6 };
    }).sort((a, b) => a.k - b.k);
    for (const it of items) {
      g.strokeStyle = 'rgba(107,74,58,0.5)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(hub.x, hub.y); g.lineTo(it.x, it.y - 12); g.stroke();
      g.save();
      g.translate(it.x, it.y);
      g.scale(it.k, it.k);
      g.rotate(Math.sin(W.t * 2 + it.i) * 0.15);
      g.strokeStyle = INK;
      g.lineWidth = 2.5;
      g.beginPath();
      if (it.i === 0) {
        for (let j = 0; j < 10; j++) {
          const r = j % 2 ? 7 : 16, a = (j / 10) * Math.PI * 2 - Math.PI / 2;
          g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.closePath();
        g.fillStyle = '#ffd650';
      } else if (it.i === 1) {
        g.arc(0, 0, 15, 0.5, Math.PI * 2 - 0.5);
        g.arc(7, 0, 11, Math.PI * 2 - 0.9, 0.9, true);
        g.closePath();
        g.fillStyle = '#d4c4ff';
      } else {
        heartPath(g, 26);
        g.fillStyle = '#ff9fb2';
      }
      g.fill();
      g.stroke();
      g.restore();
    }
    g.fillStyle = '#f4a7b9';
    g.beginPath(); g.arc(hub.x, hub.y, 6, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  W.dropTargets.push({
    accept(item, x, y) {
      if (item !== W.baby || !cot.takes(x, y)) return false;
      seatInCot();
      return true;
    },
  });

  /* ---------------- wardrobe ---------------- */

  const wardrobe = {
    x: PLACES.wardrobe.x, y: PLACES.wardrobe.y, z: PLACES.wardrobe.y, open: 0, target: 0, wob: 0, until: 0,
    draw(g) {
      g.save();
      g.translate(this.x, this.y);
      const sq = Math.sin(this.wob * 16) * 0.04 * this.wob;
      g.scale(1 + sq, 1 - sq);
      W.blit(g, sprite('wardrobeBody'));
      if (this.open > 0.02) W.blit(g, sprite('wardrobeInside'));
      const k = 1 - ease(this.open) * 0.82;
      const door = sprite('wardrobeDoor');
      if (door) {
        g.save(); g.translate(-118, 0); g.scale(k, 1); W.blit(g, door); g.restore();
        g.save(); g.translate(118, 0); g.scale(-k, 1); W.blit(g, door); g.restore();
      }
      g.restore();
    },
    hit(x, y) { return x > this.x - 150 && x < this.x + 150 && y > this.y - 520 && y < this.y + 10; },
    tap() {
      this.wob = 1;
      if (this.target) close();
      else openWardrobe();
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      this.open += clamp(this.target - this.open, -dt * 3, dt * 3);
      if (this.target && W.t > this.until) close();
    },
    hint() { this.wob = 0.8; },
  };

  function openWardrobe() {
    wardrobe.target = 1;
    wardrobe.until = W.t + 12;
    audio.pop();
    audio.chime();
    cards.shownAt = W.t;
  }
  function close() {
    wardrobe.target = 0;
    audio.pop();
  }
  W.on('weather:rain', () => { if (W.boy.want) wardrobe.wob = 1; });

  // The three outfits come out of the open wardrobe as big cards.
  const CARD_W = 184, CARD_H = 240;
  const cards = {
    layer: 'front', shownAt: 0,
    rects() {
      return OUTFITS.map((o, i) => ({
        i, x: wardrobe.x + (i - 1) * 206 - CARD_W / 2, y: 262 - (i === 1 ? 24 : 0), w: CARD_W, h: CARD_H,
      }));
    },
    visible() { return wardrobe.open > 0.6 && wardrobe.target === 1; },
    draw(g) {
      if (wardrobe.open < 0.05) return;
      const p = ease(clamp((W.t - this.shownAt) / 0.35, 0, 1)) * (wardrobe.target ? 1 : wardrobe.open);
      for (const r of this.rects()) {
        const delay = clamp((W.t - this.shownAt - r.i * 0.06) / 0.3, 0, 1);
        const k = p * ease(delay);
        if (k < 0.02) continue;
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        g.save();
        g.translate(wardrobe.x + (cx - wardrobe.x) * k, 420 + (cy - 420) * k);
        g.rotate((r.i - 1) * 0.08 * k + Math.sin(W.t * 2 + r.i) * 0.02);
        g.scale(k, k);
        const worn = r.i === W.boy.outfit;
        g.fillStyle = '#fffaf0';
        g.strokeStyle = worn ? '#ffb300' : 'rgba(107,74,58,0.55)';
        g.lineWidth = worn ? 9 : 4;
        g.beginPath();
        g.roundRect ? g.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 18) : g.rect(-r.w / 2, -r.h / 2, r.w, r.h);
        g.fill(); g.stroke();
        const want = W.boy.want === OUTFITS[r.i].id;
        if (want) {
          g.strokeStyle = `rgba(255,140,170,${0.6 + 0.4 * Math.sin(W.t * 6)})`;
          g.lineWidth = 7;
          g.stroke();
        }
        const img = W.img['card_' + OUTFITS[r.i].id];
        if (img) {
          const bb = boundsOf(img);
          const ch = r.h * 0.84;
          const dh = ch / (bb.y1 - bb.y0);
          const dw = dh * img.naturalWidth / img.naturalHeight;
          g.drawImage(img, -((bb.x0 + bb.x1) / 2) * dw, -ch / 2 - bb.y0 * dh, dw, dh);
        }
        g.restore();
      }
    },
    hit(x, y) {
      if (!this.visible()) return false;
      this.picked = this.rects().find(r => x > r.x - 14 && x < r.x + r.w + 14 && y > r.y - 14 && y < r.y + r.h + 14);
      return !!this.picked;
    },
    tap() {
      const r = this.picked;
      if (!r) return;
      W.boy.wear(r.i);
      wardrobe.until = W.t + 0.7;
      fx.sparkle(r.x + r.w / 2, r.y + r.h / 2, 10, 140);
    },
  };

  /* ---------------- window, curtains and visitors ---------------- */

  const win = PLACES.window;
  const curtains = {
    layer: 'houseDecal', open: 1, target: 1, wob: 0, visitor: null,
    draw(g) {
      // A visitor sits on the outside sill, seen through the glass.
      const v = this.visitor;
      if (v && W.img['animal_' + v.id]) {
        const img = W.img['animal_' + v.id];
        const age = W.t - v.t0;
        const up = age < v.life ? ease(clamp(age / 0.4, 0, 1)) : 1 - ease(clamp((age - v.life) / 0.4, 0, 1));
        g.save();
        g.beginPath(); g.rect(262, 130, 286, 210); g.clip();
        const h = 150;
        const w = h * img.naturalWidth / img.naturalHeight;
        g.drawImage(img, v.x - w / 2, 345 - h * up * 0.95, w, h);
        g.restore();
        if (age > v.life + 0.4) this.visitor = null;
      }
      const sp = sprite('curtain');
      if (!sp) return;
      const closed = 1 - ease(this.open);
      const w = 66 + closed * 118;
      const sway = Math.sin(W.t * 1.5) * 0.01 + Math.sin(this.wob * 14) * 0.04 * this.wob;
      g.save(); g.translate(226, 98); g.rotate(sway); g.scale(w / 186, 1); W.blit(g, sp); g.restore();
      g.save(); g.translate(584, 98); g.rotate(-sway); g.scale(-w / 186, 1); W.blit(g, sp); g.restore();
    },
    hit(x, y) { return x > 210 && x < 600 && y > 90 && y < 390; },
    tap(x, y) {
      const v = this.visitor;
      if (v && this.open > 0.8 && Math.abs(x - v.x) < 90 && y > 200 && y < 350) {
        W.sky.playAnimal(v.animal);
        W.say(v.animal.name);
        fx.hearts(v.x, 260, 2);
        return;
      }
      this.wob = 1;
      this.target = this.target ? 0 : 1;
      audio.whoosh();
      if (this.target) {
        // Opening the curtains sometimes finds someone at the window.
        if (Math.random() < 0.55) {
          const night = W.dayT > 0.5;
          const pool = night ? [OWL, CAT] : [CAT, ...BUSH_ANIMALS.day.filter(a => ['bunny', 'duck', 'dog'].includes(a.id))];
          const animal = pool.filter(Boolean)[(Math.random() * pool.length) | 0];
          if (animal) {
            this.visitor = { id: animal.id, animal, x: 300 + Math.random() * 200, t0: W.t + 0.35, life: 4.5 };
            setTimeout(() => {
              if (!W.isAlive() || !this.visitor || this.visitor.animal !== animal) return;
              W.sky.playAnimal(animal);
              W.say(animal.name);
            }, 650);
          }
        }
      } else {
        this.visitor = null;
      }
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      this.open += clamp(this.target - this.open, -dt * 2.6, dt * 2.6);
    },
    hint() { this.wob = 0.8; },
    x: 405, y: 360,
  };

  /* ---------------- toy box ---------------- */

  const toybox = {
    x: PLACES.toybox.x, y: PLACES.toybox.y, z: PLACES.toybox.y, isOpen: false, wob: 0, contents: new Set(),
    draw(g) {
      const img = W.img[this.isOpen ? 'scene_toyboxOpen' : 'scene_toyboxClosed'];
      if (!img) return;
      const d = depthAt(this.y);
      const w = 150 * d;
      const h = w * img.naturalHeight / img.naturalWidth;
      g.fillStyle = 'rgba(70,40,20,0.2)';
      g.beginPath(); g.ellipse(this.x, this.y + 2, w * 0.5, 14, 0, 0, Math.PI * 2); g.fill();
      const sq = Math.sin(this.wob * 16) * 0.08 * this.wob;
      g.save();
      g.translate(this.x, this.y);
      g.scale(1 + sq, 1 - sq);
      g.drawImage(img, -w / 2, -h, w, h);
      g.restore();
      this.h = h;
    },
    hit(x, y) { return Math.abs(x - this.x) < 100 && y > this.y - (this.h || 150) - 20 && y < this.y + 16; },
    tap() {
      this.wob = 1;
      if (!this.isOpen) {
        this.isOpen = true;
        audio.pop();
        spill();
      } else {
        // Toys only: apples and garden produce belong in the harvest basket.
        const out = W.toys.filter(t => !t.hidden && !t.held && W.onScreen(t.x, 100) && !t.spec.produce && t.kind !== 'wand');
        if (out.length) tidy(out);
        else { this.isOpen = false; audio.pop(); }
      }
    },
    has(toy) { return this.contents.has(toy); },
    update(dt) { this.wob = Math.max(0, this.wob - dt * 1.6); },
    hint() { this.wob = 0.9; },
  };
  W.toybox = toybox;

  function spill() {
    const list = [...toybox.contents];
    toybox.contents.clear();
    list.forEach((toy, i) => {
      setTimeout(() => {
        if (!W.isAlive()) return;
        toy.hidden = false;
        toy.x = toybox.x;
        toy.y = clamp(toybox.y + 20 + Math.random() * 90, WORLD.floor.home.y0, WORLD.floor.home.y1);
        toy.air = 120;
        toy.vAir = 820 + Math.random() * 260;
        toy.vx = (i % 2 ? 1 : -1) * (180 + Math.random() * 280);
        toy.spin = (Math.random() - 0.5) * 8;
        audio.bell(i + 2);
        fx.sparkle(toybox.x, toybox.y - 150, 6, 120);
      }, 140 + i * 160);
    });
    if (!list.length) audio.bell(0);
  }

  function tidy(out) {
    out.forEach((toy, i) => {
      setTimeout(() => {
        if (!W.isAlive() || toy.held || toy.hidden) return;
        fx.sparkle(toy.x, toy.y - 50, 8, 100);
        toy.hidden = true;
        toy.air = 0; toy.vx = 0; toy.vAir = 0;
        toybox.contents.add(toy);
        audio.bell(6 - i);
        toybox.wob = 0.6;
      }, i * 140);
    });
    setTimeout(() => {
      if (!W.isAlive()) return;
      toybox.isOpen = false;
      audio.chime();
      fx.stars(toybox.x, toybox.y - 160, 6, 200);
    }, out.length * 140 + 250);
  }

  W.dropTargets.push({
    accept(item, x, y) {
      if (!item.spec) return false;
      if (Math.abs(x - toybox.x) > 110 || y < toybox.y - 260 || y > toybox.y + 40) return false;
      item.hidden = true;
      item.air = 0; item.vx = 0; item.vAir = 0;
      toybox.contents.add(item);
      toybox.isOpen = true;
      toybox.wob = 0.8;
      audio.bell(5);
      fx.sparkle(toybox.x, toybox.y - 140, 8, 110);
      return true;
    },
  });

  /* ---------------- the bed takes a dropped brother ---------------- */

  W.dropTargets.push({
    accept(item, x, y) {
      if (item !== W.boy) return false;
      if (x < bed.x - 240 || x > bed.x + 240 || y < bed.y - 340 || y > bed.y + 40) return false;
      item.held = false;
      W.boy.sleep();
      bed.wob = 1;
      audio.boing();
      return true;
    },
  });

  /* ---------------- door ---------------- */

  const door = {
    x: PLACES.door.x - 12, y: PLACES.door.y1, z: 789, open: 0, until: 0, wob: 0,
    draw(g) {
      const sp = sprite('door');
      if (!sp) return;
      const k = 1 - ease(this.open) * 0.78;
      g.save();
      g.translate(this.x, PLACES.door.y0);
      g.scale(k, 1);
      W.blit(g, sp);
      g.restore();
    },
    hit(x, y) { return x > this.x - 10 && x < this.x + 96 && y > PLACES.door.y0 && y < this.y; },
    tap() {
      this.until = W.t + 1.6;
      audio.thud();
      setTimeout(() => audio.thud(), 140);
      const boy = W.boy;
      if (boy.x < WORLD.doorX) {
        boy.walkTo(2000, 758);
        W.panTo(2400);
      } else {
        boy.walkTo(1420, 732);
        W.panTo(820);
      }
    },
    update(dt) {
      const target = W.t < this.until ? 1 : 0;
      this.open += clamp(target - this.open, -dt * 4, dt * 5);
    },
    hint() { this.until = W.t + 0.6; },
  };
  W.on('crossDoor', () => { door.until = W.t + 0.9; });
  W.on('grab', () => { door.until = Math.max(door.until, W.t + 0.2); });

  /* ---------------- sunlight on the floor ---------------- */

  const sunPatch = {
    layer: 'houseDecal',
    draw(g) {
      const a = (1 - W.dayT) * (W.sky.weather === 'clear' ? 0.2 : 0.08) * (curtains.open * 0.85 + 0.15);
      if (a < 0.01) return;
      g.save();
      g.globalAlpha = a;
      g.fillStyle = '#fff6d8';
      g.beginPath();
      g.moveTo(300, 590); g.lineTo(560, 590); g.lineTo(690, 770); g.lineTo(380, 770);
      g.closePath();
      g.fill();
      g.restore();
    },
  };

  for (const e of [lamp, bed, cot, wardrobe, cards, curtains, toybox, door, sunPatch]) W.add(e);
  return { toybox, wardrobe, bed, cot, door, curtains, lamp };
}
