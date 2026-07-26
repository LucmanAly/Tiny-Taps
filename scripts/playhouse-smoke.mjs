// Deterministic no-browser smoke test for the Play House Canvas lifecycle.
// It supplies the small DOM/Canvas surface the game uses, drives representative
// toddler gestures, and fails on thrown runtime errors or missing feedback.

import assert from 'node:assert/strict';

let clock = 0;
globalThis.performance = { now: () => clock };

const frames = new Map();
let nextFrame = 1;
globalThis.requestAnimationFrame = callback => {
  const id = nextFrame++;
  frames.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = id => frames.delete(id);

function context2d() {
  const data = new Uint8ClampedArray(96 * 96 * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return new Proxy({
    getImageData: () => ({ data }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 30 }),
  }, {
    get(target, key) {
      if (key in target) return target[key];
      target[key] = () => {};
      return target[key];
    },
  });
}

class MockCanvas {
  constructor() {
    this.clientWidth = 1180;
    this.clientHeight = 820;
    this.width = 1180;
    this.height = 820;
    this.style = {};
    this.className = '';
    this.listeners = new Map();
    this.ctx = context2d();
  }

  getContext() { return this.ctx; }
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  addEventListener(type, fn) { this.listeners.set(type, fn); }
  removeEventListener(type) { this.listeners.delete(type); }
  setPointerCapture() {}
  releasePointerCapture() {}

  dispatch(type, x, y, pointerId = 1) {
    const fn = this.listeners.get(type);
    if (fn) fn({ clientX: x, clientY: y, pointerId });
  }
}

let gameCanvas = null;
globalThis.document = {
  createElement(tag) {
    const element = new MockCanvas();
    if (tag === 'canvas' && !gameCanvas) gameCanvas = element;
    return element;
  },
};

class MockImage {
  constructor() {
    this.naturalWidth = 512;
    this.naturalHeight = 512;
    this.decoding = '';
    this.onload = null;
    this.onerror = null;
  }

  set src(value) {
    this._src = value;
    queueMicrotask(() => this.onload?.());
  }

  get src() { return this._src; }
}
globalThis.Image = MockImage;

const windowListeners = new Map();
globalThis.window = {
  devicePixelRatio: 1,
  addEventListener(type, fn) { windowListeners.set(type, fn); },
  removeEventListener(type) { windowListeners.delete(type); },
};
globalThis.screen = {
  orientation: {
    lock: () => Promise.resolve(),
    unlock() {},
  },
};

const audioCalls = [];
const audio = new Proxy({}, {
  get(target, key) {
    if (!(key in target)) {
      target[key] = (...args) => {
        audioCalls.push([key, ...args]);
        return key === 'tryResume';
      };
    }
    return target[key];
  },
});

const stage = {
  clientWidth: 1180,
  clientHeight: 820,
  appendChild(node) {
    gameCanvas = node;
  },
};

const { default: playhouse, playhouseLayout } = await import('../js/games/playhouse.js');

for (const [width, height] of [[844, 390], [1180, 820], [1366, 1024]]) {
  const layout = playhouseLayout(width, height);
  const cotLeft = width * 0.675 - layout.cotW / 2;
  const tramRight = layout.tram.x + layout.tram.w;
  assert.ok(layout.bed.x + layout.bed.w < layout.wardrobe.x, `bed gap exists at ${width}x${height}`);
  assert.ok(layout.wardrobe.x + layout.wardrobe.w < cotLeft, `cot gap exists at ${width}x${height}`);
  assert.ok(tramRight < layout.bin.x, `trampoline/bin gap exists at ${width}x${height}`);
  const outdoorHouseSliver = layout.house.right - width * layout.cameraMax;
  assert.ok(outdoorHouseSliver >= width * 0.10 && outdoorHouseSliver <= width * 0.15,
    `outdoor house sliver stays between 10% and 15% at ${width}x${height}`);
}

const cleanup = playhouse.start({
  stage,
  audio,
  speech: {},
  setReprompt() {},
});

await new Promise(resolve => setTimeout(resolve, 0));
assert.ok(gameCanvas, 'game creates a canvas');

function runFrame(time) {
  clock = time;
  const pending = [...frames.entries()];
  frames.clear();
  assert.ok(pending.length, `animation frame exists at ${time}ms`);
  pending.at(-1)[1](time);
}

runFrame(0);

// Weather tap.
gameCanvas.dispatch('pointerdown', 340, 90, 1);
runFrame(50);

// Push the cot from the indoor rest to the yard.
gameCanvas.dispatch('pointerdown', 725, 625, 2);
gameCanvas.dispatch('pointermove', 850, 625, 2);
gameCanvas.dispatch('pointerup', 850, 625, 2);
for (let t = 150; t <= 2200; t += 100) runFrame(t);

// Drag the teddy from the outdoor bin directly to the baby.
gameCanvas.dispatch('pointerdown', 938, 652, 3);
gameCanvas.dispatch('pointermove', 443, 613, 3);
gameCanvas.dispatch('pointerup', 443, 613, 3);
runFrame(2300);

// Send the brother to the trampoline and let all three bounces finish.
gameCanvas.dispatch('pointerdown', 856, 650, 4);
for (let t = 2400; t <= 7000; t += 100) runFrame(t);

// Resize through the portrait gate and back to a tablet landscape.
gameCanvas.clientWidth = 820;
gameCanvas.clientHeight = 1180;
stage.clientWidth = 820;
stage.clientHeight = 1180;
windowListeners.get('resize')?.();
runFrame(7100);
gameCanvas.clientWidth = 1180;
gameCanvas.clientHeight = 820;
stage.clientWidth = 1180;
stage.clientHeight = 820;
windowListeners.get('resize')?.();
runFrame(7200);

// Visit every remaining weather state, allow snow to settle, then thaw it.
gameCanvas.dispatch('pointerdown', 340, 90, 5); // rainy -> windy
runFrame(7250);
gameCanvas.dispatch('pointerdown', 340, 90, 6); // windy -> snowy
runFrame(7300);
for (let t = 7400; t <= 11600; t += 100) runFrame(t);
gameCanvas.dispatch('pointerdown', 340, 90, 7); // snowy -> sunny
for (let t = 11700; t <= 14500; t += 100) runFrame(t);

// Forty fast, deterministic toddler taps must all be safely acknowledged.
for (let i = 0; i < 40; i++) {
  const x = 45 + (i * 97) % 1090;
  const pointerId = 20 + i;
  gameCanvas.dispatch('pointerdown', x, 760, pointerId);
  gameCanvas.dispatch('pointerup', x, 760, pointerId);
  runFrame(14525 + i * 25);
}

cleanup();

const called = name => audioCalls.some(([entry]) => entry === name);
const weatherBeds = audioCalls
  .filter(([entry]) => entry === 'setWeatherBed')
  .map(([, value]) => value);
assert.ok(called('pop'), 'weather and taps acknowledge input');
assert.ok(called('whoosh'), 'cot movement starts');
assert.ok(called('gentleGift'), 'toy sharing produces feedback');
assert.ok(called('boing'), 'trampoline bounces run');
assert.ok(called('babyLaugh'), 'baby reacts to outdoor trampoline play');
assert.ok(weatherBeds.includes('rain'), 'rain ambience is selected');
assert.ok(weatherBeds.includes('wind'), 'wind ambience is selected');
assert.ok(weatherBeds.includes(null), 'snow and sunny weather clear the ambience bed');
assert.ok(called('stopWeatherBed'), 'cleanup stops ambient audio');
assert.equal(frames.size, 0, 'cleanup cancels the animation frame');

console.log(`Play House smoke passed with ${audioCalls.length} audio/feedback events.`);
