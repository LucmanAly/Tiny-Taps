// Play House characters: the big brother and his baby sister.
//
// The brother goes wherever the child taps, and can also be picked up and
// dropped anywhere — into bed, onto the trampoline, next to his sister. The
// baby asks for things with a picture in a thought bubble (her teddy, her
// bottle, her brother...). Giving her what she wants, or simply playing with
// her, snaps one of the ten "Play Together" photos.

import { SIZE, PLACES, WORLD, depthAt, clampToFloor, floorFor, roomAt } from './layout.js';
import { OUTFITS, BOY_POSE_H, OUTFIT_SCALE, BABY_POSES, boundsOf, loadOutfit } from './assets.js';
import { heartPath } from './fx.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const rand = (a, b) => a + Math.random() * (b - a);
const GRAVITY = 2600;
const LS_OUTFIT = 'tinytaps-playhouse-outfit';

// Draws `img` with its visible content `h` tall, bottom-centre at (0, 0) of
// the current transform. Returns the content width.
function drawPose(g, img, h, flip) {
  const bb = boundsOf(img);
  const dh = h / (bb.y1 - bb.y0);
  const dw = dh * img.naturalWidth / img.naturalHeight;
  g.save();
  if (flip) g.scale(-1, 1);
  g.drawImage(img, -((bb.x0 + bb.x1) / 2) * dw, -bb.y1 * dh, dw, dh);
  g.restore();
  return (bb.x1 - bb.x0) * dw;
}

function shadow(g, x, y, w, air = 0) {
  const k = 1 / (1 + air / 180);
  g.fillStyle = `rgba(70,40,20,${(0.22 * k).toFixed(3)})`;
  g.beginPath(); g.ellipse(x, y + 2, w * 0.5 * k, w * 0.12 * k, 0, 0, Math.PI * 2); g.fill();
}

// A cloud-shaped thought bubble above a character, with a picture inside.
export function drawBubble(g, x, y, age, t, drawIcon, side = 1) {
  const pop = Math.min(1, age * 4);
  const s = (0.6 + 0.4 * (1 - Math.pow(1 - pop, 3))) * (1 + Math.sin(t * 3) * 0.03);
  g.save();
  g.translate(x, y + Math.sin(t * 2) * 6);
  g.globalAlpha = pop;
  g.fillStyle = '#ffffff';
  g.strokeStyle = 'rgba(107,74,58,0.55)';
  g.lineWidth = 4;
  // Trailing dots toward the speaker.
  for (const [dx, dy, r] of [[-38 * side, 74, 10], [-56 * side, 100, 6]]) {
    g.beginPath(); g.arc(dx, dy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  }
  g.scale(s, s);
  g.beginPath();
  const lobes = [[0, -6, 66], [-44, 10, 40], [44, 10, 40], [-30, -40, 36], [30, -40, 36], [0, 34, 40]];
  for (const [lx, ly, lr] of lobes) { g.moveTo(lx + lr, ly); g.arc(lx, ly, lr, 0, Math.PI * 2); }
  g.stroke();
  g.fill();
  drawIcon(g);
  g.restore();
}
export function createKids(W) {
  const { audio, fx } = W;
  const outfitLoads = new Map();
  const loadSet = i => {
    if (!outfitLoads.has(i)) outfitLoads.set(i, loadOutfit(OUTFITS[i]));
    return outfitLoads.get(i);
  };

  let saved = 0;
  try { saved = clamp(parseInt(localStorage.getItem(LS_OUTFIT) || '0', 10) || 0, 0, OUTFITS.length - 1); } catch (e) { /* private mode */ }

  /* ================= the big brother ================= */

  const boy = {
    kind: 'boy', draggable: true,
    x: PLACES.boyHome.x, y: PLACES.boyHome.y, facing: 1,
    outfit: saved, imgs: {},
    state: 'idle', stateT: 0, dur: 0,
    target: null, then: null, speed: 600, walkPhase: 0, stepAt: 0,
    air: 0, vAir: 0, vx: 0,
    held: false, hold: { x: 0, y: 0 }, swing: 0, swingV: 0,
    squash: 0, wob: 0, box: null,
    reactIx: 0, idleAt: 6, splashAt: 0,
    tramp: null, boost: 0, quietBounces: 0,
    want: null, wantT: 0,
    get z() {
      if (this.held) return 3000;
      if (this.state === 'bounce' && this.tramp) return this.tramp.y + 0.6;
      if (this.state === 'push' || this.state === 'rock') return this.y - 1;
      return this.y;
    },
    get layer() { return this.held ? 'front' : 'sorted'; },

    setState(s, dur = 0) { this.state = s; this.stateT = 0; this.dur = dur; },

    poseKey() {
      switch (this.state) {
        case 'walk': return 'walk';
        case 'held': case 'fall': case 'hop': case 'bounce': case 'splash': return 'jump';
        case 'magic': return this.imgs.magic ? 'magic' : 'jump';
        case 'kneel': return 'kneel';
        case 'push': return Math.floor(this.stateT * 3.2) % 2 ? 'pushA' : 'pushB';
        case 'rock': return 'pushA';
        case 'carry': return 'carry';
        default: return 'stand';
      }
    },
    image(key) {
      return this.imgs[key] || this.imgs.stand || this.imgs.walk || this.imgs.jump || null;
    },
    height(key, depth) {
      return SIZE.boyH * depth * (BOY_POSE_H[key] || 1) * (OUTFIT_SCALE[OUTFITS[this.outfit].id] || 1);
    },

    draw(g) {
      if (this.state === 'sleep') return;          // the bed draws him tucked in
      const key = this.poseKey();
      const img = this.image(key);
      if (!img) return;
      const depth = this.held ? 1.04 : depthAt(this.y);
      const h = this.height(key, depth);
      let x = this.x, foot = this.y - this.air;
      if (this.state === 'bounce' && this.tramp) foot = this.tramp.matY() - this.air;
      if (this.held) { x = this.hold.x; foot = this.hold.y + h * 0.9; }
      if (!this.held && this.state !== 'bounce') shadow(g, this.x, this.y, h * 0.5, this.air);

      let rot = 0, sx = 1, sy = 1;
      if (this.state === 'walk') {
        const sw = Math.sin(this.walkPhase * Math.PI * 2);
        foot -= Math.abs(sw) * h * 0.035;
        rot = sw * 0.045;
      } else if (this.state === 'wave') {
        rot = Math.sin(this.stateT * 14) * 0.06;
      } else if (this.state === 'idle') {
        sy = 1 + Math.sin(W.t * 2.2) * 0.012;
      } else if (this.state === 'push') {
        foot -= Math.abs(Math.sin(this.stateT * 10)) * h * 0.02;
      } else if (this.state === 'rock' || (this.state === 'kneel' && baby.state === 'lull')) {
        // Swaying gently in time with the lullaby.
        rot = Math.sin(this.stateT * 3.4) * 0.05;
      }
      const sq = this.squash + Math.sin(this.wob * 18) * 0.1 * this.wob;
      sx *= 1 + sq * 0.14; sy *= 1 - sq * 0.14;

      g.save();
      if (this.held) {
        // Hangs from the finger, swinging like a picked-up toy.
        g.translate(x, this.hold.y);
        g.rotate(this.swing);
        g.translate(0, h * 0.9);
      } else {
        g.translate(x, foot);
        g.rotate(rot);
      }
      g.scale(sx, sy);
      const w = drawPose(g, img, h, this.facing < 0);
      g.restore();
      this.box = { x: x - w / 2, y: foot - h, w, h };
      this.headY = foot - h * 0.82;
    },

    hit(x, y) {
      const b = this.box;
      if (!b) return false;
      if (this.state === 'sleep') return false;
      const pad = 18;
      return x > b.x + b.w * 0.12 - pad && x < b.x + b.w * 0.88 + pad && y > b.y - pad && y < b.y + b.h + pad;
    },

    press() {
      this.wob = 1;
      audio.greet();
    },

    tap() {
      if (this.state === 'bounce') { boostBounce(); return; }
      if (baby.want === 'brother' && !baby.busy()) { visitBaby(true); return; }
      if (canLull()) { lullaby(); return; }
      if (this.state === 'push' || this.state === 'kneel' || this.state === 'rock') return;
      const r = this.reactIx++ % 3;
      if (r === 0) {
        this.setState('hop');
        this.vAir = 820;
        audio.boing();
        fx.stars(this.x, this.y - 40, 6, 200);
      } else if (r === 1) {
        this.setState('magic', 1.3);
        audio.sparkle();
        fx.sparkle(this.x, this.y - this.height('stand', depthAt(this.y)) * 0.75, 24, 260);
      } else {
        this.setState('wave', 1.2);
        fx.hearts(this.x, this.y - this.height('stand', depthAt(this.y)), 3);
      }
    },

    walkTo(x, y, then = null) {
      if (this.state === 'sleep') wake();
      if (this.state === 'bounce') leaveTrampoline();
      if (this.held || this.state === 'push') return;
      const p = clampToFloor(x, y);
      this.target = p;
      this.then = then;
      const dist = Math.hypot(p.x - this.x, p.y - this.y);
      if (dist < 8) { this.setState('idle'); if (then) then(); return; }
      this.speed = clamp(dist / 1.0, 420, 1150);
      if (Math.abs(p.x - this.x) > 20) this.facing = p.x >= this.x ? 1 : -1;
      this.setState('walk');
    },

    grab(x, y) {
      if (this.state === 'sleep') wake(true);
      if (this.state === 'bounce') this.tramp = null;
      this.held = true;
      this.hold = { x, y };
      this.swing = 0; this.swingV = 0;
      this.then = null;
      this.setState('held');
      audio.whoosh();
    },
    drag(x, y) {
      this.swingV -= (x - this.hold.x) * 0.02;
      this.hold = { x, y };
    },
    drop(x, y, vx, vy) {
      this.held = false;
      const h = this.height('jump', 1);
      const foot = y + h * 0.9;
      for (const t of W.dropTargets) if (t.accept && t.accept(this, x, foot)) return;
      fallFrom(this, x, foot, vx, vy);
      this.setState('fall');
    },

    update(dt) {
      this.stateT += dt;
      this.wob = Math.max(0, this.wob - dt * 1.8);
      this.squash = Math.max(0, this.squash - dt * 3);
      if (this.want && W.t > this.wantT + 9) this.want = null;

      switch (this.state) {
        case 'walk': stepWalk(dt); break;
        case 'fall': case 'hop': case 'splash': stepAir(dt); break;
        case 'bounce': stepBounce(dt); break;
        case 'held':
          this.swingV += (-this.swing * 38 - this.swingV * 4.5) * dt;
          this.swing = clamp(this.swing + this.swingV * dt, -0.7, 0.7);
          break;
        case 'sleep':
          if (this.stateT > 1.2) { this.stateT = 0; fx.zzz(PLACES.bed.x - 120, PLACES.bed.y - 200); }
          break;
        case 'idle':
          if (W.t > this.idleAt) idleFidget();
          break;
        case 'push': break;
        default:
          if (this.dur && this.stateT > this.dur) this.setState('idle');
      }
    },

    hint() { this.wob = 0.9; },

    // Thinking of the clothes this weather needs.
    drawUI(g) {
      if (!this.want || this.held || this.state === 'sleep' || !this.box) return;
      const img = W.img['card_' + this.want];
      if (!img) return;
      const side = this.x > W.cam.x + W.cam.viewW * 0.4 ? -1 : 1;
      const bx = this.x + side * 110, by = this.box.y - 70;
      drawBubble(g, bx, by, W.t - this.wantT, W.t, gg => {
        const bb = boundsOf(img);
        const h = 104;
        const dh = h / (bb.y1 - bb.y0);
        const dw = dh * img.naturalWidth / img.naturalHeight;
        gg.drawImage(img, -((bb.x0 + bb.x1) / 2) * dw, -h / 2 - bb.y0 * dh, dw, dh);
      }, side);
    },

    async wear(i) {
      if (i === this.outfit && this.imgs.stand) {
        this.wob = 1;
        audio.pop();
        return;
      }
      const set = await loadSet(i);
      if (!W.isAlive()) return;
      this.outfit = i;
      this.imgs = set || {};
      try { localStorage.setItem(LS_OUTFIT, String(i)); } catch (e) { /* private mode */ }
      const h = this.height('stand', depthAt(this.y));
      fx.poof(this.x, this.y - h * 0.5, 12, 130);
      fx.sparkle(this.x, this.y - h * 0.6, 18, 240);
      audio.sparkle();
      W.say(OUTFITS[i].word);
      this.wob = 1;
      if (this.want && OUTFITS[i].id === this.want) {
        this.want = null;
        celebrate(this.x, this.y - h, 'outfit');
      }
      // Warm the other outfits quietly so the next change is instant.
      setTimeout(() => OUTFITS.forEach((_, k) => loadSet(k)), 600);
    },
  };
  W.boy = boy;

  function fallFrom(k, x, foot, vx = 0, vy = 0) {
    const f = floorFor(clamp(x, WORLD.floor.home.x0, WORLD.floor.garden.x1));
    const rest = clamp(foot, f.y0, f.y1);
    const p = clampToFloor(x, rest);
    k.x = p.x; k.y = p.y;
    k.air = Math.max(0, p.y - foot);
    k.vAir = clamp(-vy * 0.25, -100, 700);
    k.vx = clamp(vx * 0.25, -500, 500);
  }

  function stepWalk(dt) {
    const t = boy.target;
    const dx = t.x - boy.x, dy = t.y - boy.y;
    const d = Math.hypot(dx, dy);
    const step = boy.speed * dt;
    const before = boy.x;
    if (d <= step) {
      boy.x = t.x; boy.y = t.y;
      boy.setState('idle');
      boy.idleAt = W.t + rand(5, 9);
      const then = boy.then;
      boy.then = null;
      if (then) then();
    } else {
      boy.x += dx / d * step;
      boy.y += dy / d * step;
      if (Math.abs(dx) > 4) boy.facing = dx > 0 ? 1 : -1;
      boy.walkPhase += dt * boy.speed / 300;
      if (W.t > boy.stepAt) {
        boy.stepAt = W.t + 0.3 * 600 / boy.speed;
        audio.footstep();
        if (roomAt(boy.x) === 'garden' && W.sky && W.sky.snow > 0.5) audio.crunch();
      }
    }
    if ((before - WORLD.doorX) * (boy.x - WORLD.doorX) <= 0 && before !== boy.x) W.emit('crossDoor');
    const pud = W.sky && W.sky.puddleAt(boy.x, boy.y);
    if (pud && W.t > boy.splashAt) {
      boy.splashAt = W.t + 0.45;
      pud.ripple = 1;
      audio.splash();
      fx.splash(boy.x, boy.y, 0.6);
    }
  }

  function stepAir(dt) {
    boy.vAir -= GRAVITY * dt;
    boy.air += boy.vAir * dt;
    if (boy.vx) {
      boy.x = clamp(boy.x + boy.vx * dt, WORLD.floor.home.x0, WORLD.floor.garden.x1);
      boy.vx *= Math.exp(-3 * dt);
    }
    if (boy.air <= 0 && boy.vAir <= 0) {
      boy.air = 0; boy.vAir = 0; boy.vx = 0;
      boy.squash = 1;
      const pud = W.sky && W.sky.puddleAt(boy.x, boy.y);
      if (pud) {
        pud.ripple = 1;
        audio.splash();
        fx.splash(boy.x, boy.y, 1.6);
        W.say('Splash');
      } else {
        audio.thud();
        fx.dust(boy.x, boy.y, 0);
      }
      boy.setState('idle');
      boy.idleAt = W.t + rand(4, 8);
      W.emit('boyLanded', boy);
    }
  }

  /* ---- trampoline ---- */

  const BOUNCE_PEAKS = [150, 230, 330, 470];
  function startBounce(tramp) {
    boy.tramp = tramp;
    boy.x = tramp.x;
    boy.y = tramp.y;
    boy.air = 1;
    boy.vAir = Math.sqrt(2 * GRAVITY * BOUNCE_PEAKS[0]);
    boy.boost = 0;
    boy.quietBounces = 0;
    boy.setState('bounce');
    audio.boing();
  }
  boy.startBounce = startBounce;

  function boostBounce() {
    boy.boost = Math.min(BOUNCE_PEAKS.length - 1, boy.boost + 1);
    boy.quietBounces = 0;
    boy.wob = 0.6;
  }
  boy.boostBounce = boostBounce;

  function stepBounce(dt) {
    const tr = boy.tramp;
    if (!tr) { boy.setState('fall'); return; }
    boy.vAir -= GRAVITY * dt;
    boy.air += boy.vAir * dt;
    if (boy.air <= 0) {
      boy.air = 0;
      tr.land(1 + boy.boost * 0.4);
      if (boy.boost === 0) boy.quietBounces++;
      if (boy.quietBounces >= 3) { leaveTrampoline(); return; }
      const peak = BOUNCE_PEAKS[boy.boost];
      boy.vAir = Math.sqrt(2 * GRAVITY * peak);
      audio.boing();
      if (boy.boost >= 2) {
        fx.stars(boy.x, tr.matY() - 40, 4 + boy.boost * 2, 240);
        audio.shimmer(523.25 * (1 + boy.boost * 0.25));
      }
      if (boy.boost === BOUNCE_PEAKS.length - 1) W.say('Up');
      boy.boost = Math.max(0, boy.boost - 1);
    }
  }

  function leaveTrampoline() {
    const tr = boy.tramp;
    boy.tramp = null;
    if (!tr) return;
    boy.x = tr.x + (Math.random() < 0.5 ? -1 : 1) * tr.w * 0.3;
    boy.y = clamp(tr.y + 30, WORLD.floor.garden.y0, WORLD.floor.garden.y1);
    boy.air = Math.max(0, boy.y - tr.matY());
    boy.vAir = 300;
    boy.setState('fall');
  }

  /* ---- bed ---- */

  function sleep() {
    boy.setState('sleep');
    boy.x = PLACES.bed.x;
    boy.y = PLACES.bed.y + 40;
    boy.target = null;
    audio.sleepyCoo();
    let n = 0;
    const lull = setInterval(() => {
      if (!W.isAlive() || boy.state !== 'sleep' || n > 4) { clearInterval(lull); return; }
      audio.bell([4, 2, 3, 1, 0][n++]);
    }, 420);
    setTimeout(() => { if (W.isAlive() && boy.state === 'sleep') W.sky.setDay(true); }, 500);
    W.emit('boySleep');
  }
  boy.sleep = sleep;
  boy.goToBed = () => boy.walkTo(PLACES.bed.x + 90, 690, sleep);

  function wake(quiet = false) {
    if (boy.state !== 'sleep') return;
    boy.x = PLACES.bed.x + 150;
    boy.y = 700;
    boy.air = 120;
    boy.vAir = 500;
    boy.setState('hop');
    if (!quiet) audio.boing();
    if (W.dayT > 0.5) W.sky.setDay(false);
    W.emit('boyWake');
  }
  boy.wake = wake;
  W.on('morning', () => { if (boy.state === 'sleep') wake(); });

  // Helping with the snowman: he goes and kneels beside it, packing snow.
  W.on('snowmanGrew', sm => {
    if (boy.held || boy.state === 'sleep' || boy.state === 'bounce' || boy.state === 'push') return;
    const side = boy.x < sm.x ? -1 : 1;
    boy.walkTo(sm.x + side * 190, sm.y + 10, () => {
      boy.facing = -side;
      boy.setState('kneel', 1.4);
    });
  });

  // A tapped puddle is an invitation to jump in it.
  W.on('puddleTapped', p => {
    if (boy.held || boy.state === 'sleep' || boy.state === 'push') return;
    const side = boy.x < p.x ? -1 : 1;
    boy.walkTo(p.x + side * 110, p.y, () => {
      boy.facing = -side;
      boy.setState('hop');
      boy.vAir = 760;
      boy.vx = -side * 230;
    });
  });

  function idleFidget() {
    boy.idleAt = W.t + rand(6, 11);
    const r = Math.random();
    if (r < 0.4) {
      boy.facing *= -1;
    } else if (r < 0.7) {
      boy.setState('wave', 1.1);
    } else {
      boy.setState('hop');
      boy.vAir = 520;
    }
  }

  /* ---- outfit wishes ----
     Weather the brother is not dressed for makes him think of the right
     clothes, which waits for the child to find them in the wardrobe. */
  function wish(id) {
    if (OUTFITS[boy.outfit].id === id) return;
    boy.want = id;
    boy.wantT = W.t;
  }
  W.on('weather:rain', () => wish('rain'));
  W.on('weather:snow', () => wish('winter'));
  W.on('weather:clear', () => { if (boy.outfit !== 2) wish('summer'); });

  /* ================= the baby sister ================= */

  const WANTS = ['teddy', 'bottle', 'duck', 'brother', 'rattle', 'ball', 'blanket', 'wand'];
  // She is carried around her middle, so she sits under the finger rather
  // than dangling below it: this much of her height is above the finger.
  const GRIP = 0.45;
  const HELD_DEPTH = 1.08;

  const baby = {
    kind: 'baby', draggable: true,
    x: PLACES.babyHome.x, y: PLACES.babyHome.y, facing: -1,
    state: 'sit', stateT: 0, dur: 0, look: false, lookAt: 3,
    air: 0, vAir: 0, vx: 0,
    held: false, hold: { x: 0, y: 0 }, swing: 0, swingV: 0,
    wob: 0, squash: 0, box: null,
    want: null, wantT: 0, nextWantAt: 7, lastWant: null,
    blanket: false, using: null, stroller: null, nap: false,
    crawlTo: null, then: null, momentIx: 0, settleUntil: 0,
    get z() { return this.held ? 3001 : this.y + 0.2; },
    get layer() { return this.held ? 'front' : 'sorted'; },

    setState(s, dur = 0) { this.state = s; this.stateT = 0; this.dur = dur; },
    busy() { return ['held', 'fall', 'stroller', 'visit', 'lull'].includes(this.state) || !!this.using; },
    // Awake, on the floor and not in the middle of anything.
    free() { return !this.busy() && !['sleep', 'peek'].includes(this.state); },
    // Where her feet are while she is carried with the finger at `y`.
    heldFoot(y) { return y + SIZE.babyH * HELD_DEPTH * BABY_POSES.happy.h * (1 - GRIP); },

    poseKey() {
      switch (this.state) {
        case 'crawl': return 'crawl';
        case 'held': case 'fall': case 'happy': case 'clap': case 'shake': case 'bubbles': return 'happy';
        case 'reach': return 'reach';
        case 'sleepy': return 'sleepy';
        case 'hug': return 'hug';
        case 'sleep': return 'sleep';
        // Yawning while her brother hums; watching him as he comes over.
        case 'lull': return boy.state === 'kneel' ? 'sleepy' : 'look';
        case 'stroller':
          if (this.nap) return 'sleep';
          if (boy.state === 'rock') return 'sleepy';
          return this.stateT % 3 < 1.2 ? 'happy' : 'look';
        case 'drink': return 'sit';
        default: return this.look ? 'look' : 'sit';
      }
    },
    flipFor(key) {
      // Crawling and looking are drawn facing right; the front-on poses do
      // not need turning.
      return (key === 'crawl' || key === 'look') && this.facing < 0;
    },

    drawAt(g, x, foot, depth, key = this.poseKey()) {
      const pose = BABY_POSES[key] || BABY_POSES.sit;
      const img = W.img['baby_' + key] || W.img.baby_sit;
      if (!img) return null;
      const h = SIZE.babyH * depth * pose.h;
      const sq = this.squash + Math.sin(this.wob * 18) * 0.1 * this.wob;
      g.save();
      g.translate(x, foot);
      if (this.state === 'shake' || this.state === 'clap') g.rotate(Math.sin(this.stateT * 16) * 0.05);
      g.scale(1 + sq * 0.12, 1 - sq * 0.12);
      const w = drawPose(g, img, h, this.flipFor(key));
      g.restore();
      return { w, h };
    },

    draw(g) {
      if (this.state === 'stroller') return;   // the pram draws her
      const depth = this.held ? HELD_DEPTH : depthAt(this.y);
      const key = this.poseKey();
      const pose = BABY_POSES[key] || BABY_POSES.sit;
      const h = SIZE.babyH * depth * pose.h;
      let x = this.x, foot = this.y - this.air;
      if (this.held) { x = this.hold.x; foot = this.hold.y + h * (1 - GRIP); }
      if (!this.held) shadow(g, this.x, this.y, h * (key === 'sleep' || key === 'crawl' ? 1.2 : 0.75), this.air);

      if (this.state === 'peek') { drawSheet(g, x, foot, depth); this.box = { x: x - 90 * depth, y: foot - 200 * depth, w: 180 * depth, h: 200 * depth }; return; }

      g.save();
      if (this.held) {
        g.translate(x, this.hold.y);
        g.rotate(this.swing);
        g.translate(-x, -this.hold.y);
      }
      const r = this.drawAt(g, x, foot, depth, key);
      if (this.state === 'drink' && W.sprites.bottle) {
        g.save();
        g.translate(x + 26 * depth, foot - h * 0.62);
        g.rotate(-2.3 + Math.sin(this.stateT * 6) * 0.08);
        const k = 0.62 * depth;
        g.scale(k, k);
        W.blit(g, W.sprites.bottle);
        g.restore();
      }
      if (this.state === 'sleep' && this.blanket && W.img.toy_blanket) {
        const bi = W.img.toy_blanket;
        g.save();
        g.globalAlpha = 0.98;
        const bw = 190 * depth, bh = bw * bi.naturalHeight / bi.naturalWidth * 0.9;
        g.drawImage(bi, x - bw * 0.35, foot - bh * 0.95, bw, bh);
        g.restore();
      }
      g.restore();
      if (r) {
        this.box = { x: x - r.w / 2, y: foot - r.h, w: r.w, h: r.h };
        this.headY = foot - r.h * 0.8;
      }
    },

    drawUI(g) {
      this.bubbleAt = null;
      if (!this.want || this.held || ['sleep', 'stroller', 'visit', 'lull'].includes(this.state)) return;
      const b = this.box;
      if (!b) return;
      // On whichever side has more room on screen.
      const side = this.x > W.cam.x + W.cam.viewW * 0.6 ? -1 : 1;
      const bx = this.x + side * 105, by = b.y - 95;
      this.bubbleAt = { x: bx, y: by };
      drawBubble(g, bx, by, W.t - this.wantT, W.t, gg => drawWantIcon(gg, this.want), side);
    },

    hit(x, y) {
      this.bubbleTap = false;
      // In the pram, touching her (or the top of the basket) lifts her out;
      // the handle and wheels still move the pram.
      if (this.state === 'stroller') return !!this.stroller && this.stroller.seatHit(x, y);
      if (this.want && this.bubbleAt && Math.hypot(x - this.bubbleAt.x, y - this.bubbleAt.y) < 80) { this.bubbleTap = true; return true; }
      const b = this.box;
      if (!b) return false;
      const pad = 30;
      return x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;
    },

    press() {
      this.wob = 1;
      if (this.state === 'stroller' && this.stroller) this.stroller.wob = 0.5;
      if (this.state !== 'sleep' && !this.nap) audio.giggle();
    },

    tap() {
      if (this.state === 'stroller') {
        if (this.nap) {
          this.nap = false;
          audio.coo();
          fx.hearts(this.x, this.y - 240, 2);
        } else if (this.stroller) {
          this.stroller.tap();   // off for a ride, as when the pram is tapped
        }
        return;
      }
      if (this.bubbleTap) { pointToWant(); return; }
      if (this.state === 'peek') { reveal(); return; }
      if (this.state === 'sleep') {
        shedBlanket();
        this.setState('happy', 1.6);
        audio.coo();
        fx.hearts(this.x, this.y - 120, 2);
        return;
      }
      if (this.busy()) return;
      this.setState('happy', 1.5);
      fx.hearts(this.x, this.y - SIZE.babyH * depthAt(this.y), 3);
      if (this.want) pointToWant();
    },

    grab(x, y) {
      if (this.state === 'stroller' && this.stroller) {
        this.stroller.release();
        this.stroller.wob = 1;
        audio.squeak();
      }
      this.stroller = null;
      this.nap = false;
      this.held = true;
      this.hold = { x, y };
      this.swing = 0; this.swingV = 0;
      shedBlanket();
      this.crawlTo = null;
      this.then = null;
      releaseUsing();
      this.setState('held');
      audio.giggle();
    },
    drag(x, y) {
      // Carried in arms, she sways a little rather than swinging.
      this.swingV -= (x - this.hold.x) * 0.012;
      this.hold = { x, y };
    },
    drop(x, y, vx, vy) {
      this.held = false;
      const foot = this.heldFoot(y);
      for (const t of W.dropTargets) if (t.accept && t.accept(this, x, foot)) return;
      fallFrom(this, x, foot, vx * 0.4, vy * 0.4);
      this.vAir = Math.min(this.vAir, 200);
      this.setState('fall');
    },

    update(dt) {
      this.stateT += dt;
      this.wob = Math.max(0, this.wob - dt * 1.8);
      this.squash = Math.max(0, this.squash - dt * 3);
      if (this.want && W.t > this.wantT + 16) clearWant();

      switch (this.state) {
        case 'held':
          this.swingV += (-this.swing * 60 - this.swingV * 7) * dt;
          this.swing = clamp(this.swing + this.swingV * dt, -0.35, 0.35);
          return;
        case 'fall': {
          // She floats down softly rather than dropping like a toy.
          this.vAir = Math.max(this.vAir - GRAVITY * 0.55 * dt, -950);
          this.air += this.vAir * dt;
          if (this.vx) {
            this.x = clamp(this.x + this.vx * dt, WORLD.floor.home.x0, WORLD.floor.garden.x1);
            this.vx *= Math.exp(-4 * dt);
          }
          if (this.air <= 0 && this.vAir <= 0) {
            this.air = 0; this.vAir = 0; this.vx = 0;
            this.squash = 0.6;
            audio.coo();
            this.setState('sit');
            this.lookAt = rand(1.5, 3);
            this.nextWantAt = Math.max(this.nextWantAt, W.t + 4);
            // She stays where she was put for a while before crawling off.
            this.settleUntil = W.t + 25;
          }
          return;
        }
        case 'crawl': stepCrawl(dt); return;
        case 'sit': idle(dt); return;
        case 'reach': case 'sleepy':
          if (!this.want) this.setState('sit');
          else if (this.state === 'sleepy' && this.stateT > 12) fallAsleep(false);
          return;
        case 'sleep': {
          if (this.stateT > 1.6) { this.stateT = 0.0001; fx.zzz(this.x + 30, this.y - 70); }
          return;
        }
        case 'bubbles':
          if (Math.random() < dt * 6) fx.bubble(this.x + 30, this.y - 140, 1);
          if (this.stateT > this.dur) finishUsing();
          return;
        case 'stroller': {
          // She goes wherever the pram goes.
          const p = this.stroller;
          if (!p) { this.setState('sit'); return; }
          this.x = p.x; this.y = p.y + 1;
          if (this.nap && this.stateT > 1.6) { this.stateT = 0.0001; fx.zzz(this.x + 40, this.y - 230); }
          return;
        }
        case 'visit': case 'lull':
          // The brother was sent somewhere else on the way over.
          if (this.stateT > 6) this.setState('sit');
          return;
        default:
          if (this.dur && this.stateT > this.dur) finishUsing();
      }
    },

    hint() { this.wob = 0.9; },
  };
  W.baby = baby;

  function idle(dt) {
    // Glances around, and now and then crawls a little way.
    baby.lookAt -= dt;
    if (baby.lookAt <= 0) {
      baby.look = !baby.look;
      baby.lookAt = baby.look ? rand(1.4, 2.6) : rand(3, 6);
      if (baby.look) baby.facing = boy.x > baby.x ? 1 : -1;
      if (!baby.look && W.t > baby.settleUntil && Math.random() < 0.25) {
        const f = floorFor(baby.x);
        const tx = clamp(baby.x + rand(-180, 180), f.x0 + 40, f.x1 - 40);
        crawl(tx, clamp(baby.y + rand(-30, 30), f.y0, f.y1));
        return;
      }
    }
    if (W.t > baby.nextWantAt) pickWant();
    if (W.dayT > 0.85 && baby.stateT > 14 && !baby.want) fallAsleep(false);
  }

  function crawl(x, y, then = null) {
    const p = clampToFloor(x, y);
    baby.crawlTo = p;
    baby.then = then;
    baby.facing = p.x >= baby.x ? 1 : -1;
    baby.setState('crawl');
  }
  baby.crawlOver = crawl;

  function stepCrawl(dt) {
    const t = baby.crawlTo;
    if (!t) { baby.setState('sit'); return; }
    const dx = t.x - baby.x, dy = t.y - baby.y;
    const d = Math.hypot(dx, dy);
    const step = 150 * dt * (0.7 + 0.3 * Math.abs(Math.sin(baby.stateT * 6)));
    if (d <= step) {
      baby.x = t.x; baby.y = t.y;
      baby.crawlTo = null;
      baby.setState('sit');
      const then = baby.then;
      baby.then = null;
      if (then) then();
    } else {
      baby.x += dx / d * step;
      baby.y += dy / d * step;
    }
  }

  /* ---- wants ---- */

  function pickWant() {
    baby.nextWantAt = W.t + rand(11, 17);
    let options = WANTS.filter(w => w !== baby.lastWant);
    if (W.dayT > 0.5) options = ['blanket', 'bottle', 'teddy', 'brother'];
    // Only ask for toys that exist somewhere in the house or garden.
    options = options.filter(w => w === 'brother' || w === 'blanket' ? true : !!W.findToy(w));
    // Prefer things she can see from where she sits, so the wish is one a
    // toddler can actually find.
    const room = roomAt(baby.x);
    const near = options.filter(w => {
      if (w === 'brother') return roomAt(boy.x) === room;
      const toy = w === 'blanket' ? W.findToy('blanket') : W.findToy(w);
      if (!toy) return w === 'blanket';
      return toy.hidden ? room === 'home' && W.toybox && W.toybox.has(toy) : roomAt(toy.x) === room;
    });
    if (near.length) options = near;
    if (Math.hypot(boy.x - baby.x, boy.y - baby.y) < 260) options = options.filter(w => w !== 'brother');
    if (!options.length) return;
    const want = options[(Math.random() * options.length) | 0];
    baby.want = want;
    baby.lastWant = want;
    baby.wantT = W.t;
    baby.look = false;
    baby.setState(want === 'blanket' ? 'sleepy' : 'reach');
    audio.babble();
  }

  function clearWant() {
    baby.want = null;
    if (baby.state === 'reach' || baby.state === 'sleepy') baby.setState('sit');
    baby.nextWantAt = W.t + rand(9, 14);
  }

  // Tapping the bubble (or the baby while she wants something) points a
  // trail of sparkles at the thing she is thinking of.
  function pointToWant() {
    const want = baby.want;
    if (!want) return;
    audio.babble();
    let target = null;
    if (want === 'brother') target = boy;
    else {
      const toy = W.findToy(want);
      if (toy && toy.hidden && W.toybox && W.toybox.has(toy)) target = W.toybox;
      else if (toy && !toy.hidden) target = toy;
    }
    if (!target) return;
    const from = baby.bubbleAt || { x: baby.x, y: baby.y - 200 };
    const tx = target.x, ty = (target.y || 700) - 80;
    for (let i = 1; i <= 8; i++) {
      const k = i / 8;
      setTimeout(() => {
        if (!W.isAlive()) return;
        fx.sparkle(from.x + (tx - from.x) * k, from.y + (ty - from.y) * k - Math.sin(k * Math.PI) * 120, 3, 40);
      }, i * 50);
    }
    if (target.hint) setTimeout(() => target.hint && target.hint(), 420);
    if (!W.onScreen(tx, -100)) W.reveal(tx);
  }

  function drawWantIcon(g, want) {
    const icon = (img, h) => {
      if (!img) return;
      const bb = boundsOf(img);
      const dh = h / (bb.y1 - bb.y0);
      const dw = dh * img.naturalWidth / img.naturalHeight;
      g.drawImage(img, -((bb.x0 + bb.x1) / 2) * dw, -h / 2 - bb.y0 * dh - 2, dw, dh);
    };
    const sprite = (name, h) => {
      const sp = W.sprites[name];
      if (!sp) return;
      const k = h / sp.vb[3];
      g.save(); g.scale(k, k); g.translate(0, sp.vb[3] / 2); W.blit(g, sp); g.restore();
    };
    switch (want) {
      case 'teddy': icon(W.img.toy_teddy, 92); break;
      case 'duck': icon(W.img.toy_duck, 84); break;
      case 'rattle': icon(W.img.toy_rattle, 92); break;
      case 'ball': icon(W.img.toy_ball, 80); break;
      case 'blanket': icon(W.img.toy_blanket, 62); break;
      case 'bottle': sprite('bottle', 96); break;
      case 'wand': sprite('wand', 104); break;
      case 'brother': {
        const img = boy.imgs.stand;
        if (!img) break;
        // Just his face, in a circle.
        g.save();
        g.beginPath(); g.arc(0, 0, 56, 0, Math.PI * 2); g.clip();
        const h = 330;
        const bb = boundsOf(img);
        const dh = h / (bb.y1 - bb.y0);
        const dw = dh * img.naturalWidth / img.naturalHeight;
        g.drawImage(img, -((bb.x0 + bb.x1) / 2) * dw, -bb.y0 * dh - 92, dw, dh);
        g.restore();
        break;
      }
      default: break;
    }
  }

  /* ---- receiving things ---- */

  const NEAR = 170;
  function nearBaby(x, y) {
    if (baby.held || baby.state === 'stroller') return false;
    const cy = baby.y - SIZE.babyH * 0.5 * depthAt(baby.y);
    return Math.hypot(x - baby.x, (y - cy) * 0.8) < NEAR;
  }

  function releaseUsing() {
    if (!baby.using) return;
    const toy = baby.using;
    baby.using = null;
    toy.hidden = false;
    toy.landFrom(baby.x + (baby.x < 3300 ? 95 : -95), baby.y + 12, 0, -300);
  }

  function finishUsing() {
    releaseUsing();
    baby.setState('sit');
    baby.lookAt = rand(1, 2);
  }

  const REACTIONS = {
    teddy: { state: 'hug', dur: 3.2, moment: 'teddy', sound: () => { audio.gentleGift(); setTimeout(() => audio.giggle(), 300); } },
    duck: { state: 'happy', dur: 2.4, moment: 'duck', sound: () => { audio.quack(); setTimeout(() => audio.quack(), 380); } },
    rattle: { state: 'shake', dur: 2.4, moment: 'rattle', sound: () => { audio.rattleShake(); setTimeout(() => audio.rattleShake(), 500); } },
    ball: { state: 'clap', dur: 2.4, moment: 'clap', sound: () => { audio.clapClap(); setTimeout(() => audio.clapClap(), 520); } },
    bottle: { state: 'drink', dur: 2.6, moment: null, sound: () => audio.glug() },
    apple: { state: 'happy', dur: 1.8, moment: null, sound: () => audio.chomp() },
    wand: { state: 'bubbles', dur: 3.2, moment: 'bubbles', sound: () => audio.shimmer(987.77) },
  };

  function receive(toy) {
    const matched = baby.want === toy.kind;
    baby.wob = 0.8;
    if (toy.kind === 'blanket') {
      if (matched || baby.state === 'sleepy' || W.dayT > 0.5) {
        toy.hidden = true;
        baby.using = null;
        baby.blanketToy = toy;
        fallAsleep(true);
        if (matched) celebrate(baby.x, baby.y - 160, 'blanket');
        clearWantQuiet();
      } else {
        toy.hidden = true;
        baby.blanketToy = toy;
        baby.setState('peek');
        audio.whoosh();
        W.say('Where');
      }
      return true;
    }
    const r = REACTIONS[toy.kind];
    if (!r) return false;
    baby.nextWantAt = Math.max(baby.nextWantAt, W.t + r.dur + 7);
    releaseUsing();
    toy.hidden = true;
    baby.using = toy;
    baby.setState(r.state, r.dur);
    baby.facing = 1;
    r.sound();
    fx.hearts(baby.x, baby.y - SIZE.babyH, 3);
    if (matched) {
      clearWantQuiet();
      celebrate(baby.x, baby.y - 180, toy.kind);
    }
    if (r.moment) W.moments.snap(r.moment, baby.x, baby.y - 140);
    W.emit('babyGot', toy.kind);
    return true;
  }

  function clearWantQuiet() {
    baby.want = null;
    baby.nextWantAt = W.t + rand(10, 15);
  }

  function reveal() {
    const toy = baby.blanketToy;
    baby.blanketToy = null;
    if (toy) {
      toy.hidden = false;
      toy.landFrom(baby.x + 110, baby.y + 10, 200, -700);
    }
    baby.setState('happy', 1.8);
    audio.giggle();
    setTimeout(() => audio.giggle(), 350);
    fx.sparkle(baby.x, baby.y - 120, 16, 200);
    fx.hearts(baby.x, baby.y - 160, 4);
    W.moments.snap('peekaboo', baby.x, baby.y - 140);
  }

  // Waking up or being picked up, her blanket slides off beside her (it is a
  // toy, so it must never be left hidden).
  function shedBlanket() {
    const toy = baby.blanketToy;
    baby.blanketToy = null;
    baby.blanket = false;
    if (!toy) return;
    toy.hidden = false;
    toy.landFrom(baby.x + 110, baby.y + 10);
  }

  function fallAsleep(withBlanket) {
    releaseUsing();
    // Already under the blanket for peekaboo: she just stays under it.
    if (baby.blanketToy) withBlanket = true;
    baby.blanket = withBlanket;
    if (!withBlanket && baby.blanketToy) { baby.blanketToy.hidden = false; baby.blanketToy = null; }
    baby.want = null;
    baby.setState('sleep');
    audio.sleepyCoo();
  }

  W.on('morning', () => {
    if (baby.nap) { baby.nap = false; audio.coo(); }
    if (baby.state === 'sleep') {
      shedBlanket();
      baby.setState('happy', 1.8);
      audio.coo();
    }
  });
  W.on('boySleep', () => {
    setTimeout(() => {
      if (!W.isAlive() || baby.busy() || baby.state === 'sleep') return;
      if (roomAt(baby.x) === 'home') fallAsleep(false);
    }, 1800);
  });

  /* ---- brother and sister together ---- */

  const TOGETHER = ['hug', 'lift', 'crawl'];
  function visitBaby(fromWant) {
    if (baby.busy() || baby.state === 'sleep') return;
    const side = boy.x < baby.x ? -1 : 1;
    const f = floorFor(baby.x);
    const gap = 210;
    const tx = clamp(baby.x + side * gap, f.x0, f.x1);
    const matched = baby.want === 'brother';
    baby.setState('visit');
    boy.walkTo(tx, baby.y + 6, () => {
      boy.facing = baby.x > boy.x ? 1 : -1;
      boy.setState('kneel', 3);
      const moment = TOGETHER[baby.momentIx++ % TOGETHER.length];
      const finish = () => {
        baby.setState('happy', 2);
        baby.facing = boy.x > baby.x ? 1 : -1;
        audio.giggle();
        fx.hearts((boy.x + baby.x) / 2, baby.y - 200, 5);
        if (matched) { clearWantQuiet(); celebrate((boy.x + baby.x) / 2, baby.y - 220, 'brother'); }
        W.moments.snap(moment, (boy.x + baby.x) / 2, baby.y - 160);
      };
      if (moment === 'crawl') {
        baby.state = 'crawl';
        baby.crawlTo = { x: boy.x - side * 120, y: baby.y };
        baby.facing = -side;
        baby.then = finish;
        baby.stateT = 0;
      } else {
        finish();
      }
    });
    if (!fromWant) baby.want = null;
  }
  baby.visit = visitBaby;

  /* ---- lullaby ----
     Tapping the brother while he is beside his awake sister has him hum her
     to sleep: he kneels by her (or rocks her pram) while she yawns and nods
     off. Tapping her wakes her again, so it can happen whenever a child
     likes. */

  const LULL_REACH = 330;
  const LULLABY = [4, 2, 3, 1, 2, 0];

  function canLull() {
    if (boy.held || ['sleep', 'bounce', 'push', 'rock', 'fall', 'hop', 'splash'].includes(boy.state)) return false;
    if (baby.held || ['sleep', 'fall', 'visit', 'lull', 'held'].includes(baby.state)) return false;
    let at = baby;
    if (baby.state === 'stroller') {
      at = baby.stroller;
      if (!at || baby.nap || at.ride || at.held) return false;
    }
    return roomAt(boy.x) === roomAt(at.x) && Math.abs(boy.x - at.x) < LULL_REACH;
  }

  // A music-box lullaby with notes drifting up. `still()` is checked before
  // every note so lifting her away stops the song.
  function hum(x, y, still, done) {
    let n = 0;
    const next = () => {
      if (!W.isAlive() || !still()) return;
      if (n < LULLABY.length) {
        audio.bell(LULLABY[n++]);
        fx.notes(x + rand(-50, 50), y, 1);
        setTimeout(next, 400);
      } else {
        done();
      }
    };
    next();
  }

  function lullaby() {
    baby.want = null;
    baby.nextWantAt = Math.max(baby.nextWantAt, W.t + 12);
    if (baby.state === 'stroller') { rockPram(baby.stroller); return; }
    releaseUsing();
    baby.crawlTo = null;
    baby.then = null;
    baby.setState('lull');
    baby.facing = boy.x > baby.x ? 1 : -1;
    const side = boy.x < baby.x ? -1 : 1;
    const f = floorFor(baby.x);
    boy.walkTo(clamp(baby.x + side * 170, f.x0, f.x1), baby.y + 6, () => {
      if (baby.state !== 'lull') return;
      boy.facing = baby.x > boy.x ? 1 : -1;
      boy.setState('kneel', 3.4);
      baby.stateT = 0;
      hum(baby.x, baby.y - 230, () => baby.state === 'lull', () => {
        fallAsleep(false);
        fx.hearts(baby.x, baby.y - 150, 2);
      });
    });
  }

  function rockPram(pram) {
    boy.walkTo(pram.x - pram.dir * 170, pram.y + 4, () => {
      if (!pram.hasBaby() || baby.nap || pram.ride || pram.held) return;
      boy.facing = pram.dir;
      boy.setState('rock', 3.4);
      hum(pram.x, pram.y - 300, () => pram.hasBaby() && boy.state === 'rock', () => {
        baby.nap = true;
        baby.stateT = 0;
        audio.sleepyCoo();
        fx.hearts(pram.x, pram.y - 260, 2);
      });
    });
  }

  // The baby takes toys dropped on her; the brother, dropped beside her,
  // comes to play.
  W.dropTargets.push({
    accept(item, x, y) {
      if (item === baby || item === boy) {
        if (item === boy && nearBaby(x, y - 120)) {
          fallFrom(boy, x, y);
          boy.setState('fall');
          setTimeout(() => { if (W.isAlive()) visitBaby(baby.want === 'brother'); }, 450);
          return true;
        }
        return false;
      }
      if (!nearBaby(x, y)) return false;
      if (baby.state === 'sleep' && item.kind !== 'blanket') return false;
      if (baby.state === 'peek') return false;
      return receive(item);
    },
  });

  // Walking up to her while she is thinking of him counts as a visit too.
  W.on('update', () => {
    if (baby.want === 'brother' && boy.state === 'idle' && !baby.busy()
      && Math.hypot(boy.x - baby.x, boy.y - baby.y) < 260) visitBaby(true);
  });

  /* ---- shared celebration ---- */

  function celebrate(x, y, what) {
    fx.confetti(x, y, 34);
    fx.stars(x, y, 6, 260);
    audio.softFanfare();
    W.praise();
    W.recordOutcome(true, String(what));
  }

  function drawSheet(g, x, foot, depth) {
    // The blanket over a sitting baby: a soft dome with stripes and a bow.
    const w = 92 * depth, h = 190 * depth;
    const wig = Math.sin(W.t * 5) * 4;
    g.save();
    g.translate(x, foot);
    g.beginPath();
    g.moveTo(-w, 0);
    g.bezierCurveTo(-w * 1.05, -h * 0.55, -w * 0.6 + wig, -h, 0, -h);
    g.bezierCurveTo(w * 0.6 + wig, -h, w * 1.05, -h * 0.55, w, 0);
    g.quadraticCurveTo(w * 0.5, 10, 0, 2);
    g.quadraticCurveTo(-w * 0.5, 10, -w, 0);
    g.closePath();
    g.fillStyle = '#fff3e6';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = '#f7c6cf';
    for (let yy = -h; yy < 10; yy += 34) g.fillRect(-w * 1.2, yy, w * 2.4, 13);
    g.restore();
    g.strokeStyle = 'rgba(107,74,58,0.6)';
    g.lineWidth = 3.5;
    g.stroke();
    g.fillStyle = '#f08ba2';
    g.translate(0, -h * 0.72);
    heartPath(g, 20);
    g.fill();
    g.restore();
  }

  W.kids = { boy, baby, celebrate, visitBaby, startBounce, nearBaby, lullaby };
  W.add(boy);
  W.add(baby);
  return { boy, baby, ready: loadSet(boy.outfit).then(set => { boy.imgs = set || {}; }) };
}
