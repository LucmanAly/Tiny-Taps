// Play House world: the canvas, camera, frame loop, layered drawing and
// touch routing that every other Play House module plugs into.
//
// Things in the world are plain objects ("entities") with optional methods:
//   layer        'sky' | 'outside' (behind fence) | 'decal' | 'sorted' | 'front'
//   z            sort key for the 'sorted' layer — the y of the thing's base
//   update(dt)   draw(g)            per frame, in world units
//   hit(x, y)    true when a touch at (x, y) belongs to it
//   press(x, y)  instant feedback the moment a finger lands on it
//   tap(x, y)    a touch that did not turn into a drag
//   draggable, grab(x, y), drag(x, y), drop(x, y, vx, vy)
//   hint()       an idle wiggle that invites a first touch
//
// The child pans by swiping empty space, by dragging something to a screen
// edge, or with the round arrows at the sides.

import { WORLD, VIEW } from './layout.js';
import { rasterize, blit, SPRITES, homeBackdrop, gardenBackdrop, hillsFar, hillsNear } from './art.js';
import { createFx } from './fx.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Parallax hills must still reach the right-hand edge of the widest view at
// the far end of the world.
const HILLS = { far: { p: 0.35, width: Math.ceil(WORLD.W * 0.35 + 1700) }, near: { p: 0.6, width: Math.ceil(WORLD.W * 0.6 + 1100) } };
const DRAG_SLOP = 10;       // px before a press on a draggable becomes a drag
const PAN_SLOP = 14;        // px before a press on empty space becomes a pan
const EDGE_PX = 64;         // dragging this close to an edge pans the world

export function createWorld({ stage, audio }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'playhouse-canvas';
  stage.appendChild(canvas);
  const g = canvas.getContext('2d');
  // The night tint is applied to the world but not to the sky behind it, so
  // after dark the world is drawn on its own layer first.
  const layer = document.createElement('canvas');
  const lg = layer.getContext('2d');

  const listeners = new Map();
  const W = {
    canvas, audio,
    t: 0,
    entities: [],
    ui: [],                 // screen-space overlays: { draw(g), hit(sx, sy), tap() }
    sprites: {},
    fx: createFx(),
    cam: { x: 0, s: 1, viewW: 1600, viewH: 800, top: 0, vx: 0, glide: null },
    dayT: 0,                // 0 = full day, 1 = full night
    lastInput: -999,
    ready: false,
    dpr: Math.min(window.devicePixelRatio || 1, VIEW.dprCap),

    add(e) { W.entities.push(e); return e; },
    remove(e) { const i = W.entities.indexOf(e); if (i >= 0) W.entities.splice(i, 1); },
    on(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); },
    emit(name, data) { for (const fn of listeners.get(name) || []) fn(data); },

    toScreen(x, y) { return { x: (x - W.cam.x) * W.cam.s, y: (y - W.cam.top) * W.cam.s }; },
    toWorld(sx, sy) { return { x: sx / W.cam.s + W.cam.x, y: sy / W.cam.s + W.cam.top }; },
    onScreen(x, pad = 0) { return x > W.cam.x - pad && x < W.cam.x + W.cam.viewW + pad; },
    // Smoothly brings world x into the middle of the view.
    panTo(x) { W.cam.glide = clampCamX(x - W.cam.viewW / 2); W.cam.vx = 0; },
    // Brings x on screen only if it is not already comfortably visible.
    reveal(x, margin = 220) {
      if (x < W.cam.x + margin || x > W.cam.x + W.cam.viewW - margin) W.panTo(x);
    },
  };

  /* ---------------- sizing and the camera ---------------- */

  let backdrops = {};       // home, garden, hillsFar, hillsNear
  let rasterGen = 0;
  let rasterPx = 0;

  function clampCamX(x) {
    const minX = -40, maxX = WORLD.W - W.cam.viewW + 20;
    if (maxX < minX) return (WORLD.W - W.cam.viewW) / 2;
    return clamp(x, minX, maxX);
  }

  function fit() {
    const w = canvas.clientWidth || stage.clientWidth || 1;
    const h = canvas.clientHeight || stage.clientHeight || 1;
    const portrait = h > w;
    const cam = W.cam;
    const centre = cam.x + cam.viewW / 2;
    cam.s = Math.min(w / (portrait ? VIEW.portraitW : VIEW.landscapeW), h / WORLD.H);
    cam.viewW = w / cam.s;
    cam.viewH = h / cam.s;
    cam.top = WORLD.H - cam.viewH;
    cam.screenW = w;
    cam.screenH = h;
    cam.x = clampCamX(W.ready ? centre - cam.viewW / 2 : cam.x);
    for (const c of [canvas, layer]) {
      c.width = Math.round(w * W.dpr);
      c.height = Math.round(h * W.dpr);
    }
    const px = cam.s * W.dpr;
    if (Math.abs(px - rasterPx) / px > 0.02) rasterizeAll(px);
  }

  // Rasterizes every piece of scenery for the current pixel density. Old
  // bitmaps stay on screen until the whole new set is ready, so a rotation
  // never flashes an empty world.
  async function rasterizeAll(px) {
    rasterPx = px;
    const gen = ++rasterGen;
    const bpx = W.cam.s * Math.min(W.dpr, VIEW.backdropDprCap);
    const jobs = {
      home: rasterize(homeBackdrop(), bpx),
      garden: rasterize(gardenBackdrop(), bpx),
      hillsFar: rasterize(hillsFar(HILLS.far.width), bpx),
      hillsNear: rasterize(hillsNear(HILLS.near.width), bpx),
    };
    const spriteJobs = Object.entries(SPRITES).map(([name, make]) => rasterize(make(), px).then(s => [name, s]));
    const [bd, sp] = await Promise.all([
      Promise.all(Object.entries(jobs).map(([k, p]) => p.then(v => [k, v]))),
      Promise.all(spriteJobs),
    ]);
    if (gen !== rasterGen || !alive) return;
    backdrops = Object.fromEntries(bd);
    W.sprites = Object.fromEntries(sp);
    if (!W.ready) { W.ready = true; W.emit('ready'); }
  }

  /* ---------------- drawing ---------------- */

  const SKY = {
    day: ['#86cdfb', '#cdeefe', '#f1fbff'],
    dusk: ['#6f7fd0', '#f0a3a8', '#ffd7a8'],
    night: ['#141c4a', '#2b3a7a', '#4a5a9c'],
    rain: ['#8d9cb0', '#b4c0cc', '#d3dae1'],
  };
  const rgb = h => { const p = parseInt(h.slice(1), 16); return [p >> 16, (p >> 8) & 255, p & 255]; };
  const blend = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  function skyStops(t) {
    // Through dusk on the way between day and night, so the change reads as
    // a sunset rather than a dimmer switch; greyer while it rains.
    const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const from = t < 0.5 ? SKY.day : SKY.dusk, to = t < 0.5 ? SKY.dusk : SKY.night;
    const gloom = W.sky ? W.sky.gloom * 0.6 * (1 - t) : 0;
    return from.map((c, i) => {
      let v = blend(rgb(c), rgb(to[i]), k);
      if (gloom > 0.001) v = blend(v, rgb(SKY.rain[i]), gloom);
      return `rgb(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])})`;
    });
  }
  W.skyStops = skyStops;

  function worldTransform(ctx) {
    const k = W.cam.s * W.dpr;
    ctx.setTransform(k, 0, 0, k, -W.cam.x * k, -W.cam.top * k);
  }

  function drawSky() {
    const cam = W.cam;
    const stops = skyStops(W.dayT);
    W.emit('skyTint', stops);
    const grad = g.createLinearGradient(0, -700, 0, WORLD.horizonY);
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.65, stops[1]);
    grad.addColorStop(1, stops[2]);
    g.fillStyle = grad;
    g.fillRect(cam.x - 10, cam.top - 10, cam.viewW + 20, cam.viewH + 20);
    for (const e of W.entities) if (e.layer === 'sky' && e.draw) e.draw(g);
  }

  function drawHills(ctx) {
    for (const key of ['hillsFar', 'hillsNear']) {
      const sprite = backdrops[key];
      if (!sprite) continue;
      const p = key === 'hillsFar' ? HILLS.far.p : HILLS.near.p;
      blit(ctx, sprite, W.cam.x * (1 - p) - 40, 0);
    }
  }

  let sorted = [];
  function drawWorld(ctx) {
    drawHills(ctx);
    for (const e of W.entities) if (e.layer === 'outside' && e.draw) e.draw(ctx);
    if (backdrops.garden) blit(ctx, backdrops.garden);
    for (const e of W.entities) if (e.layer === 'decal' && e.draw) e.draw(ctx);
    if (backdrops.home) blit(ctx, backdrops.home);
    for (const e of W.entities) if (e.layer === 'houseDecal' && e.draw) e.draw(ctx);
    sorted = W.entities.filter(e => (e.layer || 'sorted') === 'sorted');
    sorted.sort((a, b) => a.z - b.z);
    for (const e of sorted) if (e.draw) e.draw(ctx);
    for (const e of W.entities) if (e.layer === 'front' && e.draw) e.draw(ctx);
  }

  // Night: the world is darkened toward a moonlit blue, the house a little
  // less when the lamp is on, and warm lights are added back on top.
  function tintNight(ctx) {
    const n = W.dayT;
    if (n <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const houseDark = W.lampOn ? 0.26 : 0.5;
    ctx.fillStyle = `rgba(22,26,74,${(0.52 * n).toFixed(3)})`;
    ctx.fillRect(1660, W.cam.top - 10, WORLD.W, W.cam.viewH + 20);
    ctx.fillRect(-200, W.cam.top - 10, 200, W.cam.viewH + 20);
    ctx.fillStyle = `rgba(30,24,64,${(houseDark * n).toFixed(3)})`;
    ctx.fillRect(0, W.cam.top - 10, 1660, W.cam.viewH + 20);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    W.emit('glow', { g: ctx, n });
    ctx.restore();
  }

  function draw() {
    const cam = W.cam;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    worldTransform(g);
    drawSky();
    if (W.dayT > 0.001) {
      lg.setTransform(1, 0, 0, 1, 0, 0);
      lg.clearRect(0, 0, layer.width, layer.height);
      worldTransform(lg);
      drawWorld(lg);
      tintNight(lg);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(layer, 0, 0);
      worldTransform(g);
    } else {
      drawWorld(g);
    }
    W.emit('weather', g);
    W.fx.draw(g);
    for (const e of W.entities) if (e.drawUI) e.drawUI(g);
    // Screen-space overlays: arrows, the zoomed photo, the camera flash.
    g.setTransform(W.dpr, 0, 0, W.dpr, 0, 0);
    for (const u of W.ui) if (u.draw) u.draw(g);
    const flash = W.fx.flashAlpha();
    if (flash > 0) {
      g.fillStyle = `rgba(255,255,255,${flash.toFixed(3)})`;
      g.fillRect(0, 0, cam.screenW, cam.screenH);
    }
  }

  /* ---------------- edge arrows ---------------- */

  const arrows = [-1, 1].map(dir => ({
    dir,
    box() {
      const r = Math.max(22, Math.min(32, W.cam.screenH * 0.062));
      const x = dir < 0 ? r + 8 : W.cam.screenW - r - 8;
      return { x, y: W.cam.screenH * 0.4, r };
    },
    visible() {
      const minX = -40, maxX = WORLD.W - W.cam.viewW + 20;
      return dir < 0 ? W.cam.x > minX + 100 : W.cam.x < maxX - 100;
    },
    hit(sx, sy) {
      if (!this.visible()) return false;
      const b = this.box();
      return Math.hypot(sx - b.x, sy - b.y) < b.r + 14;
    },
    tap() {
      audio.whoosh();
      W.cam.glide = clampCamX(W.cam.x + dir * W.cam.viewW * 0.85);
    },
    draw(ctx) {
      if (!this.visible() || !W.ready) return;
      const b = this.box();
      const pulse = 1 + Math.sin(W.t * 3) * 0.04;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(pulse, pulse);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.strokeStyle = 'rgba(107,74,58,0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#6b4a3a';
      ctx.lineWidth = Math.max(4, b.r * 0.2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const a = b.r * 0.32;
      ctx.beginPath();
      ctx.moveTo(-a * 0.5 * dir, -a);
      ctx.lineTo(a * 0.6 * dir, 0);
      ctx.lineTo(-a * 0.5 * dir, a);
      ctx.stroke();
      ctx.restore();
    },
  }));
  W.ui.push(...arrows);

  /* ---------------- touch ---------------- */

  const pointers = new Map();
  let active = null;          // the one pointer currently dragging or panning

  function screenPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // Front-most first: overlays, bubbles, then sorted things nearest the
  // viewer, then the floor decals, then the sky.
  function hitEntities(x, y) {
    const list = [...sorted].reverse();
    for (const e of W.entities) if (e.layer === 'front') list.unshift(e);
    for (const e of list) if (e.hit && e.hit(x, y)) return e;
    for (const e of W.entities) if ((e.layer === 'decal' || e.layer === 'houseDecal') && e.hit && e.hit(x, y)) return e;
    for (const e of W.entities) if (e.layer === 'outside' && e.hit && e.hit(x, y)) return e;
    for (const e of [...W.entities].reverse()) if (e.layer === 'sky' && e.hit && e.hit(x, y)) return e;
    return null;
  }
  W.hitEntities = hitEntities;

  function onDown(e) {
    if (!alive || !W.ready) return;
    if (audio.tryResume()) W.emit('audioResumed');
    const sp = screenPoint(e);
    const wp = W.toWorld(sp.x, sp.y);
    W.lastInput = W.t;
    W.emit('input');

    for (const u of [...W.ui].reverse()) {
      if (u.hit && u.hit(sp.x, sp.y)) { u.tap(sp.x, sp.y); return; }
    }
    W.fx.ripple(wp.x, wp.y);
    if (W.fx.popBubbleAt(wp.x, wp.y)) {
      audio.pop();
      W.emit('bubblePopped', wp);
      return;
    }

    const target = hitEntities(wp.x, wp.y);
    const p = {
      id: e.pointerId, sx: sp.x, sy: sp.y, x: sp.x, y: sp.y, target, mode: 'bg',
      samples: [{ x: sp.x, y: sp.y, t: performance.now() }], camX0: W.cam.x,
    };
    if (target && target.draggable) {
      p.mode = 'press';
      if (target.press) target.press(wp.x, wp.y);
    } else if (target) {
      p.mode = 'tapped';
      if (target.tap) target.tap(wp.x, wp.y);
    }
    pointers.set(e.pointerId, p);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ }
  }

  function onMove(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const sp = screenPoint(e);
    p.x = sp.x; p.y = sp.y;
    p.samples.push({ x: sp.x, y: sp.y, t: performance.now() });
    if (p.samples.length > 6) p.samples.shift();
    const moved = Math.hypot(sp.x - p.sx, sp.y - p.sy);
    if (!active) {
      if (p.mode === 'press' && moved > DRAG_SLOP) {
        p.mode = 'drag';
        active = p;
        const wp = W.toWorld(sp.x, sp.y);
        p.target.grab(wp.x, wp.y);
        W.emit('grab', p.target);
      } else if ((p.mode === 'bg' || p.mode === 'tapped') && Math.abs(sp.x - p.sx) > PAN_SLOP) {
        p.mode = 'pan';
        active = p;
        p.camX0 = W.cam.x;
        W.cam.glide = null;
      }
    }
    if (p.mode === 'drag' && active === p) {
      const wp = W.toWorld(sp.x, sp.y);
      p.target.drag(wp.x, wp.y);
    } else if (p.mode === 'pan' && active === p) {
      W.cam.x = clampCamX(p.camX0 - (sp.x - p.sx) / W.cam.s);
    }
  }

  function velocity(p) {
    const a = p.samples[0], b = p.samples[p.samples.length - 1];
    const dt = Math.max(16, b.t - a.t) / 1000;
    return { x: (b.x - a.x) / dt / W.cam.s, y: (b.y - a.y) / dt / W.cam.s };
  }

  function onUp(e) {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    pointers.delete(e.pointerId);
    const cancelled = e.type === 'pointercancel';
    const wp = W.toWorld(p.x, p.y);
    if (p.mode === 'press' && !cancelled) {
      if (p.target.tap) p.target.tap(wp.x, wp.y);
    } else if (p.mode === 'drag') {
      const v = velocity(p);
      p.target.drop(wp.x, wp.y, v.x, v.y);
      W.emit('drop', p.target);
    } else if (p.mode === 'bg' && !cancelled) {
      W.emit('tapEmpty', wp);
    } else if (p.mode === 'pan') {
      W.cam.vx = -velocity(p).x;
    }
    if (active === p) active = null;
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  /* ---------------- frame loop ---------------- */

  let alive = true;
  let raf = 0;
  let last = 0;
  let reported = false;

  function updateCamera(dt) {
    const cam = W.cam;
    if (active && active.mode === 'drag') {
      // Carrying something to the edge of the screen pans toward it, so a
      // toy (or the baby) can be taken from the house out to the garden.
      const edge = active.x < EDGE_PX ? -1 : active.x > cam.screenW - EDGE_PX ? 1 : 0;
      if (edge) {
        cam.x = clampCamX(cam.x + edge * 900 * dt);
        const wp = W.toWorld(active.x, active.y);
        active.target.drag(wp.x, wp.y);
      }
    } else if (cam.glide !== null && !(active && active.mode === 'pan')) {
      cam.x = lerp(cam.x, cam.glide, 1 - Math.exp(-6 * dt));
      if (Math.abs(cam.x - cam.glide) < 1) { cam.x = cam.glide; cam.glide = null; }
    } else if (!active && Math.abs(cam.vx) > 5) {
      cam.x = clampCamX(cam.x + cam.vx * dt);
      cam.vx *= Math.exp(-4 * dt);
    }
  }

  function frame(ms) {
    if (!alive) return;
    const dt = last ? Math.min((ms - last) / 1000, 0.05) : 1 / 60;
    last = ms;
    W.t += dt;
    // Scheduled first, so one misbehaving piece can never freeze the world.
    raf = requestAnimationFrame(frame);
    try {
      updateCamera(dt);
      for (const e of [...W.entities]) if (e.update) e.update(dt);
      W.emit('update', dt);
      W.fx.update(dt);
      draw();
    } catch (err) {
      if (!reported) { reported = true; console.warn('Play House frame error', err); }
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  function onResize() { fit(); }

  W.start = () => {
    fit();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    raf = requestAnimationFrame(frame);
  };

  W.destroy = () => {
    alive = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onUp);
    W.emit('destroy');
    listeners.clear();
    W.fx.clear();
  };

  W.isAlive = () => alive;
  W.isDragging = target => !!(active && active.mode === 'drag' && active.target === target);
  W.blit = blit;
  return W;
}
