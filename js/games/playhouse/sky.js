// Play House sky and weather.
//
// Day and night belong to the sun and moon themselves: drag the sun down
// behind the hills (or just tap it) and night falls; tap or drag the moon
// down and the sun comes back up with a rooster. Being far away, they stay
// put on the screen while the garden pans beneath them, so they can be
// reached from anywhere outside. The weather belongs to one friendly cloud:
// tap it for rain (over the whole garden, filling the puddles), again for
// snow (the garden turns white and a snowman can be built), again for a
// rainbow. Left behind, the cloud drifts over to wherever the child is.

import { WORLD, PLACES, TIMING, clampToFloor, depthAt } from './layout.js';
import { ROOSTER } from './assets.js';
import { quietMotion } from '../../engine/calm.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const ease = t => t * t * (3 - 2 * t);

export function createSky(W) {
  const { audio, fx } = W;
  const sky = {
    weather: 'clear',        // clear | rain | snow
    snow: 0,                 // 0..1 how white the garden is
    rainbow: 0,              // 0..1
    rainbowUntil: 0,
    rainbowX: 2560,
    gloom: 0,                // 0..1 how grey the sky is while it rains
    veil: 0,                 // 0..1 how far the sun is behind a cloud (rain, snow)
    dayTarget: 0,
    porchOn: true,
  };
  W.sky = sky;

  /* ---------------- day and night ---------------- */

  let wasNight = false;
  // How high the sun and moon ride: their usual height, or higher up the
  // extra sky a tall (portrait) screen shows, clear of the edge arrows.
  const sunTop = () => Math.min(PLACES.sun.y, W.cam.top + W.cam.viewH * 0.24);
  const moonTop = () => sunTop() + 30;
  const SET_Y = 560;               // below the hills
  // The sun and moon keep their place on the screen (a fraction `f` of the
  // way across), but never further left than the garden sky: hidden behind
  // the house they would catch taps meant for the wall.
  const SKY_X0 = 1900;
  const anchor = f => Math.max(SKY_X0, W.cam.x + W.cam.viewW * f);
  // Their usual places are 0.72 (sun) and 0.3 (moon) of the way across; if
  // the apple tree's canopy would hide one there, it glides over to the
  // nearest clear spot, and back again once the tree has passed.
  const TREE_SPAN = [PLACES.tree.x - 460, PLACES.tree.x + 430];
  const clearOfTree = x => x < TREE_SPAN[0] || x > TREE_SPAN[1];
  const place = {
    sun: { spots: [0.72, 0.88, 0.56, 0.4], f: 0.72, to: 0.72 },
    moon: { spots: [0.3, 0.14, 0.46, 0.62], f: 0.3, to: 0.3 },
  };
  function placeBodies(dt) {
    for (const p of Object.values(place)) {
      if (clearOfTree(anchor(p.spots[0]))) p.to = p.spots[0];
      else if (!clearOfTree(anchor(p.to))) p.to = p.spots.find(f => clearOfTree(anchor(f))) ?? p.spots[0];
      p.f += (p.to - p.f) * Math.min(1, dt * 5);
    }
  }
  const holdX = x => {
    const lo = Math.max(1750, W.cam.x + 60);
    return clamp(x, lo, Math.max(lo, W.cam.x + W.cam.viewW - 60));
  };

  function setDay(night, { quiet = false } = {}) {
    sky.dayTarget = night ? 1 : 0;
    if (!quiet) audio.chime();
  }
  sky.setDay = setDay;
  sky.isNight = () => W.dayT > 0.5;

  function updateDay(dt) {
    if (sun.held || moon.held) return;
    const rate = dt * 1000 / TIMING.dayNightMs;
    W.dayT += clamp(sky.dayTarget - W.dayT, -rate, rate);
    const night = W.dayT > 0.5;
    if (night !== wasNight) {
      wasNight = night;
      W.emit(night ? 'night' : 'morning');
      if (night) W.say('Night');
      else {
        W.say('Morning');
        if (ROOSTER) setTimeout(() => { if (W.isAlive()) playAnimal(ROOSTER); }, 350);
      }
    }
  }

  function playAnimal(a) {
    audio.load(a.id, a.sound).then(() => { if (W.isAlive()) audio.play(a.id, { maxDuration: 3 }); });
  }
  sky.playAnimal = playAnimal;

  // A small puffy cloud that rises over the lower half of the sun in rain or
  // snow, so the weather reads as weather and the sun is plainly still there,
  // its eyes peeking out over the top, ready to come back.
  const PUFFS = [[-92, 80, 40], [-44, 62, 52], [16, 58, 56], [74, 68, 48], [112, 88, 34], [-120, 98, 28]];
  function drawVeil(g, x, y, veil) {
    const rise = (1 - veil) * 70;
    const rain = sky.weather === 'rain' || (sky.weather === 'clear' && sky.gloom > 0.3);
    g.save();
    g.translate(x, y + rise);
    g.globalAlpha = veil;
    g.beginPath();
    for (const [px, py, r] of PUFFS) { g.moveTo(px + r, py); g.arc(px, py, r, 0, Math.PI * 2); }
    g.rect(-120, 88, 232, 34);
    g.fillStyle = rain ? '#e1e6ef' : '#f7f9fd';
    g.fill();
    g.strokeStyle = rain ? 'rgba(96,108,142,0.55)' : 'rgba(120,136,176,0.45)';
    g.lineWidth = 4;
    g.stroke();
    // Fill again without the inner outlines, so only the outer edge shows.
    g.fill();
    g.restore();
  }

  const sun = {
    layer: 'sky', held: false, wob: 0,
    pos() {
      const t = ease(W.dayT);
      return { x: anchor(place.sun.f) + t * Math.min(260, W.cam.viewW * 0.15), y: sunTop() + t * (SET_Y - sunTop()) };
    },
    draw(g) {
      if (W.dayT > 0.98) return;
      const { x, y } = this.held ? this.hold : this.pos();
      const sprite = W.sprites.sun;
      const squash = 1 + Math.sin(this.wob * 18) * 0.08 * Math.max(0, this.wob);
      const veil = ease(sky.veil);
      g.save();
      g.translate(x, y);
      g.globalAlpha = 1 - sky.gloom * 0.35 - veil * 0.15;     // paler behind the rain
      // Soft glow, then slowly turning rays (drawn in behind a cloud), then
      // the face.
      const glow = g.createRadialGradient(0, 0, 40, 0, 0, 170);
      glow.addColorStop(0, `rgba(255,240,170,${0.55 * (1 - veil * 0.7)})`);
      glow.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(0, 0, 170, 0, Math.PI * 2); g.fill();
      g.rotate(W.t * 0.25);
      g.fillStyle = '#ffd24d';
      g.strokeStyle = 'rgba(214,140,40,0.55)';
      g.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        g.rotate(Math.PI / 6);
        const len = 74 + ((i % 2 ? 98 : 110) - 74) * (1 - veil * 0.75);
        g.beginPath();
        g.moveTo(-11, -74); g.lineTo(0, -len); g.lineTo(11, -74); g.closePath();
        g.fill(); g.stroke();
      }
      g.rotate(-W.t * 0.25 - Math.PI * 2);
      g.scale(squash, 2 - squash);
      if (sprite) W.blit(g, sprite);
      g.restore();
      if (veil > 0.01) drawVeil(g, x, y, veil);
    },
    hit(x, y) {
      if (W.dayT > 0.85) return false;
      const p = this.pos();
      return Math.hypot(x - p.x, y - p.y) < 120;
    },
    update(dt) { this.wob = Math.max(0, this.wob - dt * 1.6); },
    draggable: true,
    press() { this.wob = 1; audio.shimmer(880); },
    tap() { setDay(true); fx.sparkle(this.pos().x, this.pos().y, 12, 160); },
    grab(x, y) { this.held = true; this.hold = { x, y }; },
    drag(x, y) {
      this.hold = { x: holdX(x), y: clamp(y, Math.min(60, sunTop()), SET_Y + 40) };
      W.dayT = clamp((this.hold.y - sunTop()) / (SET_Y - sunTop()), 0, 1) * 0.9;
    },
    drop() {
      this.held = false;
      setDay(W.dayT > 0.3, { quiet: true });
    },
  };

  const moon = {
    layer: 'sky', held: false, wob: 0,
    pos() {
      const t = ease(clamp((W.dayT - 0.35) / 0.65, 0, 1));
      return { x: anchor(place.moon.f), y: SET_Y - t * (SET_Y - moonTop()) };
    },
    draw(g) {
      if (W.dayT < 0.36) return;
      const { x, y } = this.held ? this.hold : this.pos();
      const glow = g.createRadialGradient(x, y, 40, x, y, 220);
      glow.addColorStop(0, 'rgba(255,248,210,0.35)');
      glow.addColorStop(1, 'rgba(255,248,210,0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(x, y, 220, 0, Math.PI * 2); g.fill();
      const squash = 1 + Math.sin(this.wob * 18) * 0.08 * this.wob;
      g.save();
      g.translate(x, y);
      g.rotate(Math.sin(W.t * 0.8) * 0.06);
      g.scale(squash, 2 - squash);
      if (W.sprites.moon) W.blit(g, W.sprites.moon);
      g.restore();
    },
    hit(x, y) {
      if (W.dayT < 0.6) return false;
      const p = this.pos();
      return Math.hypot(x - p.x, y - p.y) < 110;
    },
    update(dt) { this.wob = Math.max(0, this.wob - dt * 1.6); },
    draggable: true,
    press() { this.wob = 1; audio.shimmer(660); },
    tap() { setDay(false); fx.sparkle(this.pos().x, this.pos().y, 12, 160, ['#fff6c9', '#ffffff', '#d8e4ff']); },
    grab(x, y) { this.held = true; this.hold = { x, y }; },
    drag(x, y) {
      this.hold = { x: holdX(x), y: clamp(y, Math.min(60, moonTop()), SET_Y + 40) };
      W.dayT = 1 - clamp((this.hold.y - moonTop()) / (SET_Y - moonTop()), 0, 1) * 0.9;
    },
    drop() {
      this.held = false;
      setDay(W.dayT > 0.7, { quiet: true });
    },
  };

  /* ---------------- stars, rainbow, drifting clouds ---------------- */

  const stars = Array.from({ length: 70 }, () => ({
    x: -100 + Math.random() * (WORLD.W + 200), y: -820 + Math.random() * 1150,
    r: 2 + Math.random() * 4, tw: Math.random() * 6,
  }));
  const puffs = Array.from({ length: 5 }, (_, i) => ({
    x: 1700 + i * 420 + Math.random() * 200, y: -80 + Math.random() * 260, s: 0.6 + Math.random() * 0.6,
    v: 6 + Math.random() * 10,
  }));

  const backdrop = {
    layer: 'sky',
    draw(g) {
      const n = W.dayT;
      if (n > 0.3) {
        const a = Math.min(1, (n - 0.3) / 0.5);
        g.fillStyle = '#fffbe6';
        for (const s of stars) {
          g.globalAlpha = a * (0.55 + 0.45 * Math.sin(W.t * 2 + s.tw));
          g.beginPath();
          g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      if (sky.rainbow > 0.01) drawRainbow(g, sky.rainbow);
      for (const p of puffs) drawPuff(g, p, n);
    },
    update(dt) {
      for (const p of puffs) {
        p.x += p.v * dt * (sky.weather === 'clear' ? 1 : 1.6);
        if (p.x > WORLD.W + 300) p.x = -300;
      }
    },
  };

  function drawPuff(g, p, n) {
    const s = 60 * p.s;
    g.save();
    g.globalAlpha = 0.85 - n * 0.45;
    // White on a fine day, grey in the rain, blue-grey after dark.
    const grey = Math.round(255 - sky.gloom * 52);
    g.fillStyle = n > 0.5 ? '#8e9ad0' : `rgb(${grey},${grey + Math.round(sky.gloom * 8)},${Math.min(255, grey + Math.round(sky.gloom * 22))})`;
    g.beginPath();
    g.arc(p.x, p.y, s, 0, Math.PI * 2);
    g.arc(p.x + s * 0.95, p.y + s * 0.2, s * 0.75, 0, Math.PI * 2);
    g.arc(p.x - s * 0.95, p.y + s * 0.25, s * 0.65, 0, Math.PI * 2);
    g.arc(p.x + s * 0.2, p.y + s * 0.45, s * 0.8, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawRainbow(g, a) {
    const cx = sky.rainbowX, cy = 640;
    const bands = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'];
    g.save();
    g.globalAlpha = a * 0.8;
    g.lineWidth = 30;
    bands.forEach((c, i) => {
      g.strokeStyle = c;
      g.beginPath();
      g.arc(cx, cy, 620 - i * 28, Math.PI * 1.03, Math.PI * 1.97);
      g.stroke();
    });
    g.restore();
  }

  /* ---------------- the weather cloud ---------------- */

  const cloud = {
    layer: 'sky', x: PLACES.cloud.x, y: PLACES.cloud.y, held: false, wob: 0, lean: 0, droppedAt: -99,
    draw(g) {
      const name = sky.weather === 'rain' ? 'cloudRain' : sky.weather === 'snow' ? 'cloudSnow' : 'cloud';
      const sprite = W.sprites[name];
      if (!sprite) return;
      const bob = Math.sin(W.t * 1.3) * 8;
      const squash = 1 + Math.sin(this.wob * 20) * 0.1 * this.wob;
      g.save();
      g.translate(this.x, this.y + bob);
      g.rotate(this.lean);
      g.scale(squash, 2 - squash);
      // The sky is not night-tinted like the world is, so the cloud is drawn
      // from a darkened copy of itself after sunset.
      W.blit(g, W.dayT > 0.02 ? nightCopy(sprite, W.dayT) : sprite);
      g.restore();
    },
    hit(x, y) { return Math.abs(x - this.x) < 200 && Math.abs(y - this.y) < 120; },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.5);
      this.lean *= Math.exp(-5 * dt);
      // Asked over somewhere (see followView), it floats there, never so fast
      // that it seems to jump.
      if (this.glideTo != null && !this.held) {
        const dx = clamp(this.glideTo, 1840, WORLD.W - 120) - this.x;
        this.x += clamp(dx * Math.min(1, dt * 1.8), -900 * dt, 900 * dt);
        this.lean = clamp(dx * 0.0015, -0.2, 0.2);
        if (Math.abs(dx) < 4) this.glideTo = null;
      }
    },
    draggable: true,
    press() { this.wob = 1; audio.pop(); },
    tap() { cycleWeather(); },
    grab() { this.held = true; this.glideTo = null; },
    drag(x, y) {
      // Anywhere over the garden, the vegetable patch included.
      const nx = clamp(x, 1840, WORLD.W - 120);
      this.lean = clamp((nx - this.x) * 0.01, -0.25, 0.25);
      this.x = nx;
      this.y = clamp(y, 40, 300);
    },
    drop() { this.held = false; this.droppedAt = W.t; },
    hint() { this.wob = 0.8; },
  };
  sky.cloud = cloud;

  // A darkened copy of a sprite, rebuilt only when the darkness changes by a
  // visible step.
  const night = new WeakMap();
  function nightCopy(sprite, n) {
    const k = Math.round(n * 20) / 20;
    const cached = night.get(sprite);
    if (cached && cached.k === k) return cached.sprite;
    const c = document.createElement('canvas');
    c.width = sprite.canvas.width;
    c.height = sprite.canvas.height;
    const cg = c.getContext('2d');
    cg.drawImage(sprite.canvas, 0, 0);
    cg.globalCompositeOperation = 'source-atop';
    cg.fillStyle = `rgba(29,37,96,${(k * 0.55).toFixed(3)})`;
    cg.fillRect(0, 0, c.width, c.height);
    const copy = { canvas: c, vb: sprite.vb };
    night.set(sprite, { k, sprite: copy });
    return copy;
  }

  // The cloud comes along: once the view has rested somewhere in the garden
  // for a moment with the cloud nowhere to be seen, it drifts over, so the
  // weather is always in reach. It settles on the side away from the sun (or
  // the moon), and moves aside if it ends up in front of them.
  let camSeen = 0;
  let stillSince = 0;
  function followView() {
    const cam = W.cam;
    if (Math.abs(cam.x - camSeen) > 2) { camSeen = cam.x; stillSince = W.t; return; }
    if (cloud.held || cloud.glideTo != null || W.t - stillSince < 2 || W.t - cloud.droppedAt < 6) return;
    const centre = cam.x + cam.viewW / 2;
    if (centre < 2000) return;
    const body = (W.dayT > 0.5 ? moon : sun).pos();
    const away = Math.abs(cloud.x - centre) > cam.viewW / 2 + 150;
    // Overlapping, allowing for the sun or moon riding higher than the cloud.
    const near = x => Math.max(0, 1 - Math.hypot((x - body.x) / 280, (cloud.y - body.y) / 220));
    const covering = !away && near(cloud.x) > 0 && W.onScreen(body.x);
    const hidden = !away && !cloudClearOfTree(cloud.x);
    if (!away && !covering && !hidden) return;
    // The best of a few spots across the view: clear of the tree, clear of
    // the sun or moon, and otherwise as close to where it is as possible.
    let best = null, bestScore = Infinity;
    for (const f of [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92]) {
      const x = clamp(cam.x + cam.viewW * f, 1840, WORLD.W - 120);
      const score = (cloudClearOfTree(x) ? 0 : 1000) + near(x) * 600 + Math.abs(x - cloud.x) * 0.01;
      if (score < bestScore) { bestScore = score; best = x; }
    }
    if (Math.abs(best - cloud.x) > 20) cloud.glideTo = best;
  }
  // Clear of the apple tree's canopy, which would hide the cloud behind it.
  const cloudClearOfTree = x => x < PLACES.tree.x - 510 || x > PLACES.tree.x + 480;

  function cycleWeather() {
    const next = sky.weather === 'clear' ? 'rain' : sky.weather === 'rain' ? 'snow' : 'clear';
    setWeather(next);
  }

  function setWeather(kind) {
    const was = sky.weather;
    sky.weather = kind;
    applyBed();
    fx.poof(cloud.x, cloud.y + 30, 10, 120);
    if (kind === 'rain') { W.say('Rain'); audio.whoosh(); }
    else if (kind === 'snow') { W.say('Snow'); audio.shimmer(1046.5); }
    else if (was !== 'clear') {
      // Over the part of the garden the child is looking at.
      sky.rainbowX = clamp(W.cam.x + W.cam.viewW / 2, 2000, WORLD.W - 200);
      sky.rainbow = 0.01;
      sky.rainbowUntil = W.t + 11;
      W.say('Rainbow');
      audio.softFanfare();
      fx.sparkle(sky.rainbowX, 260, 24, 300, ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc']);
      W.emit('rainbow', sky.rainbowX);
    }
    W.emit('weather:' + kind);
  }
  sky.setWeather = setWeather;

  function applyBed() {
    audio.setWeatherBed(sky.weather === 'rain' ? 'rain' : null);
  }
  W.on('audioResumed', applyBed);

  /* ---------------- rain, puddles, snow ---------------- */

  let drops = [];
  let flakes = [];
  const puddles = PLACES.puddles.map(p => ({ ...p, wet: 0, ripple: 0 }));
  sky.puddles = puddles;

  sky.puddleAt = (x, y) => puddles.find(p => p.wet > 0.35
    && Math.abs(x - p.x) < p.r * p.wet && Math.abs(y - p.y) < p.r * 0.4 * p.wet + 18);

  function updateWeather(dt) {
    // Rain: over the whole garden, as thick as a fixed number of drops across
    // whatever part of it is in view (none falls indoors).
    sky.gloom = clamp(sky.gloom + (sky.weather === 'rain' ? dt / 2 : -dt / 3), 0, 1);
    if (sky.weather === 'rain') {
      const x0 = Math.max(1660, W.cam.x - 80), x1 = Math.min(WORLD.W + 40, W.cam.x + W.cam.viewW + 80);
      const want = x1 > x0 ? Math.round(170 * (x1 - x0) / 1600) : 0;
      while (drops.length < want) {
        drops.push({ x: x0 + Math.random() * (x1 - x0), y: W.cam.top - 40 - Math.random() * 500,
          land: 540 + Math.random() * 250, v: 1100 + Math.random() * 400 });
      }
      for (const p of puddles) p.wet = Math.min(1, p.wet + dt / 3.5);
    }
    for (const d of drops) d.y += d.v * dt;
    for (const d of drops) {
      if (d.y >= d.land && Math.random() < 0.12 && W.onScreen(d.x)) fx.splash(d.x, d.land, 0.15);
    }
    drops = drops.filter(d => d.y < d.land);

    // Puddles slowly dry in sunshine and freeze over (vanish) in snow.
    if (sky.weather !== 'rain') {
      const rate = sky.weather === 'snow' ? 1 / 4 : 1 / 40;
      for (const p of puddles) p.wet = Math.max(0, p.wet - dt * rate);
    }
    for (const p of puddles) p.ripple = Math.max(0, p.ripple - dt * 1.5);

    // Snow: a gentle fall over the whole garden, settling on everything.
    if (sky.weather === 'snow') {
      sky.snow = Math.min(1, sky.snow + dt / 5);
      const want = 120;
      while (flakes.length < want) {
        flakes.push({ x: 1660 + Math.random() * (WORLD.W - 1660), y: W.cam.top - Math.random() * 400,
          land: 520 + Math.random() * 270, v: 70 + Math.random() * 80, r: 4 + Math.random() * 6, wob: Math.random() * 6 });
      }
    } else {
      sky.snow = Math.max(0, sky.snow - dt / 6);
    }
    for (const f of flakes) {
      f.y += f.v * dt;
      f.wob += dt * 1.5;
      f.x += Math.sin(f.wob) * 30 * dt;
    }
    flakes = flakes.filter(f => f.y < f.land && (sky.weather === 'snow' || f.y > W.cam.top - 50));

    // In rain or snow the sun slips behind a little cloud of its own.
    sky.veil = clamp(sky.veil + (sky.weather === 'clear' ? -dt / 1.2 : dt / 1.6), 0, 1);

    if (sky.rainbow > 0) {
      // It fades with the daylight rather than hanging in the night sky.
      const target = W.t < sky.rainbowUntil && sky.weather === 'clear' && W.dayT < 0.35 ? 1 : 0;
      sky.rainbow = clamp(sky.rainbow + (target ? dt / 1.5 : -dt / 2.5), 0, 1);
    }
  }

  // Ground-level weather: puddles and the snow blanket on the lawn.
  const groundDecal = {
    layer: 'decal',
    draw(g) {
      for (const p of puddles) {
        if (p.wet < 0.02) continue;
        const rx = p.r * p.wet, ry = p.r * 0.32 * p.wet;
        g.save();
        g.globalAlpha = Math.min(1, p.wet * 1.4) * 0.9;
        const grad = g.createLinearGradient(p.x, p.y - ry, p.x, p.y + ry);
        grad.addColorStop(0, '#a6d4ef');
        grad.addColorStop(1, '#7fb7e0');
        g.fillStyle = grad;
        g.beginPath(); g.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(80,110,150,0.35)';
        g.lineWidth = 3;
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.65)';
        g.beginPath(); g.ellipse(p.x - rx * 0.35, p.y - ry * 0.3, rx * 0.28, ry * 0.18, 0, 0, Math.PI * 2); g.fill();
        if (p.ripple > 0) {
          g.strokeStyle = `rgba(255,255,255,${p.ripple * 0.8})`;
          g.lineWidth = 4;
          const k = 1.4 - p.ripple * 0.6;
          g.beginPath(); g.ellipse(p.x, p.y, rx * k * 0.8, ry * k * 0.8, 0, 0, Math.PI * 2); g.stroke();
        }
        g.restore();
      }
      if (sky.snow > 0.01) {
        const s = sky.snow;
        g.save();
        g.globalAlpha = 0.93 * s;
        g.fillStyle = '#f7fbff';
        g.beginPath();
        g.moveTo(1640, 802);
        g.lineTo(1640, 512);
        for (let x = 1640; x <= WORLD.W + 40; x += 60) g.lineTo(x, 506 + Math.sin(x * 0.03) * 6);
        g.lineTo(WORLD.W + 40, 802);
        g.closePath();
        g.fill();
        g.fillStyle = '#ffffff';
        g.fillRect(1660, 410, WORLD.W - 1660, 8);
        g.fillRect(1660, 458, WORLD.W - 1660, 8);
        g.globalAlpha = 0.5 * s;
        g.fillStyle = '#dfe9f6';
        for (let x = 1700; x < WORLD.W; x += 170) {
          g.beginPath(); g.ellipse(x + Math.sin(x) * 40, 620 + Math.cos(x) * 80, 70, 10, 0, 0, Math.PI * 2); g.fill();
        }
        g.restore();
      }
    },
    hit(x, y) {
      const p = sky.puddleAt(x, y);
      if (p) { this.tapped = p; return true; }
      return false;
    },
    tap() {
      const p = this.tapped;
      if (!p) return;
      p.ripple = 1;
      audio.splash();
      fx.splash(p.x, p.y, 0.4);
      W.emit('puddleTapped', p);
    },
  };

  // Snow on the roof, drawn over the house so it sits on the shingles.
  const roofSnow = {
    layer: 'houseDecal',
    draw(g) {
      if (sky.snow < 0.01) return;
      g.save();
      g.globalAlpha = sky.snow;
      g.strokeStyle = '#ffffff';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.lineWidth = 26;
      g.beginPath();
      g.moveTo(-80, 34); g.lineTo(830, -340); g.lineTo(1740, 34);
      g.stroke();
      g.fillStyle = '#ffffff';
      g.fillRect(1250, -284, 114, 16);
      g.fillRect(232, 342, 346, 10);
      g.restore();
    },
  };

  // Rain or snow seen through the bedroom window, drawn on the glass before
  // the curtains.
  const GLASS = { x: 262, y: 130, w: 286, h: 210 };
  const windowWeather = {
    layer: 'houseDecal',
    bits: Array.from({ length: 18 }, () => ({
      x: GLASS.x + Math.random() * GLASS.w, y: GLASS.y + Math.random() * GLASS.h, k: Math.random(),
    })),
    update(dt) {
      if (sky.weather === 'clear') return;
      const rain = sky.weather === 'rain';
      for (const b of this.bits) {
        b.y += (rain ? 820 + b.k * 300 : 40 + b.k * 40) * dt;
        if (!rain) b.x += Math.sin(W.t * 1.5 + b.k * 6) * 18 * dt;
        if (b.y > GLASS.y + GLASS.h + 30) {
          b.y = GLASS.y - 30;
          b.x = GLASS.x + Math.random() * GLASS.w;
        }
      }
    },
    draw(g) {
      if (sky.weather === 'clear') return;
      g.save();
      g.beginPath();
      g.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
      g.clip();
      if (sky.weather === 'rain') {
        g.strokeStyle = 'rgba(120,160,215,0.6)';
        g.lineWidth = 4;
        g.lineCap = 'round';
        g.beginPath();
        for (const b of this.bits) { g.moveTo(b.x, b.y); g.lineTo(b.x - 4, b.y + 26); }
        g.stroke();
      } else {
        g.fillStyle = '#ffffff';
        for (const b of this.bits) { g.beginPath(); g.arc(b.x, b.y, 3 + b.k * 4, 0, Math.PI * 2); g.fill(); }
      }
      g.restore();
    },
  };

  /* ---------------- the snowman ---------------- */

  const snowman = {
    stage: 0, x: PLACES.snowman.x, y: PLACES.snowman.y, wob: 0, melt: 0,
    get z() { return this.y; },
    draw(g) {
      if (!this.stage) return;
      const d = depthAt(this.y);
      const k = d * (1 - this.melt * 0.6);
      g.save();
      g.translate(this.x, this.y + this.melt * 30);
      g.rotate(Math.sin(this.wob * 14) * 0.08 * this.wob);
      g.scale(k, k * (1 - this.melt * 0.3));
      g.fillStyle = 'rgba(70,90,150,0.28)';
      g.beginPath(); g.ellipse(0, 4, 96, 22, 0, 0, Math.PI * 2); g.fill();
      const ball = (cy, r) => {
        const grad = g.createRadialGradient(-r * 0.35, cy - r * 0.4, r * 0.2, 0, cy, r);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.7, '#e3ecf8');
        grad.addColorStop(1, '#b9cbe6');
        g.fillStyle = grad;
        g.strokeStyle = 'rgba(80,90,140,0.75)';
        g.lineWidth = 5;
        g.beginPath(); g.arc(0, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
      };
      if (this.stage >= 1) ball(-70, 76);
      if (this.stage >= 2) ball(-188, 56);
      if (this.stage >= 3) ball(-276, 42);
      if (this.stage >= 2) {
        g.fillStyle = '#3a3357';
        [-200, -176, -152].forEach(y => { g.beginPath(); g.arc(0, y + 10, 6, 0, Math.PI * 2); g.fill(); });
        g.strokeStyle = '#8a5a35';
        g.lineWidth = 7;
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(-48, -196); g.lineTo(-104, -236); g.moveTo(-86, -224); g.lineTo(-100, -250);
        g.moveTo(48, -196); g.lineTo(104, -236); g.moveTo(86, -224); g.lineTo(104, -246); g.stroke();
      }
      if (this.stage >= 3) {
        g.fillStyle = '#3a3357';
        g.beginPath(); g.arc(-14, -284, 6, 0, Math.PI * 2); g.arc(14, -284, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff8c3a';
        g.beginPath(); g.moveTo(-4, -274); g.lineTo(34, -266); g.lineTo(-4, -262); g.closePath(); g.fill();
        g.strokeStyle = '#3a3357';
        g.lineWidth = 4;
        g.beginPath(); g.arc(0, -262, 14, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      }
      if (this.stage >= 4) {
        g.fillStyle = '#e8525a';
        g.beginPath();
        g.moveTo(-50, -240); g.quadraticCurveTo(0, -222, 50, -240); g.lineTo(52, -226); g.quadraticCurveTo(0, -208, -52, -226);
        g.closePath(); g.fill();
        g.fillRect(24, -232, 18, 52);
        g.fillStyle = '#4a4e69';
        g.fillRect(-36, -326, 72, 12);
        g.fillRect(-24, -372, 48, 48);
        g.fillStyle = '#e8525a';
        g.fillRect(-24, -340, 48, 9);
      }
      g.restore();
    },
    hit(x, y) {
      if (!this.stage) return false;
      const h = [0, 150, 250, 330, 380][this.stage] * depthAt(this.y);
      return Math.abs(x - this.x) < 100 && y < this.y + 20 && y > this.y - h;
    },
    tap() { grow(this.x, this.y); },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.4);
      if (this.stage && sky.snow < 0.35) {
        this.melt = Math.min(1, this.melt + dt / 3);
        if (this.melt >= 1) { this.stage = 0; this.melt = 0; }
      }
    },
    hint() { if (this.stage) this.wob = 0.8; },
  };
  sky.snowman = snowman;

  // The lawn a snowman can stand on: up to the apple tree, since past it the
  // vegetable patch fills the ground.
  const SNOW_X1 = 3240;
  function grow(x, y) {
    if (!snowman.stage) {
      // Tapped at the patch, he is built at the edge of the lawn, at the
      // front, and the view eases over a little so he is not squeezed
      // against the edge of the screen.
      const atPatch = x > SNOW_X1;
      const p = clampToFloor(clamp(x, 1760, SNOW_X1), atPatch ? 790 : y);
      snowman.x = p.x;
      snowman.y = p.y;
      snowman.melt = 0;
      if (snowman.x < W.cam.x + 240) W.panTo(snowman.x - 300 + W.cam.viewW / 2);
    }
    if (snowman.stage < 4) {
      snowman.stage++;
      audio.crunch();
      fx.poof(snowman.x, snowman.y - 60 - snowman.stage * 70, 8, 70);
      W.emit('snowmanGrew', snowman);
      if (snowman.stage === 4) {
        audio.tada();
        fx.confetti(snowman.x, snowman.y - 300, 30);
        W.say('Snowman');
      }
    } else {
      audio.boing();
      W.say('Snowman');
    }
    snowman.wob = 1;
  }

  W.on('tapEmpty', p => {
    // A tap on snowy lawn rolls the first snowball of a snowman.
    if (sky.snow > 0.6 && p.x > 1700 && p.y > 600 && !snowman.stage) {
      p.handled = true;
      grow(p.x, p.y);
    }
  });

  /* ---------------- windmill, porch lantern and fireflies ---------------- */

  W.windmillAngle = 0;
  const windmill = {
    layer: 'sky', spinV: 0.45,
    hit(x, y) {
      const p = W.windmillPos ? W.windmillPos() : null;
      return !!p && x > 1680 && clearOfTree(p.x) && Math.hypot(x - p.x, y - (p.y + 10)) < 68;
    },
    tap() {
      const p = W.windmillPos ? W.windmillPos() : null;
      this.spinV = quietMotion() ? 1.4 : 4.2;
      audio.whoosh();
      if (p && !quietMotion()) fx.sparkle(p.x, p.y, 6, 80, ['#fffaf2', '#ffe066', '#ffffff']);
    },
    update(dt) {
      const base = quietMotion() ? 0 : (sky.weather === 'clear' ? 0.45 : 0.95);
      this.spinV += (base - this.spinV) * Math.min(1, dt * 2);
      W.windmillAngle = (W.windmillAngle || 0) + this.spinV * dt;
    },
  };

  const porch = {
    layer: 'decal', x: PLACES.porchLight.x, y: PLACES.porchLight.y, wob: 0,
    draw(g) {
      g.save();
      if (sky.porchOn) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        const halo = g.createRadialGradient(this.x, this.y, 6, this.x, this.y, 96);
        halo.addColorStop(0, 'rgba(255,224,140,0.34)');
        halo.addColorStop(1, 'rgba(255,224,140,0)');
        g.fillStyle = halo;
        g.beginPath(); g.arc(this.x, this.y, 96, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.translate(this.x + 4, this.y - 2);
      const sq = Math.sin(this.wob * 18) * 0.08 * this.wob;
      g.scale(1 + sq, 1 - sq);
      g.fillStyle = sky.porchOn ? '#fff6cc' : '#8590a6';
      g.beginPath();
      g.roundRect ? g.roundRect(-9, -16, 18, 32, 3) : g.rect(-9, -16, 18, 32);
      g.fill();
      if (sky.porchOn) {
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(0, -2, 4.5, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    },
    hit(x, y) { return Math.abs(x - this.x) < 52 && Math.abs(y - this.y) < 58; },
    tap() {
      sky.porchOn = !sky.porchOn;
      this.wob = 1;
      audio.click();
      setTimeout(() => { if (W.isAlive()) audio.bell(sky.porchOn ? 6 : 2); }, 70);
      if (sky.porchOn && !quietMotion()) fx.sparkle(this.x, this.y, 8, 95, ['#fff2b0', '#ffe07a', '#ffffff']);
    },
    update(dt) { this.wob = Math.max(0, this.wob - dt * 1.8); },
    hint() { this.wob = 0.8; },
  };

  const fireflies = Array.from({ length: 20 }, () => ({
    x: 1750 + Math.random() * (WORLD.W - 1850), y: 430 + Math.random() * 260,
    ph: Math.random() * 6, sp: 0.4 + Math.random() * 0.6,
    dx: 0, dy: 0, vx: 0, vy: 0, flash: 0,
  }));

  function fireflyPos(f) {
    if (quietMotion()) return { x: f.x + f.dx, y: f.y + f.dy };
    return {
      x: f.x + f.dx + Math.sin(W.t * f.sp + f.ph) * 40,
      y: f.y + f.dy + Math.cos(W.t * f.sp * 1.3 + f.ph) * 26,
    };
  }

  const fireflyField = {
    layer: 'sky', picked: null,
    hit(x, y) {
      if (W.dayT <= 0.5 || sky.weather !== 'clear') return false;
      let best = null, bestD = 58;
      for (const f of fireflies) {
        const p = fireflyPos(f);
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < bestD) { best = f; bestD = d; }
      }
      this.picked = best;
      return !!best;
    },
    tap() {
      const f = this.picked;
      if (!f) return;
      const p = fireflyPos(f);
      f.flash = 1;
      if (!quietMotion()) {
        const a = Math.random() * Math.PI * 2;
        f.vx = Math.cos(a) * 230;
        f.vy = Math.sin(a) * 150 - 30;
        fx.sparkle(p.x, p.y, 7, 85, ['#f0ff96', '#fff6b8', '#ffffff']);
      }
      audio.shimmer(1046.5 + (fireflies.indexOf(f) % 5) * 130);
    },
    update(dt) {
      for (const f of fireflies) {
        f.flash = Math.max(0, f.flash - dt * 1.4);
        f.dx += f.vx * dt;
        f.dy += f.vy * dt;
        f.vx *= Math.exp(-3.2 * dt);
        f.vy *= Math.exp(-3.2 * dt);
        f.dx *= Math.exp(-0.6 * dt);
        f.dy *= Math.exp(-0.6 * dt);
      }
    },
  };

  W.on('glow', ({ g, n }) => {
    // The porch lantern and the fireflies come out after dark.
    if (sky.porchOn) {
      const lp = PLACES.porchLight;
      const glow = g.createRadialGradient(lp.x, lp.y, 10, lp.x, lp.y, 230);
      glow.addColorStop(0, `rgba(255,214,140,${0.55 * n})`);
      glow.addColorStop(1, 'rgba(255,214,140,0)');
      g.fillStyle = glow;
      g.beginPath(); g.arc(lp.x, lp.y, 230, 0, Math.PI * 2); g.fill();
    }
    if (n > 0.5 && sky.weather === 'clear') {
      for (const f of fireflies) {
        const { x, y } = fireflyPos(f);
        const pulse = quietMotion() ? 0.75 : 0.5 + 0.5 * Math.sin(W.t * 3 + f.ph);
        const a = Math.min(1, (n - 0.5) * 2 * (pulse + f.flash * 0.7));
        const r = 22 + f.flash * 14;
        const fg = g.createRadialGradient(x, y, 1, x, y, r);
        fg.addColorStop(0, `rgba(240,255,150,${a})`);
        fg.addColorStop(1, 'rgba(240,255,150,0)');
        g.fillStyle = fg;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = `rgba(250,255,200,${Math.min(1, a * 1.25)})`;
        g.beginPath(); g.arc(x, y, 3.2 + f.flash * 2, 0, Math.PI * 2); g.fill();
      }
    }
  });

  W.on('weather', g => {
    if (drops.length) {
      g.save();
      g.strokeStyle = W.dayT > 0.5 ? 'rgba(170,190,240,0.6)' : 'rgba(110,160,220,0.75)';
      g.lineWidth = 5;
      g.lineCap = 'round';
      g.beginPath();
      for (const d of drops) { g.moveTo(d.x, d.y); g.lineTo(d.x - 6, d.y + 38); }
      g.stroke();
      g.restore();
    }
    if (flakes.length) {
      g.save();
      g.fillStyle = '#ffffff';
      g.globalAlpha = 0.95;
      for (const f of flakes) { g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.fill(); }
      g.restore();
    }
  });

  W.on('update', dt => { placeBodies(dt); updateDay(dt); updateWeather(dt); followView(); });

  for (const e of [backdrop, windmill, fireflyField, sun, moon, cloud, porch, groundDecal, roofSnow, windowWeather, snowman]) W.add(e);
  W.on('destroy', () => audio.stopWeatherBed());
  return sky;
}
