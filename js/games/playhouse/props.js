// Play House toys: things the child can pick up, carry anywhere (even out to
// the garden), throw, and give to someone. Each one also does its own thing
// when simply tapped, so a tap is never wasted.

import { WORLD, clampToFloor, depthAt, floorFor } from './layout.js';
import { boundsOf } from './assets.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const GRAVITY = 2600;

// `img` names a painted toy image, `sprite` an SVG piece. `word` is said on a
// tap (one name only), `bounce` is how lively it is when it lands.
export const TOYS = {
  teddy: { img: 'teddy', h: 118, bounce: 0.25, word: 'Teddy' },
  ball: { img: 'ball', h: 92, bounce: 0.62, roll: true, word: 'Ball' },
  duck: { img: 'duck', h: 98, bounce: 0.3, word: 'Duck' },
  rattle: { img: 'rattle', h: 108, bounce: 0.3, word: 'Rattle' },
  blanket: { img: 'blanket', h: 76, bounce: 0.08, word: 'Blanket' },
  bottle: { sprite: 'bottle', h: 118, bounce: 0.25, word: 'Milk' },
  apple: { sprite: 'apple', h: 70, bounce: 0.35, word: 'Apple', produce: 'food' },
  wand: { sprite: 'wand', h: 150, bounce: 0.2, word: 'Bubbles' },
  // Grown in the vegetable patch (patch.js). `produce` says what the baby
  // does with it: eats food, waves a flower, pats the big pumpkin.
  carrot: { sprite: 'carrot', h: 92, bounce: 0.3, word: 'Carrot', produce: 'food' },
  tomato: { sprite: 'tomato', h: 64, bounce: 0.45, word: 'Tomato', produce: 'food' },
  strawberry: { sprite: 'strawberry', h: 60, bounce: 0.35, word: 'Strawberry', produce: 'food' },
  pumpkin: { sprite: 'pumpkin', h: 96, bounce: 0.12, word: 'Pumpkin', produce: 'big' },
  sunflower: { sprite: 'sunflower', h: 150, bounce: 0.2, word: 'Sunflower', produce: 'flower' },
  tulip: { sprite: 'tulip', h: 112, bounce: 0.2, word: 'Tulip', produce: 'flower' },
};

export function createProps(W) {
  const { audio, fx } = W;
  const toys = [];
  W.toys = toys;
  // Things that can receive a dropped toy, asked in order. Each returns true
  // when it took the toy.
  W.dropTargets = [];

  class Toy {
    constructor(kind, x, y) {
      this.kind = kind;
      this.spec = TOYS[kind];
      const p = clampToFloor(x, y);
      this.x = p.x; this.y = p.y;
      this.air = 0; this.vAir = 0; this.vx = 0; this.vy = 0;
      this.rot = 0; this.spin = 0;
      this.wob = 0; this.shake = 0;
      this.held = false; this.hold = { x: 0, y: 0 }; this.swing = 0;
      this.hidden = false;        // tucked in the toy box, or in someone's arms
      this.draggable = true;
      this.box = null;
      this.lastWord = -9;
    }
    get z() { return this.held ? 2000 : this.y + 0.5; }
    get layer() { return this.held ? 'front' : 'sorted'; }

    height() { return this.spec.h * depthAt(this.y); }

    image() {
      if (this.spec.img) return W.img['toy_' + this.spec.img] || null;
      return null;
    }

    draw(g) {
      if (this.hidden) return;
      const h = this.held ? this.spec.h * 1.08 : this.height();
      let x = this.x, y = this.y - this.air;
      if (this.held) { x = this.hold.x; y = this.hold.y + h * 0.5; }
      // Contact shadow, shrinking as the toy rises.
      if (!this.held) {
        const k = 1 / (1 + this.air / 140);
        g.fillStyle = `rgba(70,40,20,${0.2 * k})`;
        g.beginPath(); g.ellipse(this.x, this.y + 2, h * 0.42 * k, h * 0.1 * k, 0, 0, Math.PI * 2); g.fill();
      }
      const squash = 1 + Math.sin(this.wob * 16) * 0.12 * this.wob;
      g.save();
      g.translate(x, y - h / 2);
      g.rotate(this.rot + this.swing + Math.sin(this.shake * 40) * 0.35 * this.shake);
      g.scale(squash, 2 - squash);
      const img = this.image();
      if (img) {
        const bb = boundsOf(img);
        const dh = h / (bb.y1 - bb.y0);
        const dw = dh * img.naturalWidth / img.naturalHeight;
        g.drawImage(img, -((bb.x0 + bb.x1) / 2) * dw, -h / 2 - bb.y0 * dh, dw, dh);
        this.box = { x: x - (bb.x1 - bb.x0) * dw / 2, y: y - h, w: (bb.x1 - bb.x0) * dw, h };
      } else if (this.spec.sprite && W.sprites[this.spec.sprite]) {
        const sp = W.sprites[this.spec.sprite];
        const k = h / sp.vb[3];
        g.scale(k, k);
        g.translate(0, h / 2 / k);
        W.blit(g, sp);
        this.box = { x: x - sp.vb[2] * k / 2, y: y - h, w: sp.vb[2] * k, h };
      }
      g.restore();
    }

    // Just the artwork, `h` tall with its base at (x, baseY): for a toy being
    // carried or used by someone, while the toy itself is hidden.
    drawArt(g, x, baseY, h, rot = 0) {
      g.save();
      g.translate(x, baseY - h / 2);
      g.rotate(rot);
      const img = this.image();
      if (img) {
        const bb = boundsOf(img);
        const dh = h / (bb.y1 - bb.y0);
        const dw = dh * img.naturalWidth / img.naturalHeight;
        g.drawImage(img, -((bb.x0 + bb.x1) / 2) * dw, -h / 2 - bb.y0 * dh, dw, dh);
      } else if (this.spec.sprite && W.sprites[this.spec.sprite]) {
        const sp = W.sprites[this.spec.sprite];
        const k = h / sp.vb[3];
        g.scale(k, k);
        g.translate(0, h / 2 / k);
        W.blit(g, sp);
      }
      g.restore();
    }

    hit(x, y) {
      if (this.hidden || !this.box) return false;
      const pad = 26;
      const b = this.box;
      return x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;
    }

    press() { this.wob = 1; }

    say() {
      if (W.t - this.lastWord > 2.5) { this.lastWord = W.t; W.say(this.spec.word); }
    }

    tap() {
      this.say();
      switch (this.kind) {
        case 'ball':
          this.vAir = 900 + Math.random() * 300;
          this.vx = (this.x < W.cam.x + W.cam.viewW / 2 ? 1 : -1) * (300 + Math.random() * 300);
          audio.boing();
          break;
        case 'duck':
          this.vAir = 520;
          audio.quack();
          fx.sparkle(this.x, this.y - this.height(), 6, 90, ['#ffe066', '#ffffff']);
          break;
        case 'rattle':
          this.shake = 1;
          W.voice.rattle();
          fx.notes(this.x, this.y - this.height(), 2);
          break;
        case 'teddy':
          audio.gentleGift();
          fx.hearts(this.x, this.y - this.height(), 3);
          break;
        case 'wand':
          audio.shimmer(987.77);
          fx.bubble(this.x, this.y - this.height() + 10, 6);
          break;
        case 'bottle':
          this.shake = 0.6;
          audio.glug();
          break;
        case 'apple': case 'carrot': case 'tomato': case 'strawberry':
          this.vAir = 380;
          audio.pop();
          break;
        case 'pumpkin':
          this.vAir = 200;
          this.wob = 1;
          audio.thud();
          break;
        case 'sunflower': case 'tulip':
          this.shake = 0.5;
          audio.shimmer(this.kind === 'tulip' ? 1174.66 : 880);
          fx.sparkle(this.x, this.y - this.height(), 6, 90, ['#ffe066', '#ffffff', '#ffb3c6']);
          break;
        default:
          audio.whoosh();
          fx.sparkle(this.x, this.y - this.height() / 2, 6, 80);
      }
      W.emit('toyTapped', this);
    }

    grab(x, y) {
      this.held = true;
      this.hold = { x, y };
      this.air = 0; this.vAir = 0; this.vx = 0;
      audio.pop();
    }

    drag(x, y) {
      // A little lag and sway makes it feel picked up rather than glued on.
      this.swing = clamp(this.swing + (x - this.hold.x) * 0.004, -0.6, 0.6);
      this.hold = { x, y };
    }

    drop(x, y, vx, vy) {
      this.held = false;
      this.swing = 0;
      // While held the toy is centred on the finger.
      const baseY = y + this.spec.h * 0.54;
      for (const target of W.dropTargets) {
        if (target.accept && target.accept(this, x, y)) return;
      }
      this.landFrom(x, baseY, vx, vy);
    }

    // Lets go of the toy at a point in mid-air: it falls to the floor below
    // that point (or onto the floor's back edge if it was let go over a wall
    // or the sky), carrying the throw's speed with it.
    landFrom(x, baseY, vx = 0, vy = 0) {
      const f = floorFor(clamp(x, WORLD.floor.home.x0, WORLD.floor.garden.x1));
      const restY = clamp(baseY, f.y0, f.y1);
      const p = clampToFloor(x, restY);
      this.x = p.x; this.y = p.y;
      this.air = Math.max(0, restY - baseY) + Math.max(0, p.y - restY);
      this.vAir = clamp(-vy * 0.45, -200, 1400);
      this.vx = clamp(vx * 0.5, -1400, 1400);
    }

    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.8);
      this.shake = Math.max(0, this.shake - dt * 1.2);
      if (this.held || this.hidden) return;
      if (this.air > 0 || this.vAir > 0) {
        this.vAir -= GRAVITY * dt;
        this.air += this.vAir * dt;
        this.rot += this.spin * dt;
        if (this.air <= 0) {
          this.air = 0;
          if (this.vAir < -260) {
            this.vAir = -this.vAir * this.spec.bounce;
            if (this.vAir < 120) this.vAir = 0;
            this.wob = 0.6;
            audio.thud();
            const pud = W.sky && W.sky.puddleAt(this.x, this.y);
            if (pud) { audio.splash(); fx.splash(this.x, this.y, 0.5); pud.ripple = 1; }
          } else {
            this.vAir = 0;
          }
          if (!this.spec.roll) { this.spin = 0; this.rot *= 0.5; }
        }
      }
      if (Math.abs(this.vx) > 4) {
        this.x += this.vx * dt;
        const onGround = this.air <= 0;
        this.vx *= Math.exp(-(onGround ? (this.spec.roll ? 1.1 : 7) : 0.3) * dt);
        if (this.spec.roll) this.rot += this.vx * dt / (this.spec.h * 0.5);
        const lo = WORLD.floor.home.x0, hi = WORLD.floor.garden.x1;
        if (this.x < lo || this.x > hi) {
          this.x = clamp(this.x, lo, hi);
          this.vx = -this.vx * 0.5;
          audio.thud();
        }
        const f = floorFor(this.x);
        this.y = clamp(this.y, f.y0, f.y1);
        if (onGround && !this.spec.roll) this.rot *= Math.exp(-6 * dt);
      } else {
        this.vx = 0;
        if (!this.spec.roll && this.air <= 0) this.rot *= Math.exp(-6 * dt);
      }
    }

    hint() { this.wob = 0.9; }
  }

  W.spawnToy = (kind, x, y) => {
    const t = new Toy(kind, x, y);
    toys.push(t);
    W.add(t);
    return t;
  };
  W.findToy = kind => toys.find(t => t.kind === kind);
  // Gone for good: eaten, or put away in the harvest basket.
  W.removeToy = t => {
    const i = toys.indexOf(t);
    if (i >= 0) toys.splice(i, 1);
    W.remove(t);
  };
  return { toys, Toy };
}
