// Play House: exterior countryside road, interactive Halloween festival
// banner, glowing jack-o'-lantern pumpkins, and storybook ghosts, zombies,
// skeletons, and vampires that move around the outside of the house when the
// Halloween banner is turned on — and sprint away from the house towards the
// windmill side whenever touched.

import { WORLD } from './layout.js';
import { quietMotion } from '../../engine/calm.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const backOut = t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
const INK = '#4a3b47';

// Pre-seeded cobblestones along the countryside lane outside the fence.
const COBBLES = Array.from({ length: 68 }, (_, i) => {
  const s = Math.sin(i * 12.9898) * 43758.5453;
  const f = s - Math.floor(s);
  const s2 = Math.sin((i + 17) * 78.233) * 19341.31;
  const f2 = s2 - Math.floor(s2);
  return {
    x: 1680 + i * 44 + (f - 0.5) * 20,
    y: 416 + f2 * 64,
    rx: 12 + f * 12,
    ry: 5 + f2 * 4.5,
    tone: i % 3 === 0 ? '#d8cab0' : i % 3 === 1 ? '#c7b698' : '#e4d8c0',
  };
});

// Jack-o'-lantern pumpkins that decorate the outside of the house and fence
// when the Halloween banner is switched on.
const PUMPKIN_SPOTS = [
  { x: 1684, y: 766, s: 1.12, face: 'grin', hat: true },
  { x: 1748, y: 566, s: 0.92, face: 'star', trio: true },
  { x: 1992, y: 516, s: 0.88, face: 'ooh' },
  { x: 1728 + 14, y: 382, s: 0.74, face: 'grin', post: true },
  { x: 2038 + 14, y: 382, s: 0.74, face: 'cat', post: true },
  { x: 2348 + 14, y: 382, s: 0.74, face: 'star', post: true },
  { x: 2658 + 14, y: 382, s: 0.74, face: 'grin', post: true },
  { x: 2968 + 14, y: 382, s: 0.74, face: 'ooh', post: true },
  { x: 3278 + 14, y: 382, s: 0.74, face: 'cat', post: true },
];

// The 12 Halloween creatures that patrol around the outside of the house.
const CREATURE_SPECS = [
  { kind: 'ghost', variant: 0, homeX: 1760, baseY: 318, minX: 1665, maxX: 2520, speed: 68 },
  { kind: 'zombie', variant: 0, homeX: 1840, baseY: 542, minX: 1690, maxX: 2560, speed: 58 },
  { kind: 'skeleton', variant: 0, homeX: 1960, baseY: 518, minX: 1710, maxX: 2680, speed: 72 },
  { kind: 'vampire', variant: 0, homeX: 2110, baseY: 548, minX: 1720, maxX: 2780, speed: 76 },
  { kind: 'ghost', variant: 1, homeX: 2240, baseY: 286, minX: 1700, maxX: 2920, speed: 74 },
  { kind: 'zombie', variant: 1, homeX: 2380, baseY: 486, minX: 1760, maxX: 3040, speed: 54 },
  { kind: 'vampire', variant: 1, homeX: 2520, baseY: 526, minX: 1800, maxX: 3160, speed: 80 },
  { kind: 'skeleton', variant: 1, homeX: 2680, baseY: 492, minX: 1850, maxX: 3260, speed: 70 },
  { kind: 'ghost', variant: 0, homeX: 2840, baseY: 334, minX: 1920, maxX: 3420, speed: 72 },
  { kind: 'zombie', variant: 0, homeX: 2980, baseY: 546, minX: 1980, maxX: 3480, speed: 60 },
  { kind: 'skeleton', variant: 0, homeX: 3140, baseY: 514, minX: 2060, maxX: 3580, speed: 74 },
  { kind: 'vampire', variant: 0, homeX: 3290, baseY: 538, minX: 2100, maxX: 3640, speed: 78 },
];

const SPOKEN_NAME = {
  ghost: 'Ghost',
  zombie: 'Zombie',
  skeleton: 'Skeleton',
  vampire: 'Vampire',
};

export function createVisitors(W) {
  const { audio, fx } = W;

  const halloween = {
    on: false,
    blend: 0,         // 0 = off, 1 = full Halloween mode
    wob: 0,
    pullWob: 0,
    spiderY: 0,
    spiderV: 0,
  };
  W.halloween = halloween;

  const pumpkins = PUMPKIN_SPOTS.map((p, i) => ({
    ...p,
    ix: i,
    wob: 0,
    flare: 0,
    phase: i * 1.3,
  }));

  /* ---------------- countryside road & windmill trail ---------------- */

  W.add({
    layer: 'outside',
    draw(g) {
      drawCountrysideRoad(g, W, halloween.blend);
    },
  });

  /* ---------------- fence bunting & porch cobwebs ---------------- */

  W.add({
    layer: 'decal',
    draw(g) {
      if (halloween.blend <= 0.01) return;
      g.save();
      g.globalAlpha = halloween.blend;
      drawFenceBunting(g, W);
      drawPorchCobwebs(g, W, halloween);
      g.restore();
    },
  });

  /* ---------------- interactive Halloween banner ---------------- */

  const banner = {
    x: 1855,
    y: 252,
    z: 502,
    layer: 'sorted',
    get wob() { return halloween.wob; },
    set wob(v) { halloween.wob = v; },
    hit(x, y) {
      // Generous target covering the arched Halloween banner, crest, and pull cord.
      if (x > 1710 && x < 2000 && y > 140 && y < 355) return true;
      // Touching the dangling spider under the porch eave when Halloween is on.
      if (halloween.blend > 0.5 && Math.hypot(x - 1722, y - (252 + halloween.spiderY)) < 38) {
        this.spiderTap = true;
        return true;
      }
      this.spiderTap = false;
      return false;
    },
    tap() {
      if (this.spiderTap) {
        this.spiderTap = false;
        halloween.spiderV = -260;
        audio.boing();
        fx.sparkle(1722, 252 + halloween.spiderY, 8, 90, ['#ffd54a', '#c59cff', '#ff8c3b']);
        return;
      }
      halloween.on = !halloween.on;
      halloween.wob = 1;
      halloween.pullWob = 1;
      audio.click();
      if (halloween.on) {
        audio.softFanfare();
        audio.sparkle();
        W.say('Halloween');
        if (!quietMotion()) {
          fx.stars(this.x, 225, 10, 260);
          fx.sparkle(this.x, 245, 22, 240, ['#ff8c24', '#ffd54a', '#b678ff', '#9be564']);
        }
        for (const p of pumpkins) p.wob = 0.9;
        summonCreatures();
        if (W.cam.x < 1350) W.panTo(2220);
      } else {
        audio.whoosh();
        if (!quietMotion()) {
          fx.sparkle(this.x, 245, 10, 160, ['#fff3c4', '#ffd54a']);
        }
        sendAllToWindmill();
      }
    },
    hint() {
      halloween.wob = 0.85;
      halloween.pullWob = 0.85;
    },
    update(dt) {
      halloween.wob = Math.max(0, halloween.wob - dt * 1.8);
      halloween.pullWob = Math.max(0, halloween.pullWob - dt * 2.2);
      const target = halloween.on ? 1 : 0;
      if (halloween.blend !== target) {
        const step = dt * 2.6;
        halloween.blend = clamp(halloween.blend + (target > halloween.blend ? step : -step), 0, 1);
      }
      if (!quietMotion()) {
        halloween.spiderV += (-halloween.spiderY * 28 - halloween.spiderV * 3.5) * dt;
        halloween.spiderY = clamp(halloween.spiderY + halloween.spiderV * dt, -26, 48);
      } else {
        halloween.spiderY = 0;
      }
      for (const p of pumpkins) {
        p.wob = Math.max(0, p.wob - dt * 2.2);
        p.flare = Math.max(0, p.flare - dt * 1.8);
      }
    },
    draw(g) {
      drawHalloweenBanner(g, W, halloween);
    },
  };
  W.add(banner);

  /* ---------------- tappable jack-o'-lantern pumpkins ---------------- */

  for (const p of pumpkins) {
    W.add({
      x: p.x,
      y: p.y,
      z: p.post ? 501 : p.y,
      layer: 'sorted',
      get hidden() { return halloween.blend <= 0.05; },
      hit(x, y) {
        if (halloween.blend < 0.35) return false;
        const r = 48 * p.s;
        return Math.hypot(x - p.x, y - (p.y - r * 0.65)) < r + 16;
      },
      tap() {
        p.wob = 1;
        p.flare = 1;
        audio.boing();
        audio.sparkle();
        W.say('Pumpkin');
        if (!quietMotion()) {
          fx.sparkle(p.x, p.y - 36 * p.s, 12, 130, ['#ffd54a', '#ff8c24', '#fff2b2']);
        }
      },
      draw(g) {
        if (halloween.blend <= 0.01) return;
        const popScale = backOut(clamp(halloween.blend, 0, 1));
        drawJackOLantern(g, W, p, popScale);
      },
    });
  }

  /* ---------------- Halloween creatures ---------------- */

  const visitors = CREATURE_SPECS.map((spec, i) => {
    const v = {
      ...spec,
      ix: i,
      x: spec.homeX,
      y: spec.baseY,
      face: i % 2 === 0 ? 1 : -1,
      target: spec.homeX + (i % 2 === 0 ? 220 : -220),
      phase: i * 1.7,
      wave: 0,
      wob: 0,
      hopY: 0,
      hopVy: 0,
      scale: 0,
      active: false,
      fleeing: false,
      fleeT: 0,
      fleeStartX: spec.homeX,
      fleeStartY: spec.baseY,
      fleeGoalX: spec.homeX + 900,
      fleeGoalY: 295,
      respawnAt: 0,
      dustAt: 0,
      bats: [],
      layer: 'sorted',
      get z() {
        if (this.fleeing && this.y < 485) return 499;
        return this.kind === 'ghost' ? 560 : this.y;
      },
      get hidden() { return !this.active && this.scale <= 0.02; },

      hit(x, y) {
        if ((!this.active && !this.fleeing) || this.scale < 0.35) return false;
        const h = (this.kind === 'ghost' ? 148 : 178) * this.scale;
        const w = 68 * this.scale;
        const cy = this.y - this.hopY - h * 0.52;
        return Math.abs(x - this.x) < w + 24 && Math.abs(y - cy) < h * 0.58 + 24;
      },

      tap() {
        this.fleeToWindmill(true);
      },

      fleeToWindmill(fromTouch = false) {
        const wm = W.windmillPos ? W.windmillPos() : { x: 2900, y: 274 };
        this.fleeing = true;
        this.fleeT = 0;
        this.fleeStartX = this.x;
        this.fleeStartY = this.y;
        // Always run AWAY from the house (house is on the left at x <= 1660)
        // towards the windmill side on the right-hand hills.
        this.face = 1;
        this.fleeGoalX = Math.max(wm.x + 120 + (this.ix % 3) * 55, this.x + 640);
        this.fleeGoalY = wm.y + 24 + (this.ix % 3) * 10;
        this.hopVy = fromTouch ? 430 : 240;
        this.wob = 1;
        if (fromTouch) {
          playCreatureReaction(W, this);
          if (!quietMotion()) {
            fx.poof(this.x, this.y - 75, 6, 54);
            fx.sparkle(this.x, this.y - 95, 14, 160,
              this.kind === 'ghost' ? ['#b8f2ff', '#ffffff', '#d8b8ff']
                : this.kind === 'vampire' ? ['#ff5c77', '#b87cff', '#ffd54a']
                : ['#ffd54a', '#ff8c24', '#a8e67c']);
            if (this.kind === 'vampire') {
              this.bats = Array.from({ length: 4 }, (_, bi) => ({
                x: (bi - 1.5) * 18,
                y: -90 - bi * 14,
                vx: 90 + bi * 35,
                vy: -75 - bi * 22,
                phase: bi * 1.4,
              }));
            }
          }
        }
      },

      update(dt) {
        this.wob = Math.max(0, this.wob - dt * 2.2);
        if (this.hopY > 0 || this.hopVy !== 0) {
          this.hopY += this.hopVy * dt;
          this.hopVy -= 1350 * dt;
          if (this.hopY <= 0) { this.hopY = 0; this.hopVy = 0; }
        }
        for (const b of this.bats) {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.phase += dt * 18;
        }

        // Respawn after fleeing once the timer elapses and the banner is still on.
        if (!this.active && !this.fleeing) {
          this.scale = Math.max(0, this.scale - dt * 3);
          if (halloween.on && W.t >= this.respawnAt) {
            this.active = true;
            this.x = this.homeX + rand(-60, 60);
            this.y = this.baseY;
            this.scale = 0.05;
            this.face = Math.random() < 0.5 ? 1 : -1;
            this.target = clamp(this.x + this.face * rand(180, 340), this.minX, this.maxX);
          }
          return;
        }

        // Fleeing away from the house towards the windmill side!
        if (this.fleeing) {
          this.fleeT += dt;
          const wm = W.windmillPos ? W.windmillPos() : { x: 2900, y: 274 };
          const goalX = Math.max(this.fleeGoalX, wm.x + 80);
          const spanX = Math.max(420, goalX - this.fleeStartX);
          const prog = clamp((this.x - this.fleeStartX) / spanX, 0, 1);
          const runSpeed = (this.kind === 'ghost' || this.kind === 'vampire' ? 560 : 500) * (1 - prog * 0.28);
          this.face = 1;
          this.x += runSpeed * dt;
          this.phase += dt * 19;

          // Climb the hillside path toward the windmill as they get further away.
          const hillT = Math.pow(prog, 1.35);
          this.y = lerp(this.fleeStartY, this.fleeGoalY, hillT);
          this.scale = clamp(lerp(1, 0.24, hillT), 0.2, 1);

          if (!quietMotion() && W.t > this.dustAt && this.scale > 0.45) {
            this.dustAt = W.t + 0.14;
            if (this.kind === 'ghost') {
              fx.sparkle(this.x - 24 * this.scale, this.y - 50 * this.scale, 2, 35, ['#d6f5ff', '#ffffff']);
            } else {
              fx.dust(this.x - 18 * this.scale, this.y, 1);
            }
          }

          if (prog >= 0.98 || this.x > WORLD.W + 80 || this.fleeT > 4.2) {
            if (!quietMotion() && W.onScreen(this.x, 120)) {
              fx.sparkle(this.x, this.y - 30 * this.scale, 6, 70, ['#ffd54a', '#ffffff', '#c59cff']);
            }
            this.fleeing = false;
            this.active = false;
            this.scale = 0;
            this.bats = [];
            this.respawnAt = W.t + rand(5.0, 8.0);
          }
          return;
        }

        // Normal Halloween patrol around the outside of the house.
        this.scale = Math.min(1, this.scale + dt * 3.2);
        if (quietMotion()) {
          this.phase += dt * 1.4;
          return;
        }
        this.phase += dt * (this.kind === 'ghost' ? 4.2 : 5.6);
        if (this.target === null || Math.abs(this.target - this.x) < 12) {
          // Pick a new patrol point around the house so they keep moving livelily.
          const dir = this.x <= this.minX + 60 ? 1 : this.x >= this.maxX - 60 ? -1 : (Math.random() < 0.65 ? -this.face : this.face);
          this.target = clamp(this.x + dir * rand(180, 420), this.minX, this.maxX);
        }
        const dx = this.target - this.x;
        this.face = dx >= 0 ? 1 : -1;
        const step = this.speed * dt;
        if (Math.abs(dx) <= step) this.x = this.target;
        else this.x += this.face * step;
      },

      draw(g) {
        if ((!this.active && !this.fleeing) || this.scale <= 0.02) return;
        drawCreature(g, W, this);
      },
    };
    return W.add(v);
  });

  function summonCreatures() {
    for (const [i, v] of visitors.entries()) {
      v.fleeing = false;
      v.active = true;
      v.bats = [];
      v.x = v.homeX + rand(-35, 35);
      v.y = v.baseY;
      v.scale = 0.1;
      v.hopY = 24 + (i % 3) * 12;
      v.hopVy = 220;
      v.face = i % 2 === 0 ? 1 : -1;
      v.target = clamp(v.x + v.face * rand(180, 360), v.minX, v.maxX);
    }
  }

  function sendAllToWindmill() {
    for (const v of visitors) {
      if (v.active && !v.fleeing) v.fleeToWindmill(false);
    }
  }

  /* ---------------- nighttime & Halloween additive glows ---------------- */

  W.on('glow', ({ g, n }) => {
    if (halloween.blend <= 0.02) return;
    const k = halloween.blend * Math.max(0.45, n);
    // Warm glow on the Halloween banner crest and hanging lanterns.
    radialGlow(g, 1855, 228, 175, `rgba(255,165,55,${(0.38 * k).toFixed(3)})`);
    radialGlow(g, 1730, 215, 75, `rgba(255,190,80,${(0.32 * k).toFixed(3)})`);
    radialGlow(g, 1980, 215, 75, `rgba(255,190,80,${(0.32 * k).toFixed(3)})`);
    // Each jack-o'-lantern casts a flickering candle halo.
    const flick = 0.92 + Math.sin(W.t * 11) * 0.08;
    for (const p of pumpkins) {
      radialGlow(g, p.x, p.y - 26 * p.s, (85 + p.flare * 35) * p.s * flick,
        `rgba(255,170,45,${((0.36 + p.flare * 0.2) * k).toFixed(3)})`);
    }
    // Floating ghosts cast an eerie-sweet moonlit cyan/violet aura.
    for (const v of visitors) {
      if ((v.active || v.fleeing) && v.kind === 'ghost' && v.scale > 0.2) {
        radialGlow(g, v.x, v.y - 75 * v.scale, 95 * v.scale,
          `rgba(165,230,255,${(0.28 * k * v.scale).toFixed(3)})`);
      }
    }
  });

  W.visitors = visitors;
  return visitors;
}

function radialGlow(g, x, y, r, color) {
  const grad = g.createRadialGradient(x, y, 4, x, y, r);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(255,180,70,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}

function playCreatureReaction(W, v) {
  const { audio } = W;
  W.say(SPOKEN_NAME[v.kind] || 'Boo');
  if (v.kind === 'ghost') {
    audio.whoosh();
    audio.shimmer(880);
  } else if (v.kind === 'zombie') {
    audio.boing();
    audio.whoosh();
  } else if (v.kind === 'skeleton') {
    audio.rattleShake();
    audio.whoosh();
  } else {
    audio.whoosh();
    audio.chirp();
  }
}

/* ==========================================================================
   1. COUNTRYSIDE ROAD & WINDMILL HILL TRAIL (outside layer)
   ========================================================================== */

function drawCountrysideRoad(g, W, hBlend) {
  const wm = W.windmillPos ? W.windmillPos() : { x: 2800, y: 274 };

  g.save();
  // Winding hillside trail climbing from the country lane up to the windmill!
  const trailG = g.createLinearGradient(wm.x - 240, 410, wm.x + 40, wm.y + 20);
  trailG.addColorStop(0, '#d8c9a8');
  trailG.addColorStop(1, '#c6b696');
  g.fillStyle = trailG;
  g.beginPath();
  g.moveTo(wm.x - 320, 412);
  g.bezierCurveTo(wm.x - 160, 382, wm.x - 70, 332, wm.x - 16, wm.y + 26);
  g.lineTo(wm.x + 28, wm.y + 28);
  g.bezierCurveTo(wm.x + 10, 344, wm.x - 60, 392, wm.x - 170, 420);
  g.closePath();
  g.fill();

  // Soft grassy verge bank along the top of the country lane.
  const bankG = g.createLinearGradient(0, 366, 0, 412);
  bankG.addColorStop(0, hBlend > 0.01 ? '#88a874' : '#9ec67f');
  bankG.addColorStop(1, '#7ea862');
  g.fillStyle = bankG;
  g.beginPath();
  g.moveTo(1650, 392);
  g.bezierCurveTo(2350, 366, 3300, 398, WORLD.W, 378);
  g.lineTo(WORLD.W, 424);
  g.lineTo(1650, 424);
  g.closePath();
  g.fill();

  // Main cobblestone & sandy country lane behind the picket fence.
  const roadG = g.createLinearGradient(0, 395, 0, 502);
  roadG.addColorStop(0, '#e3d5b8');
  roadG.addColorStop(0.55, '#d4c3a0');
  roadG.addColorStop(1, '#bda882');
  g.fillStyle = roadG;
  g.beginPath();
  g.moveTo(1650, 404);
  g.bezierCurveTo(2400, 382, 3450, 408, WORLD.W, 392);
  g.lineTo(WORLD.W, 504);
  g.lineTo(1650, 504);
  g.closePath();
  g.fill();

  // Upper stone-curb shadow line along the road edge.
  g.strokeStyle = 'rgba(107,84,58,0.28)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(1650, 404);
  g.bezierCurveTo(2400, 382, 3450, 408, WORLD.W, 392);
  g.stroke();

  // Rounded cobblestones visible along the road and between fence pickets.
  for (const c of COBBLES) {
    if (!W.onScreen(c.x, 120)) continue;
    g.fillStyle = c.tone;
    g.beginPath();
    g.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(95,76,54,0.22)';
    g.lineWidth = 1.4;
    g.stroke();
  }

  // Atmospheric Halloween twilight mist along the lane when switched on.
  if (hBlend > 0.01) {
    const mistG = g.createLinearGradient(0, 355, 0, 502);
    mistG.addColorStop(0, 'rgba(138,88,204,0)');
    mistG.addColorStop(0.5, `rgba(148,96,216,${(0.18 * hBlend).toFixed(3)})`);
    mistG.addColorStop(1, `rgba(255,158,68,${(0.16 * hBlend).toFixed(3)})`);
    g.fillStyle = mistG;
    g.fillRect(1650, 355, WORLD.W - 1650, 150);
  }
  g.restore();
}

/* ==========================================================================
   2. FENCE BUNTING & PORCH COBWEBS
   ========================================================================== */

function drawFenceBunting(g, W) {
  const posts = [1666, 1976, 2286, 2596, 2906, 3216, 3526];
  const flagColors = ['#ff7b24', '#6c349c', '#ffd54a', '#2d2538', '#9be564'];
  const quiet = quietMotion();

  for (let i = 0; i < posts.length - 1; i++) {
    const x0 = posts[i] + 14, x1 = posts[i + 1] + 14;
    if (!W.onScreen((x0 + x1) / 2, 220)) continue;
    const y0 = 414, sag = 26;

    // Hanging cord.
    g.strokeStyle = '#3d2b47';
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 1.8, x1, y0);
    g.stroke();

    // Triangular Halloween pennants + glowing fairy bulbs.
    for (let k = 1; k <= 6; k++) {
      const t = k / 7;
      const fx = lerp(x0, x1, t);
      const fy = y0 + sag * 3.6 * t * (1 - t);
      const sway = quiet ? 0 : Math.sin(W.t * 3.2 + i + k) * 2.5;
      g.fillStyle = flagColors[(i * 6 + k) % flagColors.length];
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(fx - 13, fy);
      g.lineTo(fx + 13, fy);
      g.lineTo(fx + sway, fy + 27);
      g.closePath();
      g.fill();
      g.stroke();

      // Little glowing fairy bulb between flags.
      const pulse = quiet ? 1 : 0.85 + Math.sin(W.t * 6 + k * 1.7 + i) * 0.15;
      g.fillStyle = k % 2 === 0 ? '#ffd54a' : '#ff8c24';
      g.beginPath();
      g.arc(fx, fy - 2, 4.2 * pulse, 0, Math.PI * 2);
      g.fill();
    }
  }
}

function drawPorchCobwebs(g, W, halloween) {
  if (!W.onScreen(1710, 220)) return;
  g.save();
  // Silky corner cobweb under the porch awning eave (x = 1660..1758, y = 205..285).
  g.strokeStyle = 'rgba(255,250,245,0.78)';
  g.lineWidth = 2;
  const ox = 1660, oy = 208;
  const spokes = [[1754, 232], [1742, 256], [1718, 276], [1686, 290], [1662, 296]];
  for (const [sx, sy] of spokes) {
    g.beginPath();
    g.moveTo(ox, oy);
    g.lineTo(sx, sy);
    g.stroke();
  }
  for (const r of [0.32, 0.58, 0.84]) {
    g.beginPath();
    for (let i = 0; i < spokes.length; i++) {
      const [sx, sy] = spokes[i];
      const px = lerp(ox, sx, r), py = lerp(oy, sy, r);
      if (i === 0) g.moveTo(px, py);
      else g.quadraticCurveTo(px - 4, py - 4, px, py);
    }
    g.stroke();
  }

  // Cute dangling spider on a silk thread at x = 1722.
  const sx = 1722;
  const sy = 252 + halloween.spiderY + (quietMotion() ? 0 : Math.sin(W.t * 2.8) * 6);
  g.strokeStyle = 'rgba(255,250,245,0.85)';
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(sx, 222);
  g.lineTo(sx, sy);
  g.stroke();

  g.translate(sx, sy);
  // 8 little curved legs.
  g.strokeStyle = '#2d2338';
  g.lineWidth = 2.4;
  g.lineCap = 'round';
  for (const side of [-1, 1]) {
    for (let l = -1; l <= 2; l++) {
      const ly = l * 3.2;
      g.beginPath();
      g.moveTo(side * 6, ly);
      g.quadraticCurveTo(side * 16, ly - 6, side * 20, ly + 4);
      g.stroke();
    }
  }
  // Fuzzy round body.
  g.fillStyle = '#362946';
  g.strokeStyle = '#1f162b';
  g.lineWidth = 2;
  g.beginPath();
  g.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // Big friendly eyes.
  for (const ex of [-4.2, 4.2]) {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(ex, -1, 3.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#23192d';
    g.beginPath(); g.arc(ex + 0.5, -1, 1.8, 0, Math.PI * 2); g.fill();
  }
  // Tiny happy smile.
  g.strokeStyle = '#ff9fb2';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(0, 3, 3.5, 0.2, Math.PI - 0.2);
  g.stroke();
  g.restore();
}

/* ==========================================================================
   3. INTERACTIVE HALLOWEEN FESTIVAL BANNER
   ========================================================================== */

function drawHalloweenBanner(g, W, halloween) {
  if (!W.onScreen(1855, 260)) return;
  const on = halloween.on;
  const b = halloween.blend;
  const quiet = quietMotion();
  const sway = Math.sin(halloween.wob * 18) * 0.035 * halloween.wob;

  g.save();
  g.translate(1855, 500);
  g.rotate(sway);

  // Ground shadows under the two archway posts.
  g.fillStyle = 'rgba(60,82,42,0.22)';
  g.beginPath();
  g.ellipse(-118, 4, 24, 7, 0, 0, Math.PI * 2);
  g.ellipse(118, 4, 24, 7, 0, 0, Math.PI * 2);
  g.fill();

  // Two carved timber & wrought-iron archway poles at x = -118 and x = +118.
  for (const side of [-1, 1]) {
    const px = side * 118;
    // Wooden post with bevel highlight.
    const postG = g.createLinearGradient(px - 10, 0, px + 10, 0);
    postG.addColorStop(0, '#6e472b');
    postG.addColorStop(0.45, '#96643e');
    postG.addColorStop(1, '#593820');
    g.fillStyle = postG;
    g.strokeStyle = INK;
    g.lineWidth = 2.8;
    g.beginPath();
    g.roundRect(px - 10, -308, 20, 310, 5);
    g.fill();
    g.stroke();

    // Decorative stone & timber base collar.
    g.fillStyle = '#d9c6ab';
    g.beginPath();
    g.roundRect(px - 15, -24, 30, 24, 5);
    g.fill();
    g.stroke();

    // Wrought-iron top finial & scrolled side lantern bracket.
    g.strokeStyle = '#352d42';
    g.lineWidth = 3.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(px, -308);
    g.lineTo(px, -326);
    g.moveTo(px + side * 10, -284);
    g.quadraticCurveTo(px + side * 34, -292, px + side * 32, -268);
    g.stroke();
    g.fillStyle = b > 0.3 ? '#ff9429' : '#cbb99d';
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(px, -332, 9, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // Little hanging lantern on the outer bracket.
    const lx = px + side * 32, ly = -258;
    g.fillStyle = '#352d42';
    g.beginPath();
    g.roundRect(lx - 9, ly - 10, 18, 22, 4);
    g.fill();
    g.stroke();
    g.fillStyle = b > 0.1 ? `rgba(255,216,92,${0.35 + 0.65 * b})` : '#dcd4c8';
    g.beginPath();
    g.roundRect(lx - 5.5, ly - 6, 11, 14, 2);
    g.fill();
  }

  // Hanging pennants underneath the main banner board.
  const penColorsOff = ['#cbbba4', '#b5a9ba', '#d9cbb4', '#9e95a6', '#cbbba4', '#b5a9ba', '#d9cbb4'];
  const penColorsOn = ['#ff7b24', '#7b3fe4', '#ffd54a', '#ff5964', '#9be564', '#7b3fe4', '#ff7b24'];
  for (let i = 0; i < 7; i++) {
    const fx = -96 + i * 32;
    const fy = -206;
    const wv = quiet ? 0 : Math.sin(W.t * 3.5 + i * 0.8) * 2 * b;
    g.fillStyle = b > 0.4 ? penColorsOn[i] : penColorsOff[i];
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(fx - 14, fy);
    g.lineTo(fx + 14, fy);
    g.lineTo(fx + wv, fy + 28);
    g.closePath();
    g.fill();
    g.stroke();
  }

  // Main arched festival banner board (x = -126..+126, y = -302..-202).
  g.save();
  // Drop shadow.
  g.fillStyle = 'rgba(42,26,56,0.22)';
  g.beginPath();
  g.roundRect(-128, -296, 256, 96, 22);
  g.fill();

  // Outer carved golden/wood frame.
  const frameG = g.createLinearGradient(0, -304, 0, -200);
  if (b > 0.25) {
    frameG.addColorStop(0, '#ffcf56');
    frameG.addColorStop(0.5, '#ff8c24');
    frameG.addColorStop(1, '#c9520c');
  } else {
    frameG.addColorStop(0, '#d8c3a5');
    frameG.addColorStop(1, '#a68b6b');
  }
  g.fillStyle = frameG;
  g.strokeStyle = INK;
  g.lineWidth = 3.2;
  g.beginPath();
  g.roundRect(-126, -302, 252, 96, 22);
  g.fill();
  g.stroke();

  // Inner velvet/parchment banner panel.
  const innerG = g.createLinearGradient(0, -294, 0, -210);
  if (b > 0.25) {
    innerG.addColorStop(0, '#3e1e68');
    innerG.addColorStop(0.6, '#271247');
    innerG.addColorStop(1, '#4b237a');
  } else {
    innerG.addColorStop(0, '#f5ebd9');
    innerG.addColorStop(1, '#dfd0b8');
  }
  g.fillStyle = innerG;
  g.strokeStyle = b > 0.25 ? '#ffd54a' : '#8c765c';
  g.lineWidth = 2.4;
  g.beginPath();
  g.roundRect(-116, -292, 232, 76, 16);
  g.fill();
  g.stroke();

  // Little crescent moon (left) and cute ghost/bat (right) inside the banner.
  g.fillStyle = b > 0.25 ? '#ffd54a' : '#b8a68e';
  g.beginPath();
  g.arc(-92, -254, 13, 0.4, Math.PI * 2 - 0.4);
  g.arc(-86, -257, 10, Math.PI * 2 - 0.4, 0.4, true);
  g.closePath();
  g.fill();

  // Mini ghost icon on the right side of the banner.
  g.fillStyle = b > 0.25 ? '#ffffff' : '#cfc2b0';
  g.beginPath();
  g.arc(92, -260, 10, Math.PI, 0);
  g.lineTo(102, -243);
  g.lineTo(97, -247);
  g.lineTo(92, -243);
  g.lineTo(87, -247);
  g.lineTo(82, -243);
  g.closePath();
  g.fill();
  g.fillStyle = '#2d1c3d';
  g.beginPath();
  g.arc(89, -260, 1.8, 0, Math.PI * 2);
  g.arc(95, -260, 1.8, 0, Math.PI * 2);
  g.fill();

  // Bold storybook "HALLOWEEN" title across the banner.
  g.font = '900 24px "Comic Sans MS", "Chalkboard SE", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 4.5;
  g.strokeStyle = b > 0.25 ? '#1b0b33' : '#6e5844';
  g.strokeText('HALLOWEEN', 0, -244);
  g.fillStyle = b > 0.25 ? '#ffd859' : '#856d56';
  g.fillText('HALLOWEEN', 0, -244);

  // Top centerpiece: 3D carved pumpkin crest & bat wings at (0, -308).
  for (const side of [-1, 1]) {
    g.fillStyle = b > 0.25 ? '#3a2057' : '#8c7b8f';
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(side * 22, -308);
    g.quadraticCurveTo(side * 48, -328, side * 64, -306);
    g.quadraticCurveTo(side * 50, -302, side * 44, -294);
    g.quadraticCurveTo(side * 32, -298, side * 22, -296);
    g.closePath();
    g.fill();
    g.stroke();
  }
  // Crest pumpkin body.
  const crestG = g.createRadialGradient(-6, -314, 4, 0, -308, 28);
  crestG.addColorStop(0, b > 0.2 ? '#ffb340' : '#d9a46c');
  crestG.addColorStop(1, b > 0.2 ? '#e0530c' : '#a87848');
  g.fillStyle = crestG;
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.beginPath();
  g.ellipse(0, -308, 26, 21, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // Stem.
  g.fillStyle = '#588233';
  g.beginPath();
  g.roundRect(-4, -334, 8, 9, 3);
  g.fill();
  g.stroke();
  // Crest pumpkin eyes & mouth (sleeping when off, glowing grin when on!).
  if (b > 0.25) {
    g.fillStyle = '#fff59e';
    g.beginPath();
    g.moveTo(-12, -311); g.lineTo(-7, -319); g.lineTo(-3, -311); g.closePath();
    g.moveTo(3, -311); g.lineTo(7, -319); g.lineTo(12, -311); g.closePath();
    g.fill();
    g.beginPath();
    g.arc(0, -305, 11, 0.15, Math.PI - 0.15);
    g.fill();
  } else {
    g.strokeStyle = '#594233';
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(-8, -312, 4.5, 0.2, Math.PI - 0.2);
    g.arc(8, -312, 4.5, 0.2, Math.PI - 0.2);
    g.moveTo(-6, -301); g.quadraticCurveTo(0, -298, 6, -301);
    g.stroke();
  }

  // Interactive pull-switch medallion hanging below the center of the banner.
  const pullBounce = Math.sin(halloween.pullWob * 16) * 8 * halloween.pullWob;
  const pulse = quiet ? 1 : 1 + Math.sin(W.t * 3.8) * (on ? 0.04 : 0.08);
  const py = -168 + pullBounce;
  g.strokeStyle = '#5c4332';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, -206);
  g.lineTo(0, py - 16);
  g.stroke();

  g.save();
  g.translate(0, py);
  g.scale(pulse, pulse);
  g.fillStyle = on ? '#ff8c24' : '#f5ebd9';
  g.strokeStyle = INK;
  g.lineWidth = 2.8;
  g.beginPath();
  g.roundRect(-42, -16, 84, 30, 15);
  g.fill();
  g.stroke();

  // Glowing indicator dot + ON/OFF label.
  g.fillStyle = on ? '#9be564' : '#c9b8a2';
  g.beginPath();
  g.arc(-22, -1, 7, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.8;
  g.stroke();

  g.font = '800 14px "Comic Sans MS", "Chalkboard SE", system-ui, sans-serif';
  g.fillStyle = on ? '#ffffff' : '#5c4938';
  g.fillText(on ? 'ON' : 'OFF', 10, 0);
  g.restore();

  g.restore();
  g.restore();
}

/* ==========================================================================
   4. CARVED 3D JACK-O'-LANTERN PUMPKINS
   ========================================================================== */

function drawJackOLantern(g, W, p, popScale) {
  if (!W.onScreen(p.x, 140)) return;
  const quiet = quietMotion();
  const s = p.s * popScale;
  const wob = Math.sin(p.wob * 18) * 0.12 * p.wob;
  const flick = quiet ? 1 : 0.92 + Math.sin(W.t * 10 + p.phase) * 0.08 + p.flare * 0.18;

  g.save();
  g.translate(p.x, p.y);
  g.scale(s * (1 + wob), s * (1 - wob * 0.8));

  // Ground shadow.
  if (!p.post) {
    g.fillStyle = 'rgba(55,74,38,0.25)';
    g.beginPath();
    g.ellipse(0, 4, p.trio ? 54 : 38, 10, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Optional side mini-gourd for the barrel trio.
  if (p.trio) {
    drawMiniPumpkin(g, -38, 4, 0.58, '#8ec256', '#5e8f2e');
    drawMiniPumpkin(g, 38, 5, 0.52, '#ffae42', '#d96b14');
  }

  // Twisted woody green stem & curly tendril.
  g.fillStyle = '#567d30';
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(-6, -48);
  g.quadraticCurveTo(-10, -65, 4, -68);
  g.quadraticCurveTo(12, -62, 7, -48);
  g.closePath();
  g.fill();
  g.stroke();

  g.strokeStyle = '#68963c';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(6, -56);
  g.bezierCurveTo(20, -64, 26, -48, 16, -44);
  g.stroke();

  // Multi-lobed 3D pumpkin ribs (back lobes -> middle lobes -> center lobe).
  const bodyG = g.createRadialGradient(-10, -34, 6, 0, -26, 44);
  bodyG.addColorStop(0, '#ffb84d');
  bodyG.addColorStop(0.55, '#f5761a');
  bodyG.addColorStop(1, '#ba3c04');

  for (const [ox, rx, ry] of [[-18, 20, 25], [18, 20, 25], [-9, 20, 27], [9, 20, 27], [0, 19, 28]]) {
    g.fillStyle = bodyG;
    g.strokeStyle = INK;
    g.lineWidth = 2.5;
    g.beginPath();
    g.ellipse(ox, -26, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  // Specular highlight on left shoulder.
  g.fillStyle = 'rgba(255,240,200,0.32)';
  g.beginPath();
  g.ellipse(-16, -36, 7, 12, -0.35, 0, Math.PI * 2);
  g.fill();

  // Carved glowing face!
  const flameG = g.createRadialGradient(0, -22, 2, 0, -24, 26);
  flameG.addColorStop(0, '#ffffff');
  flameG.addColorStop(0.35, `rgba(255,244,148,${Math.min(1, flick)})`);
  flameG.addColorStop(1, '#ff7b00');
  g.fillStyle = flameG;
  g.strokeStyle = '#7a2200';
  g.lineWidth = 1.8;

  if (p.face === 'star') {
    for (const ex of [-12, 12]) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 8 : 3.8;
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        g.lineTo(ex + Math.cos(a) * r, -31 + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.stroke();
    }
  } else if (p.face === 'cat') {
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(side * 4, -29);
      g.quadraticCurveTo(side * 12, -39, side * 19, -32);
      g.quadraticCurveTo(side * 12, -24, side * 4, -29);
      g.closePath();
      g.fill();
      g.stroke();
    }
  } else {
    // Classic triangular jack-o'-lantern eyes.
    for (const ex of [-12, 12]) {
      g.beginPath();
      g.moveTo(ex - 7, -27);
      g.lineTo(ex, -39);
      g.lineTo(ex + 7, -27);
      g.closePath();
      g.fill();
      g.stroke();
    }
  }

  // Cute triangle nose.
  g.beginPath();
  g.moveTo(-4, -21);
  g.lineTo(0, -26);
  g.lineTo(4, -21);
  g.closePath();
  g.fill();
  g.stroke();

  // Carved mouth.
  if (p.face === 'ooh') {
    g.beginPath();
    g.ellipse(0, -11, 9, 7.5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  } else {
    g.beginPath();
    g.moveTo(-19, -16);
    g.lineTo(-9, -13);
    g.lineTo(-9, -17);
    g.lineTo(-3, -16);
    g.lineTo(-3, -12);
    g.lineTo(4, -12);
    g.lineTo(4, -16);
    g.lineTo(10, -15);
    g.lineTo(10, -12);
    g.lineTo(19, -16);
    g.quadraticCurveTo(12, -4, 0, -4);
    g.quadraticCurveTo(-12, -4, -19, -16);
    g.closePath();
    g.fill();
    g.stroke();
  }

  // Optional crooked purple witch hat on the big porch pumpkin!
  if (p.hat) {
    g.save();
    g.translate(0, -48);
    g.rotate(-0.1);
    g.fillStyle = '#48286e';
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    g.beginPath();
    g.ellipse(0, 0, 34, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(-19, -2);
    g.quadraticCurveTo(-10, -34, 18, -42);
    g.quadraticCurveTo(8, -22, 19, -2);
    g.closePath();
    g.fill();
    g.stroke();
    // Orange hatband & gold buckle.
    g.fillStyle = '#ff8c24';
    g.beginPath();
    g.roundRect(-18, -8, 36, 6, 3);
    g.fill();
    g.strokeStyle = '#ffd54a';
    g.lineWidth = 2.4;
    g.strokeRect(-5, -10, 10, 9);
    g.restore();
  }

  g.restore();
}

function drawMiniPumpkin(g, x, y, s, colA, colB) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  const grad = g.createRadialGradient(-6, -24, 4, 0, -20, 30);
  grad.addColorStop(0, colA);
  grad.addColorStop(1, colB);
  g.fillStyle = grad;
  g.strokeStyle = INK;
  g.lineWidth = 3;
  for (const [ox, rx, ry] of [[-11, 15, 20], [11, 15, 20], [0, 15, 21]]) {
    g.beginPath();
    g.ellipse(ox, -20, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.fillStyle = '#567d30';
  g.beginPath();
  g.roundRect(-3, -47, 6, 8, 2);
  g.fill();
  g.stroke();
  g.restore();
}

/* ==========================================================================
   5. ADVANCED STORYBOOK CREATURE ARTWORK
      (Ghost, Zombie, Skeleton, Vampire)
   ========================================================================== */

function drawCreature(g, W, v) {
  if (!W.onScreen(v.x, 180)) return;
  const quiet = quietMotion();
  const moving = v.fleeing || v.target !== null;
  const stride = moving && !quiet ? Math.sin(v.phase) : 0;
  const bob = moving && !quiet ? Math.abs(stride) * (v.fleeing ? 8 : 4.5) : 0;
  const wob = Math.sin(v.wob * 20) * 0.1 * v.wob;

  g.save();
  g.translate(v.x, v.y - v.hopY - bob);
  g.scale(v.scale * (1 + wob), v.scale * (1 - wob * 0.7));

  // Ground shadow (softens when hopping or floating).
  const shadowScale = clamp(1 - v.hopY / 220, 0.35, 1);
  g.fillStyle = v.kind === 'ghost' ? 'rgba(90,130,170,0.18)' : 'rgba(48,62,38,0.24)';
  g.beginPath();
  g.ellipse(0, v.hopY + bob, 36 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
  g.fill();

  g.save();
  g.scale(v.face, 1);
  // Slight forward lean when sprinting away towards the windmill!
  if (v.fleeing && !quiet) g.rotate(0.11);

  switch (v.kind) {
    case 'ghost':
      drawGhost(g, W, v, stride, quiet);
      break;
    case 'zombie':
      drawZombie(g, W, v, stride, quiet);
      break;
    case 'skeleton':
      drawSkeleton(g, W, v, stride, quiet);
      break;
    case 'vampire':
      drawVampire(g, W, v, stride, quiet);
      break;
    default:
      break;
  }
  g.restore();

  // Fluttering mini-bats when a vampire is startled!
  if (v.bats.length) {
    for (const b of v.bats) {
      drawMiniBat(g, b.x, b.y, b.phase);
    }
  }

  g.restore();
}

/* ---- 5A. GHOST ---- */

function drawGhost(g, W, v, stride, quiet) {
  const hover = quiet ? 0 : Math.sin(v.phase * 0.85) * 9;
  g.save();
  g.translate(0, hover - 26);

  // Outer ectoplasm aura glow.
  const aura = g.createRadialGradient(0, -68, 12, 0, -68, 78);
  aura.addColorStop(0, 'rgba(195,242,255,0.38)');
  aura.addColorStop(1, 'rgba(195,242,255,0)');
  g.fillStyle = aura;
  g.beginPath();
  g.arc(0, -68, 78, 0, Math.PI * 2);
  g.fill();

  // Back sheet arm.
  const armWave = quiet ? 0 : Math.sin(v.phase * 1.1) * 10;
  g.fillStyle = '#d5e9fa';
  g.strokeStyle = INK;
  g.lineWidth = 2.8;
  g.beginPath();
  if (v.fleeing) {
    g.moveTo(18, -82);
    g.quadraticCurveTo(46, -112 + armWave, 36, -124);
    g.quadraticCurveTo(22, -118, 16, -96);
  } else {
    g.moveTo(20, -78);
    g.quadraticCurveTo(44, -84 + armWave, 42, -68 + armWave);
    g.quadraticCurveTo(32, -58 + armWave, 18, -64);
  }
  g.closePath();
  g.fill();
  g.stroke();

  // Billowing pearlescent sheet body with 5 animated bottom scallops.
  const sheetG = g.createLinearGradient(-20, -132, 24, 6);
  sheetG.addColorStop(0, '#ffffff');
  sheetG.addColorStop(0.6, v.variant === 1 ? '#eef5ff' : '#e6f6ff');
  sheetG.addColorStop(1, v.variant === 1 ? '#d2d9f8' : '#bfe2fa');
  g.fillStyle = sheetG;
  g.strokeStyle = INK;
  g.lineWidth = 3;

  g.beginPath();
  g.moveTo(-36, -78);
  g.bezierCurveTo(-36, -118, -20, -136, 0, -136);
  g.bezierCurveTo(20, -136, 36, -118, 36, -78);
  g.lineTo(42, -8);

  // 5 rippling scallops along the bottom hem from x = +42 to -42.
  for (let i = 0; i < 5; i++) {
    const x0 = 42 - i * 16.8;
    const x1 = 42 - (i + 1) * 16.8;
    const xm = (x0 + x1) / 2;
    const wv = quiet ? 0 : Math.sin(v.phase * 1.6 + i * 1.2) * 6;
    g.quadraticCurveTo(xm, 10 + wv, x1, -8 - wv * 0.4);
  }
  g.closePath();
  g.fill();
  g.stroke();

  // Soft cloth fold lines on the sheet.
  g.strokeStyle = 'rgba(130,165,205,0.45)';
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(-18, -46); g.quadraticCurveTo(-22, -20, -24, -8);
  g.moveTo(14, -52); g.quadraticCurveTo(18, -22, 20, -8);
  g.stroke();

  // Front sheet arm (holds a glowing lantern on variant 1!).
  g.fillStyle = '#ffffff';
  g.strokeStyle = INK;
  g.lineWidth = 2.8;
  g.beginPath();
  if (v.fleeing) {
    g.moveTo(-20, -82);
    g.quadraticCurveTo(-48, -110 - armWave, -38, -124);
    g.quadraticCurveTo(-22, -118, -16, -96);
  } else {
    g.moveTo(-22, -76);
    g.quadraticCurveTo(-46, -74 - armWave, -42, -58 - armWave);
    g.quadraticCurveTo(-30, -52 - armWave, -18, -62);
  }
  g.closePath();
  g.fill();
  g.stroke();

  // Variant 1: Swinging wrought-iron pumpkin lantern on a chain!
  if (v.variant === 1 && !v.fleeing) {
    const lx = 40, ly = -64 + armWave;
    g.strokeStyle = '#3a2d4c';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(lx, ly);
    g.lineTo(lx, ly + 14);
    g.stroke();
    g.fillStyle = '#ff9c2a';
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(lx, ly + 22, 9, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#fff5a8';
    g.beginPath();
    g.arc(lx, ly + 22, 4.5, 0, Math.PI * 2);
    g.fill();
  }

  // Rosy pink cheeks.
  g.fillStyle = 'rgba(255,152,180,0.55)';
  g.beginPath();
  g.ellipse(-14, -88, 6.5, 4, 0, 0, Math.PI * 2);
  g.ellipse(16, -88, 6.5, 4, 0, 0, Math.PI * 2);
  g.fill();

  // Glossy dark-plum eyes with starlight catchlights.
  for (const ex of [-9, 11]) {
    g.fillStyle = '#2d1e3e';
    g.beginPath();
    g.ellipse(ex, -100, v.fleeing ? 6.2 : 5.4, v.fleeing ? 8.2 : 7.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(ex + 1.8, -103, 2.2, 0, Math.PI * 2);
    g.arc(ex - 1.5, -97, 1.1, 0, Math.PI * 2);
    g.fill();
  }

  // Mouth: surprised "O" when fleeing, sweet open smile otherwise.
  g.fillStyle = '#3c2454';
  g.strokeStyle = INK;
  g.lineWidth = 2.2;
  if (v.fleeing) {
    g.beginPath();
    g.ellipse(2, -84, 6.5, 8.5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  } else {
    g.beginPath();
    g.arc(1, -86, 6.5, 0.1, Math.PI - 0.1);
    g.fill();
    g.stroke();
  }

  // Variant 0: Crooked purple storybook witch hat with gold buckle!
  if (v.variant === 0) {
    g.save();
    g.translate(-2, -132);
    g.rotate(-0.14);
    g.fillStyle = '#532b82';
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    g.beginPath();
    g.ellipse(0, 0, 34, 8.5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.moveTo(-18, -2);
    g.quadraticCurveTo(-8, -32, 16, -38);
    g.quadraticCurveTo(8, -18, 18, -2);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = '#ff8c24';
    g.beginPath();
    g.roundRect(-17, -8, 34, 6, 3);
    g.fill();
    g.strokeStyle = '#ffd54a';
    g.lineWidth = 2.2;
    g.strokeRect(-4.5, -9.5, 9, 8);
    g.restore();
  }

  g.restore();
}

/* ---- 5B. ZOMBIE ---- */

function drawZombie(g, W, v, stride, quiet) {
  const legSwing = stride * (v.fleeing ? 18 : 11);
  const armBob = quiet ? 0 : Math.sin(v.phase * 1.2) * (v.fleeing ? 16 : 6);

  // Back leg & scuffed boot.
  drawZombieLeg(g, -9, -52, -legSwing, '#525978', '#42352c');
  // Front leg & scuffed boot.
  drawZombieLeg(g, 9, -52, legSwing, '#61698c', '#4f3f34');

  // Back outstretched zombie arm (or raised high when fleeing!).
  drawZombieArm(g, 14, -92, v.fleeing ? -38 - armBob : -6 + armBob, '#8db57f', '#5c4b73');

  // Patched tweed/plum tailcoat & striped shirt torso.
  const coatG = g.createLinearGradient(-26, -104, 26, -46);
  coatG.addColorStop(0, v.variant === 1 ? '#7d624c' : '#735b8f');
  coatG.addColorStop(1, v.variant === 1 ? '#5c4635' : '#533f6b');
  g.fillStyle = coatG;
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(-25, -102, 50, 54, 13);
  g.fill();
  g.stroke();

  // Striped undershirt V-neck insert.
  g.fillStyle = '#e8dec8';
  g.beginPath();
  g.moveTo(-10, -101);
  g.lineTo(10, -101);
  g.lineTo(6, -50);
  g.lineTo(-6, -50);
  g.closePath();
  g.fill();
  g.strokeStyle = '#a85858';
  g.lineWidth = 2.4;
  for (const sy of [-90, -78, -66, -56]) {
    g.beginPath(); g.moveTo(-7, sy); g.lineTo(7, sy); g.stroke();
  }

  // Yellow stitched patch on jacket pocket.
  g.fillStyle = '#f5ca7b';
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(-20, -74, 15, 15, 3);
  g.fill();
  g.stroke();
  g.strokeStyle = '#6e4e2e';
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(-22, -70); g.lineTo(-17, -70);
  g.moveTo(-22, -63); g.lineTo(-17, -63);
  g.stroke();

  // Front zombie arm.
  drawZombieArm(g, -16, -90, v.fleeing ? -44 + armBob : 4 - armBob, '#a4cc95', v.variant === 1 ? '#7d624c' : '#735b8f');

  // Neck bolts (silver electrodes on the sides of the neck).
  g.fillStyle = '#9aa6b8';
  g.strokeStyle = INK;
  g.lineWidth = 2.2;
  for (const bx of [-31, 31]) {
    g.beginPath();
    g.roundRect(bx - 5, -108, 10, 7, 2);
    g.fill();
    g.stroke();
  }

  // Sculpted sage-green head with warm shading.
  const headG = g.createLinearGradient(0, -156, 0, -98);
  headG.addColorStop(0, '#b5da9c');
  headG.addColorStop(0.65, '#99c483');
  headG.addColorStop(1, '#7ea868');
  g.fillStyle = headG;
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(-29, -154, 58, 55, 19);
  g.fill();
  g.stroke();

  // Cute round ear on the side.
  g.fillStyle = '#99c483';
  g.beginPath();
  g.arc(-29, -126, 7.5, Math.PI * 0.5, Math.PI * 1.5);
  g.fill();
  g.stroke();

  // Tousled dark-moss hair tuft on top of head.
  g.fillStyle = '#43543a';
  g.beginPath();
  g.moveTo(-26, -144);
  g.quadraticCurveTo(-22, -162, -8, -156);
  g.quadraticCurveTo(-2, -166, 10, -156);
  g.quadraticCurveTo(22, -162, 26, -144);
  g.quadraticCurveTo(8, -148, -26, -144);
  g.closePath();
  g.fill();
  g.stroke();

  // Neat forehead stitch line.
  g.strokeStyle = '#5c4352';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-18, -141);
  g.quadraticCurveTo(-6, -138, 4, -143);
  g.moveTo(-14, -145); g.lineTo(-12, -136);
  g.moveTo(-7, -144); g.lineTo(-5, -135);
  g.moveTo(0, -146); g.lineTo(1, -137);
  g.stroke();

  // Rosy-mint cheeks.
  g.fillStyle = 'rgba(235,140,160,0.38)';
  g.beginPath();
  g.ellipse(-15, -115, 6, 3.8, 0, 0, Math.PI * 2);
  g.ellipse(17, -115, 6, 3.8, 0, 0, Math.PI * 2);
  g.fill();

  // Expressive goofy-sweet eyes (one big, one slightly smaller).
  for (const [ex, r] of [[-9, 7.2], [12, 6.0]]) {
    g.fillStyle = '#fffef5';
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(ex, -127, v.fleeing ? r + 1.2 : r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#2d2438';
    g.beginPath();
    g.arc(ex + 1.4, -127, 3.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(ex + 2.4, -128.8, 1.3, 0, Math.PI * 2);
    g.fill();
  }

  // Mouth: surprised "O" when fleeing, goofy two-tooth smile otherwise.
  if (v.fleeing) {
    g.fillStyle = '#47283c';
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(2, -109, 6.5, 7.5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  } else {
    g.fillStyle = '#fff9e6';
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.beginPath();
    g.roundRect(-5, -112, 6, 6, 1.5);
    g.roundRect(4, -111, 5.5, 5.5, 1.5);
    g.fill();
    g.stroke();
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-11, -113);
    g.quadraticCurveTo(1, -105, 13, -113);
    g.stroke();
  }
}

function drawZombieLeg(g, x0, y0, dx, pantCol, bootCol) {
  g.strokeStyle = INK;
  g.lineWidth = 17;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x0 + dx, -9);
  g.stroke();

  g.strokeStyle = pantCol;
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x0 + dx, -9);
  g.stroke();

  // Chunky rounded boot.
  g.fillStyle = bootCol;
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.beginPath();
  g.ellipse(x0 + dx + 4, -5, 11, 6.5, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
}

function drawZombieArm(g, x0, y0, liftY, skinCol, sleeveCol) {
  const x1 = 36, y1 = y0 + liftY;
  g.strokeStyle = INK;
  g.lineWidth = 14;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();

  g.strokeStyle = sleeveCol;
  g.lineWidth = 9.5;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo((x0 + x1) * 0.55, (y0 + y1) * 0.55);
  g.stroke();

  g.fillStyle = skinCol;
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  g.beginPath();
  g.arc(x1 + 2, y1, 6.5, 0, Math.PI * 2);
  g.fill();
  g.stroke();
}

/* ---- 5C. SKELETON ---- */

function drawSkeleton(g, W, v, stride, quiet) {
  const legSwing = stride * (v.fleeing ? 19 : 11);
  const armWave = quiet ? 0 : Math.sin(v.phase * 1.15) * (v.fleeing ? 18 : 8);

  // Jointed leg bones (femur + tibia + rounded foot bone).
  for (const [lx, dx] of [[-10, -legSwing], [10, legSwing]]) {
    const kx = lx + dx * 0.55, ky = -28;
    const fx = lx + dx, fy = -5;
    drawBoneSegment(g, lx, -50, kx, ky, 7.5);
    drawBoneSegment(g, kx, ky, fx, fy, 6.5);
    g.fillStyle = '#fff7e2';
    g.strokeStyle = INK;
    g.lineWidth = 2.4;
    g.beginPath();
    g.ellipse(fx + 5, fy, 9.5, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  // Back arm bone.
  if (v.fleeing) {
    drawBoneSegment(g, 18, -92, 34, -118 + armWave, 6.5);
    drawBoneSegment(g, 34, -118 + armWave, 42, -138 + armWave, 5.8);
  } else {
    drawBoneSegment(g, 18, -92, 32, -74 + armWave * 0.5, 6.5);
    drawBoneSegment(g, 32, -74 + armWave * 0.5, 38, -56 + armWave, 5.8);
  }

  // Spine & sculpted pelvis.
  drawBoneSegment(g, 0, -104, 0, -50, 8.5);
  g.fillStyle = '#f5e8cc';
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(-18, -56);
  g.quadraticCurveTo(0, -44, 18, -56);
  g.quadraticCurveTo(15, -46, 0, -47);
  g.quadraticCurveTo(-15, -46, -18, -56);
  g.closePath();
  g.fill();
  g.stroke();

  // Sculpted ribcage (4 curved ivory ribs with sternum highlight).
  for (const [ry, rw] of [[-93, 21], [-83, 23], [-73, 20], [-64, 15]]) {
    g.strokeStyle = INK;
    g.lineWidth = 8.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-rw, ry - 2);
    g.quadraticCurveTo(0, ry + 7, rw, ry - 2);
    g.stroke();
    g.strokeStyle = '#fff9e8';
    g.lineWidth = 4.5;
    g.beginPath();
    g.moveTo(-rw, ry - 2);
    g.quadraticCurveTo(0, ry + 7, rw, ry - 2);
    g.stroke();
  }

  // Front arm bone.
  if (v.fleeing) {
    drawBoneSegment(g, -18, -92, -34, -120 - armWave, 6.5);
    drawBoneSegment(g, -34, -120 - armWave, -40, -140 - armWave, 5.8);
  } else {
    drawBoneSegment(g, -18, -92, -32, -72 - armWave * 0.5, 6.5);
    drawBoneSegment(g, -32, -72 - armWave * 0.5, -26, -54 - armWave, 5.8);
  }

  // Dapper bow tie (crimson on variant 0, royal purple on variant 1).
  g.fillStyle = v.variant === 1 ? '#8c4be0' : '#e64958';
  g.strokeStyle = INK;
  g.lineWidth = 2.2;
  g.beginPath();
  g.moveTo(0, -100); g.lineTo(-14, -107); g.lineTo(-14, -93); g.closePath();
  g.moveTo(0, -100); g.lineTo(14, -107); g.lineTo(14, -93); g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#ffd54a';
  g.beginPath();
  g.arc(0, -100, 4, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Articulated lower jaw (drops slightly when startled/fleeing!).
  const jawDrop = v.fleeing ? 6 : 0;
  g.fillStyle = '#f5e9ce';
  g.strokeStyle = INK;
  g.lineWidth = 2.8;
  g.beginPath();
  g.roundRect(-18, -118 + jawDrop, 36, 18, 8);
  g.fill();
  g.stroke();

  // Sculpted ivory cranium with cheekbones.
  const skullG = g.createRadialGradient(-8, -142, 6, 0, -132, 34);
  skullG.addColorStop(0, '#ffffff');
  skullG.addColorStop(0.7, '#fff6df');
  skullG.addColorStop(1, '#e3d2b2');
  g.fillStyle = skullG;
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, -134, 27, Math.PI * 0.85, Math.PI * 2.15);
  g.quadraticCurveTo(28, -115, 18, -112);
  g.lineTo(-18, -112);
  g.quadraticCurveTo(-28, -115, -24, -122);
  g.closePath();
  g.fill();
  g.stroke();

  // Rosy cheekbone blush.
  g.fillStyle = 'rgba(255,155,175,0.38)';
  g.beginPath();
  g.ellipse(-16, -120, 5.5, 3.5, 0, 0, Math.PI * 2);
  g.ellipse(17, -120, 5.5, 3.5, 0, 0, Math.PI * 2);
  g.fill();

  // Dark eye sockets with cheerful glowing pinprick pupils.
  for (const ex of [-9, 11]) {
    g.fillStyle = '#322940';
    g.beginPath();
    g.ellipse(ex, -131, v.fleeing ? 7.2 : 6.4, v.fleeing ? 8.2 : 7.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff5b8';
    g.beginPath();
    g.arc(ex + 1, -131, 2.4, 0, Math.PI * 2);
    g.fill();
  }

  // Upside-down heart nasal cavity.
  g.fillStyle = '#322940';
  g.beginPath();
  g.moveTo(1, -124);
  g.lineTo(-3.5, -118);
  g.lineTo(5.5, -118);
  g.closePath();
  g.fill();

  // Cheerful toothy grin lines.
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(-12, -111 + jawDrop * 0.5);
  g.quadraticCurveTo(1, -106 + jawDrop * 0.5, 13, -111 + jawDrop * 0.5);
  for (const tx of [-6, 0, 6]) {
    g.moveTo(tx, -113 + jawDrop * 0.3);
    g.lineTo(tx, -106 + jawDrop * 0.6);
  }
  g.stroke();

  // Variant 0: Jaunty silk top hat with crimson ribbon band!
  if (v.variant === 0) {
    g.save();
    g.translate(-2, -157);
    g.rotate(-0.08);
    g.fillStyle = '#322840';
    g.strokeStyle = INK;
    g.lineWidth = 2.6;
    g.beginPath();
    g.ellipse(0, 0, 29, 7, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.beginPath();
    g.roundRect(-17, -28, 34, 27, 4);
    g.fill();
    g.stroke();
    g.fillStyle = '#e64958';
    g.beginPath();
    g.roundRect(-17, -8, 34, 6, 2);
    g.fill();
    g.restore();
  }
}

function drawBoneSegment(g, x0, y0, x1, y1, w) {
  g.strokeStyle = INK;
  g.lineWidth = w + 4.2;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();

  g.strokeStyle = '#fff7e2';
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}

/* ---- 5D. VAMPIRE ---- */

function drawVampire(g, W, v, stride, quiet) {
  const legSwing = stride * (v.fleeing ? 18 : 10);
  const capeWave = quiet ? 0 : Math.sin(v.phase * 1.3) * (v.fleeing ? 18 : 8);

  // High-collared billowing vampire cloak (behind body).
  g.save();
  // Outer midnight-indigo cape.
  const capeFlare = v.fleeing ? -34 - Math.abs(capeWave) : -14 + capeWave * 0.5;
  g.fillStyle = '#251e38';
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  // Dramatic high bat-wing collar behind the head.
  g.moveTo(-26, -98);
  g.lineTo(-38, -138);
  g.quadraticCurveTo(0, -126, 36, -136);
  g.lineTo(24, -98);
  // Flowing cape sides down to scalloped bat-hem.
  g.quadraticCurveTo(38, -56, 30, -16);
  g.quadraticCurveTo(10, -26, -6, -14);
  g.quadraticCurveTo(-24, -26, -38 + capeFlare, -16);
  g.quadraticCurveTo(-36 + capeFlare * 0.6, -58, -26, -98);
  g.closePath();
  g.fill();
  g.stroke();

  // Rich crimson-velvet inner cape lining.
  const liningG = g.createLinearGradient(0, -134, 0, -20);
  liningG.addColorStop(0, '#e03a52');
  liningG.addColorStop(1, '#941c30');
  g.fillStyle = liningG;
  g.beginPath();
  g.moveTo(-22, -98);
  g.lineTo(-32, -132);
  g.quadraticCurveTo(0, -122, 30, -130);
  g.lineTo(20, -98);
  g.quadraticCurveTo(30, -58, 24, -22);
  g.quadraticCurveTo(0, -32, -30 + capeFlare * 0.7, -22);
  g.closePath();
  g.fill();
  g.restore();

  // Tailored dark trousers & polished shoes.
  drawZombieLeg(g, -9, -50, -legSwing, '#2c253d', '#1c1626');
  drawZombieLeg(g, 9, -50, legSwing, '#352d4a', '#1c1626');

  // Aristocratic burgundy waistcoat & crisp white ruffled cravat.
  const vestG = g.createLinearGradient(0, -100, 0, -48);
  vestG.addColorStop(0, '#a82840');
  vestG.addColorStop(1, '#6e1628');
  g.fillStyle = vestG;
  g.strokeStyle = INK;
  g.lineWidth = 2.8;
  g.beginPath();
  g.roundRect(-22, -98, 44, 50, 11);
  g.fill();
  g.stroke();

  // White shirt V & ruffled cravat.
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.moveTo(-11, -98);
  g.lineTo(11, -98);
  g.lineTo(0, -72);
  g.closePath();
  g.fill();
  g.stroke();

  // Golden ribbon medallion on chest.
  g.fillStyle = '#ffd54a';
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, -82, 6, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // Two gold waistcoat buttons.
  for (const by of [-68, -58]) {
    g.beginPath();
    g.arc(0, by, 2.5, 0, Math.PI * 2);
    g.fill();
  }

  // Expressive arms with cape sleeves.
  drawZombieArm(g, -18, -88, v.fleeing ? -38 - capeWave : -4 + capeWave * 0.4, '#f0e8fa', '#251e38');
  drawZombieArm(g, 18, -88, v.fleeing ? -34 + capeWave : 2 - capeWave * 0.4, '#f0e8fa', '#251e38');

  // Pointed bat/elfin ears on the sides of the head.
  g.fillStyle = '#ede3f7';
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(side * 24, -132);
    g.lineTo(side * 37, -138);
    g.quadraticCurveTo(side * 34, -120, side * 24, -118);
    g.closePath();
    g.fill();
    g.stroke();
  }

  // Pale porcelain-lavender head.
  const faceG = g.createLinearGradient(0, -154, 0, -98);
  faceG.addColorStop(0, '#f7f2fc');
  faceG.addColorStop(1, '#dfd3f0');
  g.fillStyle = faceG;
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(-27, -152, 54, 53, 20);
  g.fill();
  g.stroke();

  // Sleek jet-black hair with classic widow's peak!
  g.fillStyle = '#211a30';
  g.beginPath();
  g.moveTo(-27, -134);
  g.bezierCurveTo(-28, -158, 28, -158, 27, -134);
  g.quadraticCurveTo(14, -145, 1, -135);
  g.quadraticCurveTo(-12, -145, -27, -134);
  g.closePath();
  g.fill();
  g.stroke();

  // Rosy lavender-pink cheeks.
  g.fillStyle = 'rgba(245,145,175,0.42)';
  g.beginPath();
  g.ellipse(-15, -115, 5.8, 3.6, 0, 0, Math.PI * 2);
  g.ellipse(16, -115, 5.8, 3.6, 0, 0, Math.PI * 2);
  g.fill();

  // Warm ruby-amber eyes with white catchlights & arched eyebrows.
  for (const ex of [-9, 11]) {
    g.fillStyle = '#3b1d4a';
    g.beginPath();
    g.ellipse(ex, -125, v.fleeing ? 5.8 : 5.0, v.fleeing ? 7.2 : 6.2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ff6b8b';
    g.beginPath();
    g.arc(ex + 0.8, -124, 2.4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(ex + 1.8, -127, 1.8, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#211a30';
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(-15, -133); g.lineTo(-4, -131);
  g.moveTo(16, -133); g.lineTo(5, -131);
  g.stroke();

  // Cheeky smile with two gleaming white fangs!
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(-11, -112);
  g.quadraticCurveTo(1, v.fleeing ? -102 : -104, 13, -112);
  g.stroke();

  g.fillStyle = '#ffffff';
  g.strokeStyle = INK;
  g.lineWidth = 1.6;
  for (const fx of [-6, 7]) {
    g.beginPath();
    g.moveTo(fx - 2.6, -111);
    g.lineTo(fx, -104);
    g.lineTo(fx + 2.6, -111);
    g.closePath();
    g.fill();
    g.stroke();
  }
}

function drawMiniBat(g, x, y, phase) {
  const flap = Math.sin(phase) * 9;
  g.save();
  g.translate(x, y);
  g.fillStyle = '#2d2040';
  g.strokeStyle = '#2d2040';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(0, 0, 4.5, 0, Math.PI * 2);
  g.fill();
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(0, -1);
    g.quadraticCurveTo(side * 10, -10 + flap, side * 16, -2 + flap);
    g.quadraticCurveTo(side * 8, 2, 0, 2);
    g.closePath();
    g.fill();
  }
  g.restore();
}
