// Play House: the garden. Bushes with animals hiding in them, an apple tree
// (with an owl after dark), a trampoline that bounces higher with every tap,
// and the baby's pram for a ride.

import { PLACES, WORLD, depthAt, clampToFloor, floorFor } from './layout.js';
import { BUSH_ANIMALS, OWL } from './assets.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const ease = t => 1 - Math.pow(1 - t, 3);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function createGarden(W) {
  const { audio, fx } = W;

  /* ---------------- bushes and the animals in them ---------------- */

  let bag = [];
  let bagNight = null;
  function nextAnimal() {
    const night = W.dayT > 0.5;
    if (!bag.length || bagNight !== night) {
      bag = shuffle([...(night ? BUSH_ANIMALS.night : BUSH_ANIMALS.day)]);
      bagNight = night;
    }
    const showing = new Set(bushes.map(b => b.animal && b.animal.id));
    for (let i = 0; i < bag.length; i++) {
      if (!showing.has(bag[i].id)) return bag.splice(i, 1)[0];
    }
    return bag.pop();
  }

  const bushes = PLACES.bushes.map(p => ({
    x: p.x, y: p.y, z: p.y, w: p.w, art: p.art, wob: 0, animal: null, up: 0, upTarget: 0, hideAt: 0, hop: 0,
    draw(g) {
      const img = W.img['scene_' + this.art];
      if (!img) return;
      const h = this.w * img.naturalHeight / img.naturalWidth;
      this.h = h;
      // The animal peeks up from behind the leaves.
      if (this.animal && this.up > 0.01) {
        const a = W.img['animal_' + this.animal.id];
        if (a) {
          const ah = 180;
          const aw = ah * a.naturalWidth / a.naturalHeight;
          // Rises until most of the animal shows above the leaves.
          const lift = ease(this.up) * (h * 0.62 + ah * 0.5) + Math.abs(Math.sin(this.hop * 12)) * 34 * this.hop;
          g.drawImage(a, this.x - aw / 2 + 10, this.y - h * 0.3 - lift - ah * 0.5, aw, ah);
        }
      }
      const sway = Math.sin(this.wob * 20) * 0.06 * this.wob + Math.sin(W.t * 0.9 + this.x) * 0.008;
      g.save();
      g.translate(this.x, this.y);
      g.transform(1, 0, sway, 1, 0, 0);
      g.drawImage(img, -this.w / 2, -h, this.w, h);
      if (W.sky.snow > 0.05) {
        g.globalAlpha = W.sky.snow;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.ellipse(0, -h * 0.82, this.w * 0.36, h * 0.16, 0, Math.PI, 0);
        g.ellipse(-this.w * 0.22, -h * 0.7, this.w * 0.16, h * 0.1, 0, Math.PI, 0);
        g.fill();
      }
      g.restore();
    },
    hit(x, y) {
      const h = this.h || 200;
      if (Math.abs(x - this.x) < this.w / 2 + 10 && y > this.y - h - 10 && y < this.y + 20) return true;
      // The peeking animal is part of the bush for touches.
      return this.up > 0.6 && Math.abs(x - this.x) < 90 && y > this.y - h - 160 && y < this.y - h * 0.4;
    },
    tap(x, y) {
      this.wob = 1;
      audio.rustle();
      fx.leaves(this.x, this.y - (this.h || 200) * 0.7, 4, this.w * 0.8);
      if (this.animal && this.up > 0.6 && y < this.y - (this.h || 200) * 0.85) {
        // Touching the animal itself: it says hello again.
        this.hop = 1;
        this.hideAt = W.t + 5;
        W.sky.playAnimal(this.animal);
        W.say(this.animal.name);
        fx.hearts(this.x, this.y - (this.h || 200) - 120, 2);
        return;
      }
      if (this.animal) {
        this.upTarget = 0;
        setTimeout(() => { if (W.isAlive()) this.reveal(); }, 380);
      } else {
        this.reveal();
      }
    },
    reveal() {
      const a = nextAnimal();
      if (!a) return;
      this.animal = a;
      this.upTarget = 1;
      this.hop = 1;
      this.hideAt = W.t + 5.5;
      setTimeout(() => {
        if (!W.isAlive() || this.animal !== a) return;
        W.sky.playAnimal(a);
        W.say(a.name);
      }, 220);
      fx.sparkle(this.x, this.y - (this.h || 200) - 40, 10, 150);
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      this.hop = Math.max(0, this.hop - dt * 1.5);
      if (this.animal && W.t > this.hideAt) this.upTarget = 0;
      this.up += clamp(this.upTarget - this.up, -dt * 3, dt * 4);
      if (this.up <= 0 && !this.upTarget) this.animal = null;
    },
    hint() { this.wob = 0.9; },
  }));

  /* ---------------- the apple tree ---------------- */

  const APPLE_SPOTS = [[-150, -470], [70, -520], [170, -400], [-40, -390]];
  const tree = {
    x: PLACES.tree.x, y: PLACES.tree.y, z: PLACES.tree.y, wob: 0,
    apples: APPLE_SPOTS.map(() => ({ on: true, back: 0 })),
    owl: 0, blink: 0,
    draw(g) {
      W.blit(g, W.sprites.treeTrunk, this.x, this.y);
      // Owl peeks out of the knothole after dark.
      if (this.owl > 0.02 && W.img.animal_owl) {
        const img = W.img.animal_owl;
        const h = 92 * ease(this.owl);
        const w = h * img.naturalWidth / img.naturalHeight;
        g.save();
        g.translate(this.x + 2, this.y - 212);
        g.scale(1, this.blink > 0 ? 0.92 : 1);
        g.drawImage(img, -w / 2, -h, w, h);
        g.restore();
      }
      const sway = Math.sin(this.wob * 16) * 0.035 * this.wob + Math.sin(W.t * 0.7) * 0.006;
      g.save();
      g.translate(this.x, this.y - 400);
      g.rotate(sway);
      g.translate(0, 400);
      W.blit(g, W.sprites.treeCanopy);
      if (W.sprites.apple) {
        this.apples.forEach((a, i) => {
          if (!a.on) return;
          const [ax, ay] = APPLE_SPOTS[i];
          g.save(); g.translate(ax, ay + 30); g.scale(0.8, 0.8); W.blit(g, W.sprites.apple); g.restore();
        });
      }
      if (W.sky.snow > 0.05) {
        g.globalAlpha = W.sky.snow * 0.9;
        g.fillStyle = '#ffffff';
        for (const [bx, by, r] of [[-60, -700, 110], [100, -680, 120], [-200, -600, 80], [180, -540, 70]]) {
          g.beginPath(); g.ellipse(bx, by, r, r * 0.3, 0, Math.PI, 0); g.fill();
        }
      }
      g.restore();
    },
    hit(x, y) {
      if (Math.abs(x - this.x) < 70 && y > this.y - 440 && y < this.y + 10) return true;
      return Math.hypot(x - (this.x - 20), (y - (this.y - 520)) * 1.2) < 300;
    },
    tap() {
      this.wob = 1;
      audio.rustle();
      fx.leaves(this.x - 20, this.y - 560, 10, 380);
      if (W.dayT > 0.5) {
        this.blink = 0.3;
        if (OWL) { W.sky.playAnimal(OWL); W.say('Owl'); }
        return;
      }
      const i = this.apples.findIndex(a => a.on);
      if (i < 0) { audio.boing(); return; }
      const a = this.apples[i];
      a.on = false;
      a.back = W.t + 25;
      const [ax, ay] = APPLE_SPOTS[i];
      const toy = W.spawnToy('apple', this.x + ax, WORLD.floor.garden.y0 + 40 + Math.random() * 60);
      toy.air = Math.max(0, toy.y - (this.y + ay + 30));
      toy.vAir = 0;
      setTimeout(() => W.say('Apple'), 450);
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.4);
      this.blink = Math.max(0, this.blink - dt);
      this.owl += clamp((W.dayT > 0.6 ? 1 : 0) - this.owl, -dt * 2, dt * 1.2);
      for (const a of this.apples) if (!a.on && W.t > a.back && W.toys.filter(t => t.kind === 'apple').length < 4) a.on = true;
    },
    hint() { this.wob = 0.8; },
  };

  /* ---------------- trampoline ---------------- */

  const PAD = ['#ff8fa3', '#ffd166', '#7fd1e0', '#b5e48c'];
  const tramp = {
    x: PLACES.trampoline.x, y: PLACES.trampoline.y, z: PLACES.trampoline.y, w: PLACES.trampoline.w, dip: 0, wob: 0,
    rimY() { return this.y - 150; },
    matY() { return this.rimY() + 4 + this.dip * 34; },
    land(strength) { this.dip = Math.min(1.4, strength); },
    draw(g) {
      const cx = this.x, rim = this.rimY(), rx = this.w / 2, ry = 46;
      const legs = [[-0.82, -0.98], [-0.32, -0.42], [0.32, 0.42], [0.82, 0.98]];
      g.fillStyle = 'rgba(60,90,40,0.22)';
      g.beginPath(); g.ellipse(cx, this.y + 4, rx * 1.02, 26, 0, 0, Math.PI * 2); g.fill();
      g.lineCap = 'round';
      // Back legs, then the mat, then the padded rim in coloured segments.
      g.strokeStyle = '#5c6aa6';
      g.lineWidth = 16;
      g.beginPath();
      for (const [a, b] of [legs[1], legs[2]]) { g.moveTo(cx + rx * a, rim - ry * 0.6); g.lineTo(cx + rx * b, this.y - 26); }
      g.stroke();
      const dip = this.dip * 34;
      g.fillStyle = '#2f3b5c';
      g.beginPath(); g.ellipse(cx, rim + dip * 0.5, rx - 20, ry - 10 + dip * 0.4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.beginPath(); g.ellipse(cx - rx * 0.25, rim - 8 + dip * 0.4, rx * 0.35, 9, -0.05, 0, Math.PI * 2); g.fill();
      const seg = 16;
      g.lineWidth = 26;
      g.lineCap = 'butt';
      for (let i = 0; i < seg; i++) {
        g.strokeStyle = PAD[i % PAD.length];
        g.beginPath();
        g.ellipse(cx, rim, rx - 4, ry - 4, 0, (i / seg) * Math.PI * 2, ((i + 1) / seg) * Math.PI * 2 + 0.02);
        g.stroke();
      }
      g.strokeStyle = 'rgba(107,74,58,0.55)';
      g.lineWidth = 3.5;
      g.beginPath(); g.ellipse(cx, rim, rx + 9, ry + 9, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.ellipse(cx, rim, rx - 17, ry - 17, 0, 0, Math.PI * 2); g.stroke();
      if (W.sky.snow > 0.05) {
        g.globalAlpha = W.sky.snow;
        g.strokeStyle = '#ffffff';
        g.lineWidth = 12;
        g.beginPath(); g.ellipse(cx, rim - 8, rx - 4, ry - 4, 0, Math.PI, Math.PI * 2); g.stroke();
        g.globalAlpha = 1;
      }
      g.strokeStyle = '#6a7bb5';
      g.lineWidth = 16;
      g.lineCap = 'round';
      g.beginPath();
      for (const [a, b] of [legs[0], legs[3]]) { g.moveTo(cx + rx * a, rim + ry * 0.4); g.lineTo(cx + rx * b, this.y); }
      g.stroke();
    },
    hit(x, y) { return Math.abs(x - this.x) < this.w / 2 + 20 && y > this.rimY() - 140 && y < this.y + 20; },
    tap() {
      this.dip = Math.max(this.dip, 0.5);
      const boy = W.boy;
      if (boy.state === 'bounce') { boy.boostBounce(); audio.boing(); return; }
      audio.boing();
      boy.walkTo(this.x - this.w * 0.62, this.y + 12, () => boy.startBounce(this));
    },
    update(dt) { this.dip = Math.max(0, this.dip - dt * 3.5); },
    hint() { this.dip = 0.6; },
  };
  W.trampoline = tramp;

  W.dropTargets.push({
    accept(item, x, y) {
      if (Math.abs(x - tramp.x) > tramp.w / 2 || y > tramp.y + 30 || y < tramp.rimY() - 420) return false;
      if (item === W.boy) { item.held = false; W.boy.startBounce(tramp); return true; }
      if (item.spec) {
        // Toys bounce off the mat.
        item.x = clamp(x, tramp.x - tramp.w * 0.35, tramp.x + tramp.w * 0.35);
        item.y = tramp.y + 30;
        item.air = Math.max(0, item.y - tramp.matY());
        item.vAir = 1100;
        item.vx = (Math.random() - 0.5) * 500;
        tramp.land(0.8);
        audio.boing();
        return true;
      }
      return false;
    },
  });

  /* ---------------- the pram ----------------
     Carrying the baby over the pram makes it glow, and letting go there sits
     her in it. Touching her in the pram lifts her straight back out, while
     the handle and wheels move the pram with her in it. Tapping the empty
     pram, or wheeling it up to her, has her climb in by herself. */

  const PRAM_CALL = 600;      // how far she will crawl to a tapped pram

  const pram = {
    x: PLACES.stroller.x, y: PLACES.stroller.y, wob: 0, ride: null, draggable: true, held: false, squeakAt: 0,
    dir: 1, hover: false, glow: 0, grip: { x: 0, y: 0 },
    get z() { return this.y; },
    hasBaby() { return W.baby.state === 'stroller' && W.baby.stroller === this; },
    depth() { return depthAt(this.y) * 0.95; },
    draw(g) {
      const d = this.depth();
      const bob = this.ride ? Math.abs(Math.sin(W.t * 10)) * 4 : this.glow * Math.abs(Math.sin(W.t * 6)) * 8;
      // Rocked to and fro while her brother hums her to sleep.
      const x = this.x + (W.boy.state === 'rock' && this.hasBaby() ? Math.sin(W.boy.stateT * 3.4) * 14 : 0);
      if (this.glow > 0) {
        const pulse = 0.8 + Math.sin(W.t * 7) * 0.2;
        const cy = this.y - 150 * d, r = 270 * d;
        const gr = g.createRadialGradient(x, cy, 10, x, cy, r);
        gr.addColorStop(0, `rgba(255,210,80,${(0.75 * this.glow * pulse).toFixed(3)})`);
        gr.addColorStop(0.6, `rgba(255,220,110,${(0.35 * this.glow * pulse).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(255,230,140,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, cy, r, 0, Math.PI * 2); g.fill();
        // A ring of light on the ground: "let go here".
        g.save();
        g.globalAlpha = this.glow;
        g.strokeStyle = '#ffc93c';
        g.lineWidth = 9;
        g.setLineDash([18, 12]);
        g.lineDashOffset = -W.t * 40;
        g.beginPath(); g.ellipse(x, this.y + 4, 150 * d * pulse, 26 * d * pulse, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      g.fillStyle = 'rgba(70,40,20,0.2)';
      g.beginPath(); g.ellipse(x, this.y + 2, 120 * d, 16 * d, 0, 0, Math.PI * 2); g.fill();
      const sq = Math.sin(this.wob * 16) * 0.06 * this.wob;
      g.save();
      g.translate(x, this.y - bob);
      g.scale(d * (1 + sq) * this.dir, d * (1 - sq));
      W.blit(g, W.sprites.strollerBack);
      if (this.hasBaby()) {
        g.save();
        g.scale(this.dir, 1);
        // Asleep she lies down in the basket with just her head peeping out.
        W.baby.drawAt(g, 4 * this.dir, W.baby.nap ? -98 : -82, 0.92);
        g.restore();
      }
      W.blit(g, W.sprites.strollerFront);
      g.restore();
    },
    hit(x, y) { return Math.abs(x - this.x) < 150 && y > this.y - 280 && y < this.y + 16; },
    // Her part of the pram: herself, the hood and the top of the basket —
    // everything except the handle and the wheels.
    seatHit(x, y) {
      const d = this.depth();
      const lx = (x - this.x) * this.dir / d, ly = (y - this.y) / d;
      return lx > -95 && lx < 125 && ly > -330 && ly < -100;
    },
    // Whether the baby, carried with her feet at (x, foot), would go in.
    takes(x, foot) {
      return Math.abs(x - this.x) < 200 && foot > this.y - 330 && foot < this.y + 140;
    },
    press() { this.wob = 1; audio.squeak(); },
    tap() {
      if (this.hasBaby()) startRide();
      else if (!callBaby()) fx.sparkle(this.x, this.y - 200, 6, 90);
    },
    grab(x, y) {
      this.held = true;
      // Moves from wherever it was taken hold of, without jumping.
      this.grip = { x: this.x - x, y: this.y - y };
      this.release();
    },
    drag(x, y) {
      const p = clampToFloor(x + this.grip.x, y + this.grip.y);
      if (Math.abs(p.x - this.x) > 2) this.dir = p.x > this.x ? 1 : -1;
      if (W.t > this.squeakAt && Math.hypot(p.x - this.x, p.y - this.y) > 6) {
        this.squeakAt = W.t + 0.45;
        audio.squeak();
        if (this.hasBaby() && !W.baby.nap && Math.random() < 0.3) audio.giggle();
      }
      this.x = p.x; this.y = p.y;
    },
    drop() {
      this.held = false;
      this.wob = 0.6;
      // Wheeled right up to her: in she climbs.
      const baby = W.baby;
      if (!this.hasBaby() && baby.free() && Math.abs(baby.x - this.x) < 170 && Math.abs(baby.y - this.y) < 110) seat();
    },
    release() {
      // The baby was lifted out, or the pram was picked up, mid-ride.
      this.ride = null;
      if (W.boy.state === 'push' || W.boy.state === 'rock') W.boy.setState('idle');
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      // Glows while the baby is carried over it, so letting go there clearly
      // means "into the pram".
      const b = W.baby;
      const hover = b.held && this.takes(b.hold.x, b.heldFoot(b.hold.y));
      if (hover && !this.hover && W.t > this.squeakAt) {
        this.squeakAt = W.t + 0.45;
        this.wob = 0.8;
        audio.squeak();
        fx.sparkle(this.x, this.y - 220, 6, 110);
      }
      if (hover && Math.random() < dt * 5) fx.sparkle(this.x, this.y - 160, 3, 150, ['#ffffff', '#fff3c4', '#ffd650']);
      this.hover = hover;
      this.glow = clamp(this.glow + (hover ? 6 : -4) * dt, 0, 1);
      if (this.ride) stepRide(dt);
    },
    hint() { this.wob = 0.8; },
  };

  // Sits the baby in the pram, however she got there.
  function seat() {
    const baby = W.baby;
    baby.held = false;
    baby.stroller = pram;
    baby.nap = false;
    baby.crawlTo = null;
    baby.then = null;
    if (baby.want !== 'brother') baby.want = null;
    baby.setState('stroller');
    baby.x = pram.x; baby.y = pram.y + 1;
    baby.squash = 0.7;
    pram.wob = 1;
    audio.giggle();
    fx.sparkle(pram.x, pram.y - 220, 10, 140);
    // Her brother comes to give her a ride, if he is free and nearby.
    setTimeout(() => {
      const boy = W.boy;
      if (!W.isAlive() || !pram.hasBaby() || pram.held || pram.ride || baby.nap) return;
      if (boy.held || ['sleep', 'bounce', 'push', 'rock'].includes(boy.state)) return;
      if (Math.abs(boy.x - pram.x) > 1100) return;
      startRide();
    }, 1100);
  }

  // Tapping the empty pram calls her over: she crawls to it and climbs in.
  function callBaby() {
    const baby = W.baby;
    if (!baby.free() || Math.abs(baby.x - pram.x) > PRAM_CALL) return false;
    const f = floorFor(pram.x);
    const side = baby.x < pram.x ? -1 : 1;
    audio.babble();
    baby.crawlOver(clamp(pram.x + side * 120, f.x0, f.x1), pram.y, () => {
      if (!pram.hasBaby() && !pram.held && Math.abs(baby.x - pram.x) < 220) seat();
    });
    return true;
  }

  function startRide() {
    if (pram.ride) return;
    const boy = W.boy;
    if (W.baby.nap) { W.baby.nap = false; audio.giggle(); }
    const f = floorFor(pram.x);
    const dir = pram.x + 620 < f.x1 ? 1 : -1;
    pram.dir = dir;
    boy.walkTo(pram.x - dir * 170, pram.y + 4, () => {
      if (!pram.hasBaby() || pram.held) return;
      boy.facing = dir;
      boy.setState('push');
      pram.ride = { dir, from: pram.x, dist: 560, t: 0, back: false };
      audio.whoosh();
      W.say('Ride');
    });
  }
  pram.startRide = startRide;

  function stepRide(dt) {
    const r = pram.ride;
    const boy = W.boy;
    if (boy.state !== 'push' || !pram.hasBaby()) { pram.ride = null; if (boy.state === 'push') boy.setState('idle'); return; }
    r.t += dt;
    const speed = 300;
    const goal = r.back ? r.from : r.from + r.dir * r.dist;
    const dx = goal - pram.x;
    const step = speed * dt;
    if (Math.abs(dx) <= step) {
      pram.x = goal;
      if (!r.back) {
        r.back = true;
        pram.dir = -r.dir;
        boy.facing = -r.dir;
        audio.giggle();
      } else {
        pram.ride = null;
        boy.setState('idle');
        boy.facing = r.dir;
        W.baby.wob = 1;
        audio.giggle();
        fx.hearts(pram.x, pram.y - 260, 4);
        W.moments.snap('ride', pram.x, pram.y - 220);
        return;
      }
    } else {
      pram.x += Math.sign(dx) * step;
    }
    boy.x = pram.x - pram.dir * 170;
    boy.y = pram.y + 4;
    W.reveal(pram.x, 260);
    if (Math.random() < dt * 2) fx.notes(pram.x, pram.y - 260);
    if (Math.random() < dt * 3) fx.dust(pram.x - pram.dir * 60, pram.y, pram.dir);
  }

  W.dropTargets.push({
    accept(item, x, y) {
      if (item !== W.baby || !pram.takes(x, y)) return false;
      seat();
      return true;
    },
  });

  /* ---------------- birds ---------------- */

  const bird = {
    layer: 'sky', x: -200, y: 120, v: 0, nextAt: 6, flap: 0, scared: 0,
    draw(g) {
      if (this.v === 0) return;
      const w = Math.sin(W.t * 14 + this.flap) * 0.9;
      g.save();
      g.translate(this.x, this.y + Math.sin(W.t * 3) * 10);
      g.scale(Math.sign(this.v), 1);
      g.fillStyle = W.dayT > 0.5 ? '#6a6aa8' : '#7ab8e8';
      g.strokeStyle = 'rgba(107,74,58,0.6)';
      g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, 0, 26, 17, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.arc(20, -10, 12, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#ffb347';
      g.beginPath(); g.moveTo(30, -12); g.lineTo(42, -8); g.lineTo(30, -5); g.fill();
      g.fillStyle = '#3a3357';
      g.beginPath(); g.arc(23, -13, 2.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#a8d4f2';
      g.beginPath(); g.ellipse(-4, -6 - w * 6, 22, 2 + 8 * Math.abs(w), -0.5, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
    },
    hit(x, y) { return this.v !== 0 && Math.hypot(x - this.x, y - this.y) < 70; },
    tap() {
      this.v *= 2.2;
      this.y -= 30;
      audio.shimmer(1568);
      setTimeout(() => audio.shimmer(1760), 120);
      fx.sparkle(this.x, this.y, 8, 120);
    },
    update(dt) {
      if (this.v === 0) {
        if (W.t > this.nextAt && W.dayT < 0.5 && W.sky.weather === 'clear') {
          const left = Math.random() < 0.5;
          this.x = left ? 1650 : WORLD.W + 60;
          this.y = 60 + Math.random() * 220;
          this.v = (left ? 1 : -1) * (170 + Math.random() * 80);
        }
        return;
      }
      this.x += this.v * dt;
      if (this.x > WORLD.W + 120 || this.x < 1600) { this.v = 0; this.nextAt = W.t + 14 + Math.random() * 14; }
    },
  };

  for (const e of [...bushes, tree, tramp, pram, bird]) W.add(e);
  return { bushes, tree, tramp, pram };
}
