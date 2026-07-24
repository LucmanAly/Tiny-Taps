// Animated opening sequence: the mascot walks in, waves, and taps a wand to
// conjure the Tiny Taps logo, which is drawn procedurally on canvas (no logo
// image file). Runs on one requestAnimationFrame loop and hands off to the
// home screen when finished.
//
// Design notes:
// - The mascot art is four large PNGs. They are preloaded, but the intro is
//   never allowed to *block* on them: past a short budget the show starts with
//   whatever arrived, and the logo build is pure canvas so it still looks
//   complete even if every image fails.
// - All tunable values live in CONFIG so timing/layout can be retuned in one
//   place instead of hunting magic numbers through the draw code.

/* ---------------- configuration ---------------- */

export const CONFIG = {
  // Phase boundaries in ms from animation start. Each phase runs until the
  // next one begins; total ≈ 4.8s.
  timing: {
    bgFadeIn: 300,      // 0.0-0.3  warm-white background fades up
    walkEnd: 1800,      // 0.3-1.8  mascot walks in from the left
    waveEnd: 2400,      // 1.8-2.4  mascot waves
    magicEnd: 3300,     // 2.4-3.3  wand tap builds the logo
    holdEnd: 4200,      // 3.3-4.2  finished scene holds
    fadeOutEnd: 4800,   // 4.2-4.8  cross-fade into the home screen
  },

  // Sub-beats inside the magic phase, as ms offsets from magicStart.
  magic: {
    pointAt: 0,         // mascot switches to the wand pose and re-aims
    aimDuration: 200,   // how long the re-aim glide takes
    sparkAt: 150,       // glowing point appears at the wand tip
    streakAt: 210,      // glow travels from wand tip to the logo centre
    starAt: 300,        // star pops open
    starGrow: 420,      // star pop duration
    faceAt: 480,        // eyes / cheeks / smile fade in
    faceGrow: 260,
    rainbowAt: 400,     // rainbow arcs sweep outward underneath
    rainbowGrow: 420,
    // Letters must finish inside the magic phase (900ms), so the stagger and
    // pop are tuned to land the last one at ~880ms rather than spilling into
    // the hold with the word still half-written.
    lettersAt: 420,     // "Tiny Taps" begins revealing
    letterStagger: 34,  // delay between letters
    letterPop: 190,     // per-letter pop duration
    settleAt: 860,      // whole-logo bounce settle begins
    settleDur: 340,
  },

  // Layout is resolution independent: fractions of the smaller viewport edge
  // (`unit`) so phones and tablets, portrait and landscape, all stay balanced.
  layout: {
    logoCenterYPortrait: 0.40,  // fraction of canvas height
    logoCenterYLandscape: 0.42,
    logoCenterXPortrait: 0.50,  // fraction of canvas width
    logoCenterXLandscape: 0.57, // shifted right to leave the mascot room
    starRadiusFrac: 0.135,      // of `unit`
    starRadiusMin: 54,
    starRadiusMax: 150,
  },

  mascot: {
    heightFrac: 0.46,   // of `unit`
    minHeight: 190,
    maxHeight: 460,
    startXFrac: -0.28,  // offscreen left, fraction of canvas width
    // Where the wand's star tip sits inside mascot_magic.PNG, as a fraction of
    // that image's box. Used to aim the wand at the logo.
    wandTip: { x: 0.81, y: 0.14 },
    bobAmplitude: 0.028, // of mascot height
    bobCycles: 3.4,      // bobs across the whole walk
    tiltDegrees: 2.6,    // gentle rocking while walking
    waveBounce: 0.022,   // of mascot height
    waveCycles: 2.2,
  },

  colors: {
    bg: '#fffaf2',            // warm white
    starFill: '#ffd54a',
    starFillLight: '#fff3b8',
    starFillDeep: '#ffb62e',
    starOutline: '#ffffff',
    face: '#3a3357',
    cheek: '#ffb0a0',
    text: '#2f3557',         // soft dark navy
    glow: '#fff6c9',
    rainbow: ['#ffb8d9', '#ffd0a1', '#bfe9b8', '#a9dcf5'], // pink/orange/green/blue
    sparkle: ['#ffd54a', '#ffb8d9', '#a9dcf5', '#bfe9b8', '#ffffff'],
  },

  rainbow: {
    arcCount: 4,
    innerRadiusFrac: 1.15,  // of star radius
    gapFrac: 0.19,          // spacing between arcs, of star radius
    thicknessFrac: 0.15,
  },

  particles: {
    burstCount: 26,         // sparkles at the wand tap
    trailCount: 10,         // sparkles trailing the glow streak
    starRatio: 0.35,        // portion drawn as tiny stars rather than dots
    speedFrac: 0.5,         // of star radius, per second
    lifeMs: 900,
    sizeFrac: 0.06,         // of star radius
  },

  text: {
    value: 'Tiny Taps',
    sizeFrac: 0.42,         // of star radius
    gapFrac: 0.55,          // distance below the rainbow, of star radius
    popRise: 0.22,          // how far each letter rises in, of its size
  },

  bounce: {
    strength: 0.055,        // final settle overshoot, fraction of scale
  },

  // Cues are positioned against the same phase timings as the visuals, so
  // retuning the animation moves the sound with it automatically.
  sound: {
    enabled: true,
    // Browsers refuse to start audio that isn't triggered by a user gesture,
    // and iOS refuses permanently. When that happens the intro holds on an
    // inviting "tap to begin" frame; the tap unlocks the sound and starts the
    // show. Where autoplay *is* permitted (installed PWA, prior engagement)
    // there is no gate and the sequence plays by itself. Set false to always
    // auto-play and accept silence where audio is blocked.
    tapToStartWhenBlocked: true,
    // How long to give the browser to grant audio before deciding to gate.
    autoplayGraceMs: 350,
    // Pulsing "tap here" ring shown while waiting.
    hintRadiusFrac: 0.135,  // of `unit`
    hintPulseMs: 1300,
    // Footsteps, as fractions of the walk phase.
    stepFractions: [0.14, 0.38, 0.62, 0.86],
    greetDelay: 90,      // ms after the wave begins
    // Rainbow band notes: a C-major pentatonic run, one per arc.
    shimmerNotes: [523.25, 587.33, 659.25, 783.99],
    shimmerStagger: 95,  // ms between bands
  },

  fade: {
    skipMs: 180,            // quick fade when the child taps to skip
  },

  // The intro must never hold the app hostage to 8MB of art: start once every
  // image is in, or once this budget expires — whichever happens first.
  preloadBudgetMs: 2500,

  // Reduced motion: no walking, waving or particles. The finished scene is
  // shown calmly and briefly instead of animating.
  reducedMotion: {
    holdMs: 1100,
    fadeMs: 400,
  },
};

/* ---------------- easing ---------------- */

import * as audio from './audio.js';

const clamp01 = t => (t < 0 ? 0 : t > 1 ? 1 : t);
const lerp = (a, b, t) => a + (b - a) * t;

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t, overshoot = 1.7) => {
  const c3 = overshoot + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
};
const easeOutElastic = t => {
  if (t === 0 || t === 1) return t;
  const p = 0.42;
  return Math.pow(2, -11 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / p) + 1;
};

// Progress of `now` through a window that opens at `start` and lasts `dur`.
const phase = (now, start, dur) => clamp01((now - start) / dur);

/* ---------------- asset preloading ---------------- */

export const MASCOT_SOURCES = {
  walk: 'assets/mascot_walking.PNG',
  wave: 'assets/mascot_waving.PNG',
  magic: 'assets/mascot_magic.PNG',
  idle: 'assets/mascot_idle.PNG',
};

function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    // A missing or corrupt mascot resolves to null rather than rejecting, so
    // one bad file can never stall or crash the opening sequence.
    img.onload = () => resolve(img);
    img.onerror = () => { console.warn('intro: could not load', src); resolve(null); };
    img.src = src;
  });
}

// Resolves with whatever finished inside the budget. Late arrivals still land
// in the map afterwards, so a slow connection simply means the first run has
// fewer poses rather than a frozen screen.
export function preloadMascots(budgetMs = CONFIG.preloadBudgetMs) {
  const images = {};
  const jobs = Object.entries(MASCOT_SOURCES).map(([key, src]) =>
    loadImage(src).then(img => { images[key] = img; return img; }));

  const everything = Promise.all(jobs).then(() => images);
  const budget = new Promise(resolve => setTimeout(() => resolve(images), budgetMs));
  return Promise.race([everything, budget]);
}

/* ---------------- first-launch gating ----------------
   Currently always true: the intro plays on every fresh page load. The
   alternative policies are written out so switching later is a one-line
   change rather than a redesign. */

export function shouldShowIntro(mode = 'always') {
  try {
    if (mode === 'once-per-session') {
      if (sessionStorage.getItem('tinytaps-intro-seen')) return false;
      sessionStorage.setItem('tinytaps-intro-seen', '1');
      return true;
    }
    if (mode === 'once-per-install') {
      if (localStorage.getItem('tinytaps-intro-seen')) return false;
      localStorage.setItem('tinytaps-intro-seen', '1');
      return true;
    }
    if (mode === 'once-per-version') {
      // Pass the app VERSION in via `mode` handling at the call site when this
      // is enabled; kept simple here on purpose.
      return true;
    }
  } catch (e) { /* storage can be unavailable in private mode */ }
  return true;
}

/* ---------------- the scene ---------------- */

export class IntroScene {
  /**
   * @param {object}   opts
   * @param {Element}  opts.mount     where the canvas is inserted
   * @param {Function} opts.onDone    called once, when the intro is finished
   * @param {object}   [opts.images]  preloaded mascot images (may be partial)
   * @param {object}   [opts.config]  overrides merged over CONFIG
   */
  constructor({ mount, onDone, images = {}, config = CONFIG }) {
    this.mount = mount;
    this.onDone = onDone;
    this.images = images;
    this.cfg = config;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'intro-canvas';
    this.ctx = this.canvas.getContext('2d');

    this.raf = 0;
    this.startTime = 0;
    this.started = false;
    this.finished = false;   // guards against double hand-off
    this.skipping = false;
    this.skipStart = 0;
    this.particles = [];
    this.burstFired = false;
    this.trailFired = false;
    this.cued = new Set();   // cue names already played, so none repeats

    this.reduced = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._onResize = this._onResize.bind(this);
    this._onSkip = this._onSkip.bind(this);
    this._tick = this._tick.bind(this);
  }

  /**
   * Mounts and begins painting immediately. If `imagesPromise` is supplied the
   * canvas holds on the warm-white background until the art arrives, then runs
   * the sequence — so the first frame is already the intro's own background
   * rather than the app's gradient showing through during a slow preload.
   */
  start(imagesPromise = null) {
    if (this.started) return;   // never run two loops over one scene
    this.started = true;

    this.mount.appendChild(this.canvas);
    this._resize();

    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    // Tap anywhere to skip. Listener lives on the canvas, which covers the
    // viewport, and is removed in destroy().
    this.canvas.addEventListener('pointerdown', this._onSkip);

    // Ask for audio up front. If the browser refuses (no user activation yet)
    // the context stays suspended and every cue is skipped; nothing throws.
    if (this.cfg.sound.enabled) audio.tryResume();

    this.mountTime = performance.now();
    if (imagesPromise) {
      this.waiting = true;
      const begin = images => {
        if (this.finished || !this.waiting) return;
        if (images) this.images = images;
        this._layout();            // aspect may now come from the real art
        // Decide between auto-playing and waiting for a tap based on whether
        // the browser actually granted audio, rather than guessing from the
        // platform. resume() is asynchronous, so let the grace period run out
        // before judging — cached art can arrive before the answer does.
        const decide = () => {
          if (this.finished || !this.waiting) return;
          this.waiting = false;
          const blocked = this.cfg.sound.enabled
            && this.cfg.sound.tapToStartWhenBlocked
            && !audio.isRunning();
          if (blocked) {
            this.awaitingTap = true;
            this.gateTime = performance.now();
          } else {
            this.startTime = performance.now();
          }
        };
        const waited = performance.now() - this.mountTime;
        const remaining = this.cfg.sound.autoplayGraceMs - waited;
        if (remaining > 0) setTimeout(decide, remaining);
        else decide();
      };
      // A rejected preload must still start the show (the logo build is pure
      // canvas), otherwise the app would sit on the background forever.
      imagesPromise.then(begin, err => {
        console.warn('intro: mascot preload failed', err);
        begin(null);
      });
      // Hard stop in case the promise never settles at all.
      setTimeout(() => begin(null), this.cfg.preloadBudgetMs + 1500);
    } else {
      this.startTime = this.mountTime;
    }

    this.raf = requestAnimationFrame(this._tick);
  }

  /* ---- sizing ---- */

  _onResize() {
    this._resize();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.mount.clientWidth || window.innerWidth;
    const h = this.mount.clientHeight || window.innerHeight;
    this.cssW = w;
    this.cssH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._layout();
  }

  // Resolution independent layout, recomputed on every resize so an
  // orientation flip mid-intro stays composed instead of jumping.
  _layout() {
    const { layout, mascot } = this.cfg;
    const w = this.cssW, h = this.cssH;
    const unit = Math.min(w, h);
    const portrait = h >= w;

    const starR = Math.max(layout.starRadiusMin,
      Math.min(layout.starRadiusMax, unit * layout.starRadiusFrac));

    const logoX = w * (portrait ? layout.logoCenterXPortrait : layout.logoCenterXLandscape);
    const logoY = h * (portrait ? layout.logoCenterYPortrait : layout.logoCenterYLandscape);

    let mascotH = Math.max(mascot.minHeight,
      Math.min(mascot.maxHeight, unit * mascot.heightFrac));
    // Aspect comes from the real image when we have one, so nothing is ever
    // stretched; the art's native 2:3 is the fallback.
    const ref = this.images.walk || this.images.idle || this.images.wave || this.images.magic;
    const aspect = ref && ref.naturalWidth ? ref.naturalWidth / ref.naturalHeight : 1024 / 1536;
    let mascotW = mascotH * aspect;

    // Measure the wordmark for real rather than guessing: the mascot has to
    // stand clear of it, and a wrong guess means the title sits across the
    // mascot's chest on exactly the narrow phones this app runs on.
    const textSize = starR * this.cfg.text.sizeFrac;
    const family = getComputedStyle(document.body).fontFamily
      || 'ui-rounded, system-ui, sans-serif';
    this.ctx.save();
    this.ctx.font = `700 ${textSize}px ${family}`;
    const textW = this.ctx.measureText(this.cfg.text.value).width;
    this.ctx.restore();

    // Rightmost the mascot may reach before it would touch the wordmark.
    const margin = unit * 0.02;
    const clearRight = logoX - textW / 2 - margin;
    const leftLimit = w * 0.015;

    // If it cannot fit in that gap at full size, scale it down rather than
    // letting it overlap the title or walk off the left edge.
    const available = clearRight - leftLimit;
    if (mascotW > available && available > 0) {
      mascotW = available;
      mascotH = mascotW / aspect;
    }

    const desiredX = logoX - starR * 0.95 - mascotW * 0.42;
    const stopX = Math.max(leftLimit + mascotW / 2,
      Math.min(desiredX, clearRight - mascotW / 2));
    const feetY = Math.min(h - h * 0.04, logoY + starR * 2.15 + mascotH * 0.24);

    this.L = {
      w, h, unit, portrait, starR, logoX, logoY,
      mascotW, mascotH,
      startX: w * mascot.startXFrac,
      stopX,
      feetY,
      textSize,
      textW,
      clearRight,   // mascot's right edge must never pass this
      leftLimit,
    };
  }

  // Mascot box for the wand pose, positioned so the wand's star tip sits just
  // below-left of the logo centre — reading as "the wand points at it".
  _magicPose() {
    const { wandTip } = this.cfg.mascot;
    const L = this.L;
    // Aim at the star's lower-left shoulder rather than dead centre: that keeps
    // the mascot out of the wordmark while still reading as "pointing at it",
    // and the glow streak covers the remaining distance to the centre anyway.
    const targetX = L.logoX - L.starR * 0.62;
    const targetY = L.logoY + L.starR * 0.70;
    const left = targetX - wandTip.x * L.mascotW;
    const top = targetY - wandTip.y * L.mascotH;
    const cx = left + L.mascotW / 2;
    return {
      // Same clearance rule as the standing spot, so switching to the wand
      // pose can never shove the mascot across the title.
      cx: Math.max(L.leftLimit + L.mascotW / 2,
        Math.min(cx, L.clearRight - L.mascotW / 2)),
      feetY: Math.min(L.h - L.h * 0.03, top + L.mascotH),
    };
  }

  _wandTipAt(cx, feetY) {
    const L = this.L;
    const { wandTip } = this.cfg.mascot;
    return {
      x: cx - L.mascotW / 2 + wandTip.x * L.mascotW,
      y: feetY - L.mascotH + wandTip.y * L.mascotH,
    };
  }

  /* ---- interaction ---- */

  _onSkip(e) {
    if (this.finished) return;
    // While gated, the tap's job is to start the show. Unlocking must happen
    // synchronously inside the gesture handler — iOS only honours it there.
    if (this.awaitingTap) {
      this.awaitingTap = false;
      try { audio.unlock(); } catch (err) { /* sound is optional */ }
      this.startTime = performance.now();
      return;
    }
    if (this.skipping) return;
    this.skipping = true;
    this.skipStart = performance.now();
  }

  /* ---- main loop ---- */

  _tick(now) {
    if (this.finished) return;

    if (this.waiting) {
      // Art still downloading: hold on the background, already faded up, so
      // the wait reads as part of the intro instead of a stalled screen.
      this._paintBackground(phase(now - this.mountTime, 0, this.cfg.timing.bgFadeIn));
      if (this.skipping) {
        const p = phase(now, this.skipStart, this.cfg.fade.skipMs);
        if (p >= 1) { this._finish(); return; }
      }
      this.raf = requestAnimationFrame(this._tick);
      return;
    }

    if (this.awaitingTap) {
      this._drawTapGate(now);
      this.raf = requestAnimationFrame(this._tick);
      return;
    }

    const t = now - this.startTime;
    if (this.reduced) this._drawReduced(t);
    else this._draw(t);

    if (!this.finished) this.raf = requestAnimationFrame(this._tick);
  }

  _finish() {
    if (this.finished) return;   // hand off exactly once
    this.finished = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    const done = this.onDone;
    this.destroy();
    if (done) done();
  }

  destroy() {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    this.canvas.removeEventListener('pointerdown', this._onSkip);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }

  // Global alpha for the whole scene: fades in at the start, out at the end,
  // and collapses fast if the child taps to skip.
  _sceneAlpha(t) {
    const T = this.cfg.timing;
    if (this.skipping) {
      const p = phase(performance.now(), this.skipStart, this.cfg.fade.skipMs);
      if (p >= 1) this._finish();
      return 1 - p;
    }
    if (t >= T.holdEnd) {
      const p = phase(t, T.holdEnd, T.fadeOutEnd - T.holdEnd);
      if (p >= 1) this._finish();
      return 1 - p;
    }
    return 1;
  }

  /* ---- waiting for the tap that unlocks sound ---- */

  // Shown only when the browser refused autoplay. The mascot is already on
  // screen waving, with a pulsing ring inviting a tap, so this reads as the
  // opening beat of the story rather than a permission prompt.
  _drawTapGate(now) {
    const ctx = this.ctx, L = this.L;
    const t = now - this.gateTime;

    this._paintBackground(1);
    ctx.save();
    ctx.globalAlpha = easeOutCubic(clamp01(t / 260));

    // A gentle idle rock so the frame is alive while it waits.
    const rock = Math.sin(t / 620) * 1.2 * (Math.PI / 180);
    const bob = Math.abs(Math.sin(t / 620)) * L.mascotH * 0.012;
    this._drawMascot(this.images.wave || this.images.idle || this.images.walk,
      L.stopX, L.feetY - bob, rock);

    // Pulsing tap hint, sitting where the logo is about to appear.
    const cfg = this.cfg.sound;
    const pulse = (t % cfg.hintPulseMs) / cfg.hintPulseMs;
    const r = L.unit * cfg.hintRadiusFrac;
    const hx = L.logoX, hy = L.logoY;

    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.strokeStyle = this.cfg.colors.starFillDeep;
    ctx.globalAlpha *= 1 - easeOutCubic(pulse);
    ctx.beginPath();
    ctx.arc(hx, hy, r * (0.55 + pulse * 0.85), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = easeOutCubic(clamp01(t / 260));
    ctx.fillStyle = this.cfg.colors.starFill;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, r * 0.10);
    ctx.stroke();

    ctx.restore();
  }

  /* ---- reduced motion: the finished scene, calmly ---- */

  _drawReduced(t) {
    const { reducedMotion } = this.cfg;
    const ctx = this.ctx, L = this.L;
    const fadeIn = phase(t, 0, 220);
    let alpha = fadeIn;
    if (this.skipping) {
      const p = phase(performance.now(), this.skipStart, this.cfg.fade.skipMs);
      if (p >= 1) { this._finish(); return; }
      alpha = Math.min(alpha, 1 - p);
    } else if (t >= reducedMotion.holdMs) {
      const p = phase(t, reducedMotion.holdMs, reducedMotion.fadeMs);
      if (p >= 1) { this._finish(); return; }
      alpha = 1 - p;
    }

    // Reduced motion is about movement, not sound: keep a single warm chord so
    // the moment still feels marked rather than silent.
    this._cue('finish', t, 120, () => audio.softFanfare());

    this._paintBackground(1);
    ctx.save();
    ctx.globalAlpha = alpha;
    this._drawMascot(this.images.idle || this.images.wave, L.stopX, L.feetY, 0);
    this._drawLogo({ starScale: 1, faceAlpha: 1, rainbowP: 1, letters: 1, bounce: 0 });
    ctx.restore();
  }

  /* ---- full sequence ---- */

  _draw(t) {
    const T = this.cfg.timing;
    const M = this.cfg.magic;
    const ctx = this.ctx;
    const L = this.L;

    const alpha = this._sceneAlpha(t);
    if (this.finished) return;

    this._sound(t);
    this._paintBackground(phase(t, 0, T.bgFadeIn));

    ctx.save();
    ctx.globalAlpha = alpha;

    const magicT = t - T.waveEnd;          // ms into the magic phase
    const inMagic = t >= T.waveEnd;

    /* --- mascot --- */
    let mascotImg = this.images.walk;
    let cx = L.startX;
    let feetY = L.feetY;
    let tilt = 0;

    if (t < T.walkEnd) {
      // Walk in: eased horizontal glide, gentle bob, very slight rocking.
      const p = easeOutCubic(phase(t, T.bgFadeIn, T.walkEnd - T.bgFadeIn));
      cx = lerp(L.startX, L.stopX, p);
      const swing = Math.sin(p * Math.PI * 2 * this.cfg.mascot.bobCycles);
      // Bob and tilt ease out with the walk so the stop feels settled.
      feetY = L.feetY - Math.abs(swing) * L.mascotH * this.cfg.mascot.bobAmplitude * (1 - p * 0.75);
      tilt = swing * this.cfg.mascot.tiltDegrees * (Math.PI / 180) * (1 - p * 0.7);
      mascotImg = this.images.walk;
    } else if (t < T.waveEnd) {
      // Wave: soft rocking in place.
      const p = phase(t, T.walkEnd, T.waveEnd - T.walkEnd);
      const swing = Math.sin(p * Math.PI * 2 * this.cfg.mascot.waveCycles);
      cx = L.stopX;
      feetY = L.feetY - Math.abs(swing) * L.mascotH * this.cfg.mascot.waveBounce;
      tilt = swing * 1.4 * (Math.PI / 180);
      mascotImg = this.images.wave || this.images.idle;
    } else if (t < T.magicEnd) {
      // Magic: glide into the aiming pose, then hold it steady.
      const pose = this._magicPose();
      const p = easeInOutCubic(phase(magicT, M.pointAt, M.aimDuration));
      cx = lerp(L.stopX, pose.cx, p);
      feetY = lerp(L.feetY, pose.feetY, p);
      mascotImg = this.images.magic || this.images.wave || this.images.idle;
    } else {
      // Settled: back to the idle pose for the hold.
      const pose = this._magicPose();
      cx = pose.cx;
      feetY = pose.feetY;
      mascotImg = this.images.idle || this.images.wave;
    }

    /* --- logo build --- */
    let logoState = null;
    if (inMagic) {
      const starScale = magicT >= M.starAt
        ? easeOutBack(phase(magicT, M.starAt, M.starGrow), 1.9)
        : 0;
      const faceAlpha = magicT >= M.faceAt ? easeOutCubic(phase(magicT, M.faceAt, M.faceGrow)) : 0;
      const rainbowP = magicT >= M.rainbowAt
        ? easeOutCubic(phase(magicT, M.rainbowAt, M.rainbowGrow))
        : 0;
      const letters = magicT >= M.lettersAt ? 1 : 0;
      const bounce = magicT >= M.settleAt
        ? (1 - easeOutElastic(phase(magicT, M.settleAt, M.settleDur))) * this.cfg.bounce.strength
        : 0;
      logoState = { starScale, faceAlpha, rainbowP, letters, magicT, bounce };
    }

    // The glow point and its streak to the logo centre, drawn behind the star.
    if (inMagic && magicT >= M.sparkAt && magicT < M.starAt + M.starGrow) {
      this._drawWandGlow(magicT, cx, feetY);
    }

    // Emit particles once, at the moment of the tap.
    if (inMagic && !this.trailFired && magicT >= M.streakAt) {
      this.trailFired = true;
      const tip = this._wandTipAt(cx, feetY);
      this._emit(tip.x, tip.y, this.cfg.particles.trailCount, 0.7);
    }
    if (inMagic && !this.burstFired && magicT >= M.starAt) {
      this.burstFired = true;
      this._emit(L.logoX, L.logoY, this.cfg.particles.burstCount, 1);
    }

    // Mascot sits behind the logo so the star always reads clearly, but the
    // mascot itself is never covered: they occupy different screen space.
    this._drawMascot(mascotImg, cx, feetY, tilt);

    if (logoState) this._drawLogo(logoState);

    this._updateParticles();
    this._drawParticles();

    ctx.restore();
  }

  /* ---- sound ----
     Best effort by design. The intro starts on a timer, not on a tap, so on a
     cold load there may be no user activation and browsers will keep the audio
     context suspended; every cue is then skipped rather than queued into
     silence. Once the app has activation (installed PWA, or any earlier touch)
     the same cues play normally. */

  _canPlay() {
    return this.cfg.sound.enabled
      && !this.skipping
      && audio.isRunning()
      && !audio.isMuted();
  }

  // Fires `fn` the first time `t` passes `at`, once and only once.
  _cue(name, t, at, fn) {
    if (t < at || this.cued.has(name)) return;
    this.cued.add(name);
    if (!this._canPlay()) return;   // still marked, so it never retries later
    try { fn(); } catch (e) { /* a bad earcon must not stop the animation */ }
  }

  _sound(t) {
    const T = this.cfg.timing;
    const M = this.cfg.magic;
    const S = this.cfg.sound;

    // Footsteps across the walk.
    const walkStart = T.bgFadeIn;
    const walkLen = T.walkEnd - T.bgFadeIn;
    S.stepFractions.forEach((f, i) =>
      this._cue('step' + i, t, walkStart + walkLen * f, () => audio.footstep()));

    this._cue('greet', t, T.walkEnd + S.greetDelay, () => audio.greet());

    const magic = T.waveEnd;
    this._cue('whoosh', t, magic + M.pointAt, () => audio.whoosh());
    this._cue('spark', t, magic + M.streakAt, () => audio.sparkle());
    this._cue('star', t, magic + M.starAt, () => audio.chime());

    S.shimmerNotes.forEach((freq, i) =>
      this._cue('arc' + i, t, magic + M.rainbowAt + i * S.shimmerStagger,
        () => audio.shimmer(freq)));

    this._cue('finish', t, magic + M.settleAt, () => audio.softFanfare());
  }

  /* ---- painters ---- */

  _paintBackground(p) {
    const ctx = this.ctx, L = this.L;
    ctx.clearRect(0, 0, L.w, L.h);
    ctx.save();
    ctx.globalAlpha = clamp01(p);
    ctx.fillStyle = this.cfg.colors.bg;
    ctx.fillRect(0, 0, L.w, L.h);
    ctx.restore();
  }

  _drawMascot(img, cx, feetY, tilt) {
    if (!img) return;   // a failed image simply means no mascot, not a crash
    const ctx = this.ctx, L = this.L;
    const aspect = img.naturalWidth && img.naturalHeight
      ? img.naturalWidth / img.naturalHeight
      : L.mascotW / L.mascotH;
    const h = L.mascotH;
    const w = h * aspect;             // aspect always preserved
    ctx.save();
    ctx.translate(cx, feetY - h / 2);
    if (tilt) ctx.rotate(tilt);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // Glow at the wand tip, then a soft streak reaching toward the logo centre.
  _drawWandGlow(magicT, cx, feetY) {
    const ctx = this.ctx, L = this.L, M = this.cfg.magic;
    const tip = this._wandTipAt(cx, feetY);
    const grow = phase(magicT, M.sparkAt, M.streakAt - M.sparkAt);
    const fade = 1 - phase(magicT, M.starAt, M.starGrow);
    const r = L.starR * 0.20 * easeOutCubic(grow) * Math.max(fade, 0.15);

    ctx.save();
    ctx.globalAlpha = Math.max(fade, 0);

    if (magicT >= M.streakAt) {
      const reach = easeOutCubic(phase(magicT, M.streakAt, M.starAt - M.streakAt));
      const ex = lerp(tip.x, L.logoX, reach);
      const ey = lerp(tip.y, L.logoY, reach);
      const grad = ctx.createLinearGradient(tip.x, tip.y, ex, ey);
      grad.addColorStop(0, 'rgba(255,246,201,0)');
      grad.addColorStop(1, this.cfg.colors.glow);
      ctx.strokeStyle = grad;
      ctx.lineWidth = L.starR * 0.10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, Math.max(r, 1));
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.5, 'rgba(255,226,138,0.55)');
    g.addColorStop(1, 'rgba(255,213,74,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, Math.max(r, 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawLogo({ starScale, faceAlpha, rainbowP, letters, magicT = Infinity, bounce = 0 }) {
    const ctx = this.ctx, L = this.L;
    if (starScale <= 0 && rainbowP <= 0) return;

    ctx.save();
    ctx.translate(L.logoX, L.logoY);
    ctx.scale(1 + bounce, 1 + bounce);   // soft settle of the whole lockup

    if (rainbowP > 0) this._drawRainbow(rainbowP);
    if (starScale > 0) {
      ctx.save();
      ctx.scale(starScale, starScale);
      this._drawStar();
      if (faceAlpha > 0) this._drawFace(faceAlpha);
      ctx.restore();
    }
    if (letters > 0) this._drawText(magicT);

    ctx.restore();
  }

  // Rounded five-point star: filled, then stroked with a round line join so the
  // points read soft rather than sharp, with a white rim for separation.
  _starPath(ctx, R) {
    const inner = R * 0.46;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? R : inner;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  _drawStar() {
    const ctx = this.ctx;
    const R = this.L.starR * 0.86;   // leaves room for the rounding stroke
    const C = this.cfg.colors;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // White rim first, as a fat rounded stroke under the fill.
    this._starPath(ctx, R);
    ctx.strokeStyle = C.starOutline;
    ctx.lineWidth = R * 0.30;
    ctx.stroke();

    const g = ctx.createRadialGradient(-R * 0.22, -R * 0.3, R * 0.06, 0, 0, R * 1.15);
    g.addColorStop(0, C.starFillLight);
    g.addColorStop(0.55, C.starFill);
    g.addColorStop(1, C.starFillDeep);

    this._starPath(ctx, R);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.starFill;
    ctx.lineWidth = R * 0.16;   // rounds the points without changing the shape
    ctx.stroke();
    ctx.restore();
  }

  _drawFace(a) {
    const ctx = this.ctx;
    const R = this.L.starR * 0.86;
    const C = this.cfg.colors;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    const pop = 0.75 + 0.25 * clamp01(a);   // eyes settle in with a tiny pop

    ctx.fillStyle = C.cheek;
    ctx.globalAlpha = clamp01(a) * 0.8;
    ctx.beginPath(); ctx.arc(-R * 0.32, R * 0.10, R * 0.115, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(R * 0.32, R * 0.10, R * 0.115, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = clamp01(a);
    ctx.fillStyle = C.face;
    const eyeR = R * 0.085 * pop;
    ctx.beginPath(); ctx.arc(-R * 0.19, -R * 0.06, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(R * 0.19, -R * 0.06, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-R * 0.16, -R * 0.09, eyeR * 0.33, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(R * 0.22, -R * 0.09, eyeR * 0.33, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = C.face;
    ctx.lineWidth = R * 0.075;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-R * 0.19, R * 0.16);
    ctx.quadraticCurveTo(0, R * 0.34, R * 0.19, R * 0.16);
    ctx.stroke();
    ctx.restore();
  }

  _drawRainbow(p) {
    const ctx = this.ctx;
    const L = this.L;
    const cfg = this.cfg.rainbow;
    const colors = this.cfg.colors.rainbow;
    const base = L.starR * cfg.innerRadiusFrac;

    ctx.save();
    ctx.lineCap = 'round';
    // Arch centre sits below the star so the bands rise behind it. In canvas
    // angles, straight up is 1.5π; each band opens symmetrically from there.
    const cy = L.starR * 0.30;
    const APEX = Math.PI * 1.5;
    for (let i = 0; i < cfg.arcCount; i++) {
      const r = base + i * L.starR * cfg.gapFrac;
      // Bands sweep open from the top outward, staggered so they cascade.
      const local = clamp01((p - i * 0.10) / 0.7);
      if (local <= 0) continue;
      const half = easeOutCubic(local) * (Math.PI * 0.46);
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = L.starR * cfg.thicknessFrac;
      ctx.globalAlpha = clamp01(local);
      ctx.beginPath();
      ctx.arc(0, cy, r, APEX - half, APEX + half);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawText(magicT) {
    const ctx = this.ctx;
    const L = this.L;
    const M = this.cfg.magic;
    const cfg = this.cfg.text;
    const size = L.textSize;
    const y = L.starR * (1.15 + (this.cfg.rainbow.arcCount - 1) * this.cfg.rainbow.gapFrac)
      + L.starR * cfg.gapFrac;

    // Uses the app's own rounded stack (no network font dependency).
    const family = getComputedStyle(document.body).fontFamily
      || 'ui-rounded, system-ui, sans-serif';
    ctx.save();
    ctx.font = `700 ${size}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = [...cfg.value];
    const widths = chars.map(c => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = -total / 2;

    chars.forEach((ch, i) => {
      const w = widths[i];
      const cxx = x + w / 2;
      x += w;
      if (ch === ' ') return;
      const startAt = M.lettersAt + i * M.letterStagger;
      const p = magicT === Infinity ? 1 : phase(magicT, startAt, M.letterPop);
      if (p <= 0) return;
      const e = easeOutBack(p, 2.0);
      ctx.save();
      ctx.globalAlpha = clamp01(p * 1.4);
      // Each letter rises a little as it pops in.
      ctx.translate(cxx, y + (1 - e) * size * cfg.popRise);
      ctx.scale(e, e);
      ctx.fillStyle = this.cfg.colors.text;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  /* ---- particles ---- */

  _emit(x, y, count, power) {
    const cfg = this.cfg.particles;
    const L = this.L;
    const colors = this.cfg.colors.sparkle;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = L.starR * cfg.speedFrac * (0.35 + Math.random() * 0.9) * power;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - L.starR * 0.12,
        born: performance.now(),
        life: cfg.lifeMs * (0.6 + Math.random() * 0.7),
        size: L.starR * cfg.sizeFrac * (0.5 + Math.random()),
        color: colors[(Math.random() * colors.length) | 0],
        star: Math.random() < cfg.starRatio,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 3,
      });
    }
  }

  _updateParticles() {
    const now = performance.now();
    const dt = 1 / 60;
    this.particles = this.particles.filter(p => now - p.born < p.life);
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += this.L.starR * 0.55 * dt;   // a gentle drift downward
      p.vx *= 0.985;
      p.rot += p.spin * dt;
    }
  }

  _drawParticles() {
    const ctx = this.ctx;
    const now = performance.now();
    ctx.save();
    for (const p of this.particles) {
      const age = (now - p.born) / p.life;
      ctx.globalAlpha = clamp01(1 - age) * 0.95;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size * (1 - age * 0.35);
      if (p.star) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 === 0 ? s : s * 0.45;
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }
}
