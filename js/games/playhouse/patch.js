// Play House: the vegetable patch at the far end of the garden.
//
// A little stand of seed packets, a raised bed of four plots, a watering
// can and a harvest basket. A packet dragged onto the soil (or tapped, then
// the soil tapped, or tapped twice) plants its seeds; tapping bare soil
// plants something too. Plants grow only with water and daylight: rain
// waters the whole bed, the watering can pours where it is held (or, tapped,
// flies to the thirstiest plant). Nothing grows at night, but watered plants
// shoot up a stage at sunrise. A ripe plant is picked with a tap: the
// brother comes over (from anywhere) to pull it up or pick it up, and
// carries it to his sister, who eats it, waves the flower or pats the
// pumpkin; if she is busy it goes into the basket. Bees and butterflies
// visit the flowers on sunny days. The plots and the basket belong to the
// playing child.

import { PLACES, depthAt, clampToFloor, floorFor, roomAt } from './layout.js';
import { TOYS } from './props.js';
import { BEE } from './assets.js';
import { childKey } from '../../engine/children.js';
import { quietMotion } from '../../engine/calm.js';

const LS_GARDEN = 'tinytaps-playhouse-garden';
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => 1 - Math.pow(1 - t, 3);
const rand = (a, b) => a + Math.random() * (b - a);

// `tall` is the grown plant's height in world units. Each crop's single
// spoken word is its toy's word.
export const CROPS = {
  carrot: { color: '#f39237', tall: 100 },
  tomato: { color: '#ef5b4f', tall: 176 },
  strawberry: { color: '#f2545b', tall: 66 },
  sunflower: { color: '#ffc93c', tall: 250 },
  tulip: { color: '#f2607e', tall: 124 },
  pumpkin: { color: '#f59a3a', tall: 80 },
};
const ORDER = ['carrot', 'tomato', 'strawberry', 'sunflower', 'tulip', 'pumpkin'];
const HEAPABLE = new Set([...ORDER, 'apple']);

const RIPE = 5;            // growth runs from 1 (a seed) to 5 (ready to pick)
const STAGE_SECS = 4.5;    // sunny seconds per stage
const DRINK_SECS = 10;     // a full plot of water lasts this long while growing
const THIRSTY = 0.12;
const MAX_LOOSE = 6;       // picked produce lying about before it is tidied away
const HEAP_MAX = 14;
const CAN_K = 0.8;         // the watering can is drawn at this scale
const INK = 'rgba(107,74,58,0.75)';
const LEAF = ['#7dbd66', '#6aa958', '#91cb78', '#86c46c'];

export function createPatch(W) {
  const { audio, fx } = W;
  const B = PLACES.veg;
  const soilY = B.soilY;

  /* ---------------- saved garden (per child) ---------------- */

  const data = load();
  const plots = B.plots.map((dx, i) => Object.assign({
    i, x: B.x + dx, wob: 0, pop: 0, tug: 0, bob: 0, pulling: false,
  }, data.plots[i]));
  const heap = data.heap;
  const grown = new Set(data.grown);
  let dirty = false;
  let saveAt = 0;

  function load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(childKey(LS_GARDEN)) || 'null'); } catch (e) { /* private mode or bad data */ }
    const fresh = !d || !Array.isArray(d.plots);
    const plots = B.plots.map((_, i) => {
      const p = fresh ? null : d.plots[i];
      const water = clamp(Number(p && p.w) || 0, 0, 1);
      if (!p || !CROPS[p.k]) return { kind: null, g: 0, water };
      return { kind: p.k, g: clamp(Number(p.g) || 1, 1, RIPE), water };
    });
    if (fresh) {
      // A first visit finds a strawberry nearly ready and a carrot coming up,
      // so the patch shows what it is for straight away.
      Object.assign(plots[1], { kind: 'strawberry', g: 4.7, water: 0.6 });
      Object.assign(plots[2], { kind: 'carrot', g: 2.4, water: 0.4 });
    } else if (d.at) {
      // Watered plants carry on growing while nobody is looking, at half
      // pace, until their water runs out.
      const away = clamp((Date.now() - d.at) / 1000, 0, 86400) * 0.5;
      for (const p of plots) {
        if (!p.kind || p.g >= RIPE || p.water <= 0) continue;
        const secs = Math.min(away, p.water * DRINK_SECS);
        p.g = Math.min(RIPE, p.g + secs / STAGE_SECS);
        p.water = Math.max(0, p.water - secs / DRINK_SECS);
      }
    }
    const heap = !fresh && Array.isArray(d.heap) ? d.heap.filter(k => HEAPABLE.has(k)).slice(-HEAP_MAX) : [];
    const grown = !fresh && Array.isArray(d.grown) ? d.grown.filter(k => CROPS[k]) : [];
    return { plots, heap, grown };
  }

  function save() {
    dirty = false;
    saveAt = W.t + 6;
    const round = v => Math.round(v * 100) / 100;
    try {
      localStorage.setItem(childKey(LS_GARDEN), JSON.stringify({
        v: 1,
        at: Date.now(),
        plots: plots.map(p => (p.kind ? { k: p.kind, g: round(p.g), w: round(p.water) } : { w: round(p.water) })),
        heap,
        grown: [...grown],
      }));
    } catch (e) { /* storage full or blocked */ }
  }
  W.on('destroy', save);

  /* ---------------- plants ---------------- */

  // How much of its grown height a plant has reached.
  function grownK(g) {
    if (g < 2) return 0;
    if (g < 3) return lerp(0.12, 0.3, g - 2);
    if (g < 4) return lerp(0.42, 0.72, g - 3);
    if (g < RIPE) return lerp(0.8, 0.96, g - 4);
    return 1;
  }
  function plantHeight(p) {
    if (!p.kind) return 0;
    if (p.g < 2) return 24;
    if (p.g < 3) return 44 * (grownK(p.g) / 0.3);
    return CROPS[p.kind].tall * grownK(p.g);
  }

  function leaf(g, x, y, len, ang, wid, col) {
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.5, -wid, len, 0);
    g.quadraticCurveTo(len * 0.5, wid, 0, 0);
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 2.5;
    g.stroke();
    g.beginPath();
    g.moveTo(len * 0.12, 0);
    g.lineTo(len * 0.8, 0);
    g.strokeStyle = 'rgba(60,100,40,0.45)';
    g.lineWidth = 2;
    g.stroke();
    g.restore();
  }

  function stem(g, x0, y0, x1, y1, bend, w, col = '#5f9d4f') {
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1);
    g.lineCap = 'round';
    g.strokeStyle = INK;
    g.lineWidth = w + 3;
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = w;
    g.stroke();
  }

  function blob(g, x, y, r, fill, stroke = INK) {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
    g.strokeStyle = stroke;
    g.lineWidth = 2.5;
    g.stroke();
  }

  // A produce sprite `h` tall standing at (x, y).
  function fruit(g, kind, x, y, h, rot = 0) {
    const sp = W.sprites[kind];
    if (!sp) return;
    const k = h / sp.vb[3];
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(k, k);
    W.blit(g, sp);
    g.restore();
  }

  function flowerHead(g, x, y, r, petal, centre) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      blob(g, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, petal, 'rgba(107,74,58,0.4)');
    }
    blob(g, x, y, r * 0.6, centre, 'rgba(107,74,58,0.4)');
  }

  // Each crop drawn at its grown size with its root at (0, 0). `stage` is
  // 3 (leafy), 4 (budding, green fruit) or 5 (ripe).
  const DRAW = {
    carrot(g, stage) {
      if (stage >= RIPE) {
        g.beginPath();
        g.ellipse(0, 4, 19, 14, 0, Math.PI, 0);
        g.fillStyle = '#f39237';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2.5;
        g.stroke();
      }
      const fronds = [[-2.15, 64], [-1.86, 82], [-1.57, 96], [-1.28, 82], [-0.99, 64]];
      fronds.forEach(([a, len], i) => {
        const tx = Math.cos(a) * len, ty = Math.sin(a) * len - 4;
        stem(g, 0, -4, tx, ty, i % 2 ? 6 : -6, 4, '#6aa958');
        for (let k = 1; k <= 3; k++) {
          const f = 0.3 + k * 0.2;
          const lx = tx * f, ly = -4 + (ty + 4) * f;
          leaf(g, lx, ly, 18 - k * 2, a - 0.9, 6, LEAF[(i + k) % 4]);
          leaf(g, lx, ly, 18 - k * 2, a + 0.9, 6, LEAF[(i + k + 1) % 4]);
        }
      });
    },
    tomato(g, stage) {
      // A cane to climb, a zigzag vine, and the tomatoes.
      g.fillStyle = '#c99a63';
      g.strokeStyle = INK;
      g.lineWidth = 2.5;
      g.beginPath();
      g.rect(18, -176, 8, 180);
      g.fill();
      g.stroke();
      stem(g, 0, 0, 8, -166, 26, 6);
      const leaves = [[-26, -1], [-52, 1], [-80, -1], [-106, 1], [-132, -1], [-156, 1]];
      leaves.forEach(([y, s], i) => leaf(g, 4 + s * 2, y, 46 - i * 2, s < 0 ? -2.6 : -0.5, 13, LEAF[i % 4]));
      if (stage < 4) return;
      const spots = [[-26, -64], [34, -98], [-18, -128]];
      for (const [x, y] of spots) {
        if (stage >= RIPE) fruit(g, 'tomato', x, y + 20, 38);
        else blob(g, x, y, 10, '#a7d97a');
      }
    },
    strawberry(g, stage) {
      const stems = [-2.45, -2.0, -1.57, -1.14, -0.7];
      stems.forEach((a, i) => {
        const len = i === 2 ? 52 : 42;
        const tx = Math.cos(a) * len, ty = Math.sin(a) * len;
        stem(g, 0, 0, tx, ty, 0, 3);
        for (let k = -1; k <= 1; k++) blob(g, tx + Math.cos(a + k * 0.9) * 11, ty + Math.sin(a + k * 0.9) * 11, 10, LEAF[(i + k + 4) % 4]);
      });
      if (stage < 4) return;
      const spots = [[-40, -4], [40, -6], [8, 0]];
      for (const [x, y] of spots) {
        if (stage >= RIPE) fruit(g, 'strawberry', x, y + 6, 34, x * 0.004);
        else flowerHead(g, x, y - 16, 6, '#ffffff', '#ffd23f');
      }
    },
    pumpkin(g, stage) {
      g.beginPath();
      g.moveTo(-60, -6);
      g.bezierCurveTo(-30, -20, 20, 6, 62, -10);
      g.strokeStyle = '#5f9d4f';
      g.lineWidth = 5;
      g.stroke();
      g.beginPath();
      g.arc(54, -22, 7, 0, Math.PI * 1.6);
      g.lineWidth = 3;
      g.stroke();
      for (const [x, y, r, i] of [[-36, -30, 23, 0], [30, -34, 24, 1], [-2, -50, 26, 2]]) {
        stem(g, x * 0.6, -6, x, y + r * 0.6, 0, 3);
        blob(g, x, y, r, LEAF[i]);
        g.beginPath();
        g.moveTo(x, y + r * 0.7);
        g.lineTo(x, y - r * 0.5);
        g.moveTo(x, y);
        g.lineTo(x - r * 0.5, y - r * 0.4);
        g.moveTo(x, y);
        g.lineTo(x + r * 0.5, y - r * 0.4);
        g.strokeStyle = 'rgba(60,100,40,0.45)';
        g.lineWidth = 2;
        g.stroke();
      }
      if (stage >= RIPE) fruit(g, 'pumpkin', 6, 8, 74);
      else if (stage >= 4) {
        g.beginPath();
        g.ellipse(8, -12, 18, 14, 0, 0, Math.PI * 2);
        g.fillStyle = '#a7d97a';
        g.fill();
        g.strokeStyle = INK;
        g.lineWidth = 2.5;
        g.stroke();
      }
    },
    sunflower(g, stage, night) {
      stem(g, 0, 0, 2, -222, 10, 8);
      [[-42, 1], [-82, -1], [-122, 1], [-160, -1]].forEach(([y, s], i) => leaf(g, 1, y, 52 - i * 4, s > 0 ? -0.45 : -2.7, 17, LEAF[i % 4]));
      g.save();
      g.translate(2, -228);
      if (stage < RIPE) {
        // A green bud.
        for (let i = 0; i < 6; i++) leaf(g, 0, 0, 22, -Math.PI / 2 + (i - 2.5) * 0.45, 7, '#7dbd66');
        blob(g, 0, -6, 15, '#91cb78');
      } else {
        // Asleep at night: the head nods and the petals fold in.
        if (night) g.rotate(0.55);
        const n = 14, open = night ? 0.7 : 1;
        for (let i = 0; i < n; i++) {
          g.save();
          g.rotate((i / n) * Math.PI * 2);
          g.beginPath();
          g.ellipse(0, -31 * open, 9, 17 * open, 0, 0, Math.PI * 2);
          g.fillStyle = i % 2 ? '#ffd23f' : '#ffc61a';
          g.fill();
          g.strokeStyle = 'rgba(107,74,58,0.5)';
          g.lineWidth = 2;
          g.stroke();
          g.restore();
        }
        blob(g, 0, 0, 20, '#8a5a2b');
        g.fillStyle = '#5c3a1a';
        for (const [x, y] of [[-7, -6], [6, -4], [-1, 6], [8, 7], [-9, 5]]) {
          g.beginPath();
          g.arc(x, y, 2.6, 0, Math.PI * 2);
          g.fill();
        }
      }
      g.restore();
    },
    tulip(g, stage, night) {
      stem(g, 0, 0, 0, -100, -6, 6);
      leaf(g, 0, -4, 74, -1.95, 15, LEAF[0]);
      leaf(g, 1, -8, 58, -1.15, 13, LEAF[2]);
      g.save();
      g.translate(0, -100);
      const ripe = stage >= RIPE;
      g.beginPath();
      if (ripe && !night) {
        // Open: a cup with three petal points.
        g.moveTo(-22, -28);
        g.bezierCurveTo(-24, -8, -14, 2, 0, 2);
        g.bezierCurveTo(14, 2, 24, -8, 22, -28);
        g.lineTo(12, -18); g.lineTo(6, -36); g.lineTo(0, -20); g.lineTo(-6, -36); g.lineTo(-12, -18);
        g.closePath();
      } else {
        g.ellipse(0, -14, ripe ? 15 : 12, ripe ? 20 : 17, 0, 0, Math.PI * 2);
      }
      g.fillStyle = ripe ? '#f2607e' : '#c9d98a';
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2.5;
      g.stroke();
      g.restore();
    },
  };

  function drawSprout(g, k) {
    const s = k / 0.3;
    g.save();
    g.scale(s, s);
    stem(g, 0, 0, 0, -34, 4, 4);
    leaf(g, 0, -32, 22, -2.6, 9, '#91cb78');
    leaf(g, 0, -32, 22, -0.55, 9, '#7dbd66');
    g.restore();
  }

  function drawPlant(g, p) {
    if (!p.kind) return;
    const night = W.dayT > 0.5;
    const stage = Math.floor(p.g);
    const thirsty = p.water < THIRSTY && p.g < RIPE && p.g >= 2;
    g.save();
    g.translate(p.x, soilY + 2);
    let rot = Math.sin(W.t * 1.3 + p.i * 1.7) * 0.025 + Math.sin(p.wob * 18) * 0.12 * p.wob;
    if (thirsty) rot += p.i % 2 ? 0.12 : -0.12;
    let sy = 1 + Math.sin(p.pop * Math.PI) * 0.22;
    if (p.tug > 0) {
      sy += Math.abs(Math.sin(p.tug * 20)) * 0.14;
      rot += Math.sin(p.tug * 34) * 0.07;
    }
    if (thirsty) sy *= 0.9;
    g.rotate(rot);
    g.scale(1 / Math.sqrt(sy), sy);
    if (stage >= 3) {
      const k = grownK(p.g);
      g.save();
      g.scale(k, k);
      DRAW[p.kind](g, stage, night);
      g.restore();
    } else if (stage === 2) {
      drawSprout(g, grownK(p.g));
    }
    if (W.sky.snow > 0.05 && p.g >= 2) {
      g.globalAlpha = W.sky.snow;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.ellipse(0, -plantHeight(p) + 6, 16 + plantHeight(p) * 0.08, 7, 0, Math.PI, 0);
      g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  // The little stick with a picture of what was planted, until it shows.
  function drawMarker(g, p) {
    const a = p.g < 3.6 ? 1 : clamp((4 - p.g) / 0.4, 0, 1);
    if (a <= 0) return;
    const x = p.x + 46, y = soilY + 6;
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = INK;
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 52); g.stroke();
    g.strokeStyle = '#c99a63';
    g.lineWidth = 4;
    g.stroke();
    drawPacket(g, p.kind, x, y - 34, 32, 40, Math.sin(W.t * 1.5 + p.i) * 0.05);
    g.restore();
  }

  function soil(g, p) {
    const w = p.water;
    // Dry soil is pale and dusty; watered soil is dark with a wet sheen.
    const dry = [196, 156, 108], wet = [104, 70, 44];
    const c = dry.map((v, k) => Math.round(lerp(v, wet[k], Math.min(1, w * 1.6))));
    const ry = p.kind ? 15 : 11;
    const cy = soilY + (p.kind ? -1 : 2);
    g.beginPath();
    g.ellipse(p.x, cy, 62, ry, 0, 0, Math.PI * 2);
    g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    g.fill();
    g.strokeStyle = 'rgba(80,50,30,0.45)';
    g.lineWidth = 2.5;
    g.stroke();
    if (p.kind) {
      g.beginPath();
      g.moveTo(p.x - 34, cy - 2);
      g.quadraticCurveTo(p.x, cy - 8, p.x + 34, cy - 2);
      g.strokeStyle = 'rgba(70,40,20,0.35)';
      g.lineWidth = 3;
      g.stroke();
    }
    if (w > 0.25) {
      g.fillStyle = `rgba(255,255,255,${((w - 0.25) * 0.35).toFixed(3)})`;
      g.beginPath();
      g.ellipse(p.x - 18, cy - 4, 18, 3.5, -0.1, 0, Math.PI * 2);
      g.fill();
    }
    if (W.sky.snow > 0.05) {
      g.globalAlpha = W.sky.snow * 0.9;
      g.fillStyle = '#f7fbff';
      g.beginPath();
      g.ellipse(p.x, cy - 2, 60, ry, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
  }

  // A dashed ring on the soil: "this is where it goes".
  function ring(g, p, color) {
    const pulse = 0.85 + Math.sin(W.t * 7) * 0.15;
    g.save();
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.setLineDash([14, 10]);
    g.lineDashOffset = -W.t * 40;
    g.beginPath();
    g.ellipse(p.x, soilY, 70 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  function drawDrop(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.beginPath();
    g.moveTo(0, -22);
    g.bezierCurveTo(10, -8, 16, 0, 16, 7);
    g.arc(0, 7, 16, 0, Math.PI);
    g.bezierCurveTo(-16, 0, -10, -8, 0, -22);
    g.closePath();
    g.fillStyle = '#7cc7f0';
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.ellipse(-5, 4, 4, 6, 0.3, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  /* ---------------- the raised bed ---------------- */

  const bed = {
    x: B.x, y: B.y, z: B.y,
    draw(g) {
      W.blit(g, W.sprites.planterBack, this.x, this.y);
      // The soil between the planks.
      g.beginPath();
      g.moveTo(this.x - 300, this.y - 84);
      g.lineTo(this.x + 300, this.y - 84);
      g.lineTo(this.x + 308, this.y - 50);
      g.lineTo(this.x - 308, this.y - 50);
      g.closePath();
      g.fillStyle = '#8f6844';
      g.fill();
      const glowing = stand.sel && W.t - stand.selAt < 6;
      for (const p of plots) {
        soil(g, p);
        if (!p.kind && (hoverPlot === p || (glowing && !stand.carrying))) ring(g, p, hoverPlot === p ? '#ffc93c' : 'rgba(255,214,90,0.8)');
        if (can.target === p && can.pouring) ring(g, p, 'rgba(120,200,240,0.9)');
      }
      for (const p of plots) drawPlant(g, p);
      for (const p of plots) if (p.kind && p.g < 4) drawMarker(g, p);
      W.blit(g, W.sprites.planterFront, this.x, this.y);
      if (W.sky.snow > 0.05) {
        g.save();
        g.globalAlpha = W.sky.snow;
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.ellipse(this.x, this.y - 56, 310, 7, 0, Math.PI, 0);
        g.fill();
        g.restore();
      }
    },
    drawUI(g) {
      // A water drop over thirsty plants; never at night, when they rest.
      if (W.dayT > 0.5 || W.sky.snow > 0.3) return;
      for (const p of plots) {
        if (!p.kind || p.g >= RIPE || p.water >= THIRSTY || p.g < 1) continue;
        // A big drop bouncing over the plant: "I'm thirsty".
        const bounce = Math.abs(Math.sin(W.t * 3.2 + p.i));
        const y = soilY - Math.max(40, plantHeight(p)) - 58 - bounce * 16 - Math.sin(p.bob * Math.PI) * 30;
        drawDrop(g, p.x, y, 1.4 + p.bob * 0.4 + (1 - bounce) * 0.06);
      }
    },
    hit(x, y) {
      this.picked = plotAt(x, y);
      return !!this.picked;
    },
    tap() { tapPlot(this.picked); },
    update(dt) { stepPlots(dt); tagAlong(); },
    hint() {
      const p = plots.find(q => q.kind && q.g >= RIPE)
        || plots.find(q => q.kind && q.water < THIRSTY)
        || plots[(Math.random() * plots.length) | 0];
      p.wob = 1;
      p.bob = 1;
    },
  };

  function plotAt(x, y) {
    for (const p of plots) {
      if (Math.abs(x - p.x) > 70) continue;
      if (y > soilY - plantHeight(p) - 40 && y < B.y + 14) return p;
    }
    return null;
  }

  // Where a seed packet or produce is being held: the nearest plot, if the
  // finger is over the bed.
  function plotNear(x, y) {
    if (y < soilY - 300 || y > B.y + 60) return null;
    let best = null;
    for (const p of plots) if (Math.abs(x - p.x) < 90 && (!best || Math.abs(x - p.x) < Math.abs(x - best.x))) best = p;
    return best;
  }

  /* ---------------- growing ---------------- */

  let glintAt = 0;
  function stepPlots(dt) {
    const day = W.dayT < 0.5;
    const snowy = W.sky.snow > 0.3;
    const raining = W.sky.weather === 'rain';
    for (const p of plots) {
      p.wob = Math.max(0, p.wob - dt * 1.6);
      p.pop = Math.max(0, p.pop - dt * 2.4);
      p.bob = Math.max(0, p.bob - dt * 1.8);
      if (p.tug > 0) p.tug = Math.max(0, p.tug - dt);
      // Rain falls over the whole garden (see sky.js) and waters every plot.
      if (raining) {
        if (p.water < THIRSTY && p.kind) p.wob = Math.max(p.wob, 0.4);
        p.water = Math.min(1, p.water + dt / 2.2);
        dirty = true;
      }
      if (!p.kind || p.g >= RIPE || !day || snowy || p.water <= 0) continue;
      const rate = raining ? 0.7 : 1;
      const before = Math.floor(p.g);
      p.g = Math.min(RIPE, p.g + dt * rate / STAGE_SECS);
      p.water = Math.max(0, p.water - dt * rate / DRINK_SECS);
      dirty = true;
      if (Math.floor(p.g) > before) grew(p);
      // Sunshine: little golden motes rising from growing plants.
      if (!raining && Math.random() < dt * 1.2 && W.onScreen(p.x) && !quietMotion()) {
        fx.sparkle(p.x + rand(-30, 30), soilY - plantHeight(p) * 0.6, 2, 40, ['#fff3c4', '#ffe066']);
      }
    }
    // Ripe plants glint now and then, inviting a pick.
    if (W.t > glintAt) {
      glintAt = W.t + rand(1.8, 3.2);
      const ripe = plots.filter(p => p.kind && p.g >= RIPE && W.onScreen(p.x));
      if (ripe.length && !quietMotion()) {
        const p = ripe[(Math.random() * ripe.length) | 0];
        fx.sparkle(p.x + rand(-30, 30), soilY - plantHeight(p) * rand(0.3, 0.9), 4, 60, ['#ffffff', '#fff3c4', '#ffd650']);
      }
    }
    if (dirty && W.t > saveAt) save();
  }

  function grew(p) {
    p.pop = 1;
    p.wob = Math.max(p.wob, 0.5);
    const seen = W.onScreen(p.x, 100);
    if (seen) audio.sprout();
    fx.sparkle(p.x, soilY - plantHeight(p) * 0.7, 6, 90, ['#b5e48c', '#fff3c4', '#ffffff']);
    if (p.g >= RIPE) {
      if (seen) setTimeout(() => { if (W.isAlive()) audio.shimmer(1046.5); }, 160);
      fx.sparkle(p.x, soilY - plantHeight(p) * 0.6, 12, 160, ['#ffd650', '#ffffff', CROPS[p.kind].color]);
    }
    save();
  }

  // Overnight, every watered plant grows a stage, one after another as the
  // sun comes up.
  let nightAt = -99;
  W.on('night', () => { nightAt = W.t; });
  W.on('morning', () => {
    if (W.t - nightAt < 2) return;
    let n = 0;
    for (const p of plots) {
      if (!p.kind || p.g >= RIPE || p.water < 0.1) continue;
      setTimeout(() => {
        if (!W.isAlive() || !p.kind || p.g >= RIPE) return;
        p.g = Math.min(RIPE, Math.floor(p.g) + 1);
        p.water = Math.max(0, p.water - 0.35);
        grew(p);
      }, 900 + n++ * 380);
    }
  });

  /* ---------------- planting ---------------- */

  let bag = [];
  function nextKind() {
    const growing = new Set(plots.map(p => p.kind));
    if (!bag.length) bag = ORDER.slice().sort(() => Math.random() - 0.5);
    const i = bag.findIndex(k => !growing.has(k));
    return bag.splice(i < 0 ? 0 : i, 1)[0];
  }

  function plant(p, kind) {
    if (p.kind || !CROPS[kind]) return false;
    p.kind = kind;
    p.g = 1;
    p.wob = 1;
    p.pop = 1;
    p.pulling = false;
    audio.thud();
    setTimeout(() => { if (W.isAlive()) audio.sprout(); }, 120);
    fx.seeds(p.x, soilY - 40, 10);
    fx.sparkle(p.x, soilY - 20, 6, 80, ['#ffffff', '#fff3c4', '#b5e48c']);
    stand.selAt = W.t;
    stand.hop[kind] = 1;
    helpPlant(p);
    save();
    return true;
  }

  function tapPlot(p) {
    if (!p) return;
    if (!p.kind) {
      const kind = stand.sel && W.t - stand.selAt < 30 ? stand.sel : nextKind();
      plant(p, kind);
      return;
    }
    if (p.g >= RIPE) { harvest(p); return; }
    p.wob = 1;
    audio.rustle();
    fx.leaves(p.x, soilY - plantHeight(p) * 0.6, 3, 60);
    if (p.water < THIRSTY && p.g >= 1 && W.sky.weather !== 'rain') {
      // Thirsty: a trail of sparkles leads to the watering can.
      p.bob = 1;
      trail(p.x, soilY - plantHeight(p) - 40, can.x - 30, can.y - can.air - 80);
      setTimeout(() => { if (W.isAlive()) can.hint(); }, 420);
    }
  }

  function trail(x0, y0, x1, y1) {
    for (let i = 1; i <= 8; i++) {
      const k = i / 8;
      setTimeout(() => {
        if (!W.isAlive()) return;
        fx.sparkle(lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(k * Math.PI) * 110, 3, 40);
      }, i * 50);
    }
  }

  /* ---------------- the brother helps ---------------- */

  function boyFree() {
    const b = W.boy;
    return !b.held && !b.carrying && ['idle', 'walk', 'wave', 'magic'].includes(b.state)
      && !['lull', 'visit'].includes(W.baby.state);
  }

  // He kneels in front of a plot, facing it.
  function kneelAt(p, dur, then) {
    const b = W.boy;
    const side = b.x < p.x ? -1 : 1;
    b.walkTo(p.x + side * 100, B.y + 36, () => {
      b.facing = -side;
      b.setState('kneel', dur);
      if (then) then();
    });
  }

  // Wherever he is, he comes over to help with the planting.
  function helpPlant(p) {
    if (!boyFree()) return;
    kneelAt(p, 1.1, () => fx.dust(p.x, soilY + 4, 0));
  }

  // Picked without him: he comes over (from anywhere, even the house), picks
  // it up and takes it on to his sister or the basket.
  function fetch(toy) {
    const b = W.boy;
    if (!boyFree()) return;
    const side = b.x < toy.x ? -1 : 1;
    b.walkTo(toy.x + side * 80, toy.y + 6, () => {
      if (toy.held || toy.hidden || !W.toys.includes(toy) || b.carrying || Math.abs(toy.x - b.x) > 220) return;
      b.facing = -side;
      b.setState('kneel', 0.9);
      setTimeout(() => pickUp(toy, b), 350);
    });
  }

  // He tags along: once the view has rested on the patch for a moment, a
  // brother standing about somewhere else walks over to join in.
  let patchSince = -1;
  let joined = false;
  function tagAlong() {
    const centre = W.cam.x + W.cam.viewW / 2;
    if (centre < S.x - 120) { patchSince = -1; joined = false; return; }
    if (patchSince < 0) patchSince = W.t;
    const b = W.boy;
    if (joined || W.t - patchSince < 3 || b.state !== 'idle' || b.held || b.carrying) return;
    if (Math.abs(b.x - B.x) < 1000) return;
    joined = true;
    // Beside the seed stand on the tree side, out of the way of the plots.
    b.walkTo(S.x - 190, B.y + 70);
  }

  /* ---------------- harvesting ---------------- */

  function harvest(p) {
    if (p.pulling) return;
    p.pulling = true;
    p.tug = 1.4;
    audio.rustle();
    fx.leaves(p.x, soilY - plantHeight(p) * 0.5, 4, 80);
    const b = W.boy;
    const helper = boyFree() && roomAt(b.x) === 'garden' && Math.abs(b.x - p.x) < 1300;
    let done = false;
    const pop = () => {
      if (done || !W.isAlive()) return;
      done = true;
      pull(p);
    };
    if (helper) kneelAt(p, 1.4, () => setTimeout(pop, 380));
    setTimeout(pop, helper ? 2400 : 380);
  }

  function pull(p) {
    const kind = p.kind;
    if (!kind) { p.pulling = false; return; }
    p.kind = null;
    p.g = 0;
    p.pulling = false;
    p.tug = 0;
    p.wob = 1;
    audio.pluck();
    fx.stars(p.x, soilY - 50, 8, 240);
    fx.leaves(p.x, soilY - 30, 4, 90);
    W.say(TOYS[kind].word);
    tidyLoose();

    // Out it pops, landing on the path in front of the bed.
    const b = W.boy;
    const helper = b.state === 'kneel' && !b.held && !b.carrying && Math.abs(b.x - p.x) < 200 ? b : null;
    const land = clampToFloor(helper ? lerp(p.x, b.x, 0.45) : p.x + rand(-30, 30), B.y + 46);
    const toy = W.spawnToy(kind, land.x, land.y);
    toy.air = land.y - soilY + 10;
    toy.vAir = 760;

    // Picking is the point of it all: parent praise and a little fanfare,
    // and confetti the very first time each crop is grown.
    audio.softFanfare();
    W.praise();
    W.recordOutcome(true, 'garden:' + kind);
    if (!grown.has(kind)) {
      grown.add(kind);
      if (!quietMotion()) fx.confetti(p.x, soilY - 160, 30);
    }

    // His sister claps if she is nearby.
    const baby = W.baby;
    if (baby.free() && roomAt(baby.x) === 'garden' && Math.abs(baby.x - p.x) < 750) {
      baby.setState('clap', 1.6);
      baby.facing = p.x > baby.x ? 1 : -1;
      setTimeout(() => { if (W.isAlive()) audio.clapClap(); }, 250);
      setTimeout(() => W.voice.baby('laugh'), 500);
      fx.hearts(baby.x, baby.y - 200, 2);
    }
    if (helper) setTimeout(() => pickUp(toy, helper), 750);
    else setTimeout(() => { if (W.isAlive()) fetch(toy); }, 900);
    save();
  }

  // The brother picks the harvest up and takes it to his sister.
  function pickUp(toy, b) {
    if (!W.isAlive() || toy.held || toy.hidden || !W.toys.includes(toy)) return;
    if (b.held || b.carrying || !['kneel', 'idle'].includes(b.state)) return;
    b.carry(toy);
    deliver(toy);
  }

  function deliver(toy) {
    const b = W.boy, baby = W.baby;
    if (baby.free() && roomAt(baby.x) === 'garden') {
      const side = b.x < baby.x ? -1 : 1;
      const f = floorFor(baby.x);
      b.walkTo(clamp(baby.x + side * 165, f.x0, f.x1), baby.y + 6, () => {
        if (b.carrying !== toy) return;
        b.facing = baby.x > b.x ? 1 : -1;
        b.setState('kneel', 1.3);
        setTimeout(() => {
          if (!W.isAlive() || b.carrying !== toy) return;
          if (baby.free() && Math.abs(baby.x - b.x) < 380) {
            b.carrying = null;
            toy.hidden = false;
            toy.x = baby.x;
            toy.y = baby.y;
            if (W.kids.receive(toy)) {
              fx.hearts((b.x + baby.x) / 2, baby.y - 230, 4);
              return;
            }
            b.carrying = toy;
            toy.hidden = true;
          }
          b.putDown();
        }, 500);
      });
      return;
    }
    // She is busy (or asleep, or indoors): into the basket it goes.
    b.walkTo(basket.x - 150, basket.y - 6, () => {
      if (b.carrying !== toy) return;
      b.facing = 1;
      b.setState('kneel', 1);
      setTimeout(() => {
        if (!W.isAlive() || b.carrying !== toy) return;
        b.carrying = null;
        basket.add(toy);
        // Then out of the way of the can and the basket, back beside the
        // seed stand, unless he has been given something else to do.
        setTimeout(() => {
          if (W.isAlive() && b.state === 'idle' && !b.held && !b.carrying && Math.abs(b.x - basket.x) < 260) {
            b.walkTo(S.x - 190, B.y + 70);
          }
        }, 700);
      }, 450);
    });
  }

  // Picked produce does not pile up on the grass: past a few, the oldest is
  // tidied into the basket.
  function tidyLoose() {
    const loose = W.toys.filter(t => CROPS[t.kind] && !t.hidden && !t.held);
    while (loose.length >= MAX_LOOSE) basket.add(loose.shift(), { quiet: true });
  }

  /* ---------------- the seed stand ---------------- */

  const S = PLACES.seeds;
  const SLOTS = ORDER.map((kind, i) => ({ kind, col: i % 3, row: Math.floor(i / 3) }));
  const PACKET = { w: 62, h: 76 };
  function slotOf(kind) {
    const s = SLOTS.find(q => q.kind === kind);
    return { x: S.x + (s.col - 1) * 70, base: S.y + (s.row === 0 ? -146 : -50) };
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  // A seed packet `w` x `h` with its base at (x, base): a coloured band and
  // a picture of what grows from it.
  function drawPacket(g, kind, x, base, w = PACKET.w, h = PACKET.h, rot = 0, glow = 0) {
    g.save();
    g.translate(x, base - h / 2);
    g.rotate(rot);
    if (glow > 0) {
      g.fillStyle = `rgba(255,214,90,${(0.55 * glow).toFixed(3)})`;
      roundRect(g, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 12);
      g.fill();
    }
    roundRect(g, -w / 2, -h / 2, w, h, Math.min(7, w * 0.12));
    g.fillStyle = '#fff8ec';
    g.fill();
    g.save();
    g.clip();
    g.fillStyle = CROPS[kind].color;
    g.fillRect(-w / 2, -h / 2, w, h * 0.2);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 4; i++) g.fillRect(-w / 2 + w * (0.12 + i * 0.22), -h / 2 + h * 0.06, w * 0.08, h * 0.08);
    g.restore();
    g.strokeStyle = INK;
    g.lineWidth = Math.max(1.5, w * 0.04);
    roundRect(g, -w / 2, -h / 2, w, h, Math.min(7, w * 0.12));
    g.stroke();
    const sp = W.sprites[kind];
    if (sp) {
      const k = Math.min((h * 0.64) / sp.vb[3], (w * 0.84) / sp.vb[2]);
      g.translate(0, h / 2 - h * 0.08);
      g.scale(k, k);
      W.blit(g, sp);
    }
    g.restore();
  }

  const stand = {
    x: S.x, y: S.y, z: S.y, draggable: true, wob: 0,
    sel: null, selAt: -99, picked: null, carrying: null, hold: { x: 0, y: 0 },
    back: null, hop: {},
    draw(g) {
      const sway = Math.sin(this.wob * 16) * 0.02 * this.wob;
      g.save();
      g.translate(this.x, this.y);
      g.rotate(sway);
      g.translate(-this.x, -this.y);
      W.blit(g, W.sprites.standBack, this.x, this.y);
      for (const s of SLOTS) {
        if (this.carrying === s.kind || (this.back && this.back.kind === s.kind)) continue;
        const { x, base } = slotOf(s.kind);
        const hop = this.hop[s.kind] || 0;
        const chosen = this.sel === s.kind && W.t - this.selAt < 6;
        const lift = (chosen ? 18 : 0) + Math.sin(hop * Math.PI) * 26;
        drawPacket(g, s.kind, x, base - lift, PACKET.w, PACKET.h, Math.sin(hop * 14) * 0.08 * hop, chosen ? 0.6 + Math.sin(W.t * 6) * 0.3 : 0);
      }
      W.blit(g, W.sprites.standFront, this.x, this.y);
      if (W.sky.snow > 0.05) {
        g.globalAlpha = W.sky.snow;
        g.strokeStyle = '#ffffff';
        g.lineWidth = 12;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(this.x - 140, this.y - 244);
        g.lineTo(this.x, this.y - 294);
        g.lineTo(this.x + 140, this.y - 244);
        g.stroke();
        g.globalAlpha = 1;
      }
      g.restore();
    },
    hit(x, y) {
      this.picked = null;
      for (const s of SLOTS) {
        const { x: sx, base } = slotOf(s.kind);
        if (Math.abs(x - sx) < PACKET.w / 2 + 5 && y > base - PACKET.h - 22 && y < base + 10) {
          this.picked = s.kind;
          return true;
        }
      }
      return Math.abs(x - this.x) < 140 && y > this.y - 300 && y < this.y + 10;
    },
    press() {
      this.wob = 0.6;
      if (this.picked) this.hop[this.picked] = Math.max(this.hop[this.picked] || 0, 0.35);
    },
    tap() {
      const kind = this.picked || nextKind();
      // Tapped again: the seeds fly into the next empty plot by themselves.
      if (this.sel === kind && W.t - this.selAt < 10) {
        const p = plots.find(q => !q.kind && !flights.some(f => f.p === q));
        if (p) { throwSeeds(kind, p); return; }
      }
      this.sel = kind;
      this.selAt = W.t;
      this.hop[kind] = 1;
      audio.rattleShake();
      W.say(TOYS[kind].word);
      const { x, base } = slotOf(kind);
      fx.sparkle(x, base - PACKET.h, 6, 80, ['#ffffff', '#fff3c4', CROPS[kind].color]);
    },
    grab(x, y) {
      if (!this.picked) return;
      this.carrying = this.picked;
      this.sel = this.picked;
      this.selAt = W.t;
      this.hold = { x, y };
      audio.rattleShake();
    },
    drag(x, y) {
      if (!this.carrying) return;
      this.hold = { x, y };
      const p = plotNear(x, y + 30);
      hoverPlot = p && !p.kind ? p : null;
    },
    drop(x, y) {
      const kind = this.carrying;
      this.carrying = null;
      hoverPlot = null;
      if (!kind) return;
      const p = plotNear(x, y + 30);
      if (p && !p.kind) {
        fx.seeds(x, y + 20, 12);
        plant(p, kind);
        W.say(TOYS[kind].word);
      } else {
        audio.whoosh();
      }
      this.back = { kind, x, y, t0: W.t };
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      for (const k of Object.keys(this.hop)) this.hop[k] = Math.max(0, this.hop[k] - dt * 2.2);
      if (this.back && W.t - this.back.t0 > 0.38) this.back = null;
    },
    hint() { this.hop[ORDER[(Math.random() * ORDER.length) | 0]] = 1; },
  };
  let hoverPlot = null;

  // Seeds tossed from the stand in an arc into a plot.
  const flights = [];
  function throwSeeds(kind, p) {
    const { x, base } = slotOf(kind);
    flights.push({ kind, p, x0: x, y0: base - PACKET.h, t0: W.t });
    stand.hop[kind] = 1;
    audio.rattleShake();
    W.say(TOYS[kind].word);
  }

  /* ---------------- the watering can ---------------- */

  const C0 = PLACES.can;
  // Points on the can, from the middle of its base, unscaled.
  const GRIP = { x: 5, y: -124 };
  const SPOUT = { x: -118, y: -96 };
  const TILT = -0.62;

  const can = {
    x: C0.x, y: C0.y, air: 0, vAir: 0, wob: 0, tilt: 0,
    draggable: true, held: false, hold: { x: 0, y: 0 },
    auto: null, target: null, pouring: false, dripAcc: 0, trickleAt: 0, sayAt: -99,
    get z() { return this.held || this.auto ? 2500 : this.y; },
    get layer() { return this.held || this.auto ? 'front' : 'sorted'; },

    // Where the handle is: under the finger while carried.
    gripPos() {
      if (this.held) return { x: this.hold.x, y: this.hold.y + 10 };
      if (this.auto) return this.auto.grip;
      return { x: this.x + GRIP.x * CAN_K, y: this.y - this.air + GRIP.y * CAN_K };
    },
    tipPos() {
      const gp = this.gripPos();
      const dx = (SPOUT.x - GRIP.x) * CAN_K, dy = (SPOUT.y - GRIP.y) * CAN_K;
      const c = Math.cos(this.tilt), s = Math.sin(this.tilt);
      return { x: gp.x + dx * c - dy * s, y: gp.y + dx * s + dy * c };
    },

    draw(g) {
      const sp = W.sprites.wateringCan;
      if (!sp) return;
      if (!this.held && !this.auto) {
        const d = depthAt(this.y);
        const k = 1 / (1 + this.air / 140);
        g.fillStyle = `rgba(70,40,20,${(0.2 * k).toFixed(3)})`;
        g.beginPath(); g.ellipse(this.x, this.y + 2, 70 * k, 13 * k, 0, 0, Math.PI * 2); g.fill();
        g.save();
        g.translate(this.x, this.y - this.air);
        g.rotate(Math.sin(this.wob * 18) * 0.1 * this.wob);
        g.scale(CAN_K * d, CAN_K * d);
        W.blit(g, sp);
        g.restore();
        return;
      }
      const gp = this.gripPos();
      g.save();
      g.translate(gp.x, gp.y);
      g.rotate(this.tilt + Math.sin(this.wob * 18) * 0.06 * this.wob);
      g.translate(-GRIP.x * CAN_K, -GRIP.y * CAN_K);
      g.scale(CAN_K, CAN_K);
      W.blit(g, sp);
      g.restore();
    },
    hit(x, y) {
      if (this.held || this.auto) return false;
      const top = this.y - this.air - 112;
      return x > this.x - 112 && x < this.x + 82 && y > top && y < this.y + 14;
    },
    press() { this.wob = 1; audio.pop(); },
    tap() { autoWater(); },
    grab(x, y) {
      this.held = true;
      this.auto = null;
      this.hold = { x, y };
      this.air = 0;
      this.vAir = 0;
      audio.pop();
    },
    drag(x, y) { this.hold = { x, y }; },
    drop() {
      const gp = this.gripPos();
      this.held = false;
      // Let go over the soil, it finishes watering there first.
      if (this.target) this.auto = { p: this.target, phase: 'pour', t: 0, dur: 1.1, grip: gp };
      else this.settle(gp);
    },
    // Falls from wherever its handle is to the ground below (the path in
    // front of the bed when it was up in the air).
    settle(gp) {
      this.auto = null;
      this.tilt = 0;
      this.target = null;
      this.pouring = false;
      const bx = gp.x - GRIP.x * CAN_K, by = gp.y - GRIP.y * CAN_K;
      const f = floorFor(bx);
      const p = clampToFloor(bx, by >= f.y0 ? by : B.y + 70);
      this.x = p.x;
      this.y = p.y;
      this.air = Math.max(0, p.y - by);
      this.vAir = 0;
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      this.pouring = false;
      if (this.held) {
        // Aimed by where the spout will be once tipped, so tipping it does
        // not move it off the plot again.
        const gp = this.gripPos();
        const aimX = gp.x + tipOffset().x;
        const p = gp.y < B.y + 30 && gp.y > soilY - 480 ? plotNear(aimX, soilY) : null;
        this.target = p && Math.abs(aimX - p.x) < 85 ? p : null;
        this.tilt += ((this.target ? TILT : 0) - this.tilt) * Math.min(1, dt * 8);
        if (this.target && this.tilt < TILT * 0.65) pour(this.target, dt);
      } else if (this.auto) {
        stepAuto(dt);
      } else {
        this.tilt = 0;
        if (this.air > 0 || this.vAir > 0) {
          this.vAir -= 2600 * dt;
          this.air += this.vAir * dt;
          if (this.air <= 0) {
            this.air = 0;
            this.vAir = 0;
            this.wob = 0.6;
            audio.thud();
          }
        }
      }
    },
    hint() { this.wob = 0.9; },
  };

  function pour(p, dt) {
    const tip = can.tipPos();
    can.pouring = true;
    if (p) {
      if (p.water < THIRSTY && p.kind) p.wob = Math.max(p.wob, 0.5);
      p.water = Math.min(1, p.water + dt / 1.1);
      dirty = true;
    }
    const landY = p ? soilY + rand(-6, 6) : clampToFloor(tip.x, can.y).y;
    can.dripAcc += dt * 45;
    while (can.dripAcc > 1) {
      can.dripAcc -= 1;
      fx.drip(tip.x + rand(-9, 9), tip.y + rand(-2, 6), landY, rand(-25, 25));
    }
    if (Math.random() < dt * 5) fx.splash(tip.x + rand(-20, 20), landY, 0.1);
    if (W.t > can.trickleAt) { can.trickleAt = W.t + 0.14; audio.trickle(); }
    if (W.t > can.sayAt) { can.sayAt = W.t + 8; W.say('Water'); }
  }

  // The spout tip relative to the handle once the can is tipped to pour.
  function tipOffset() {
    const dx = (SPOUT.x - GRIP.x) * CAN_K, dy = (SPOUT.y - GRIP.y) * CAN_K;
    const c = Math.cos(TILT), s = Math.sin(TILT);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  }

  // Tapped, the can flies to the thirstiest plant and waters it.
  function autoWater() {
    const planted = plots.filter(p => p.kind && p.g < RIPE);
    const pool = planted.length ? planted : plots;
    const p = pool.reduce((a, b) => (b.water < a.water ? b : a));
    const gp = can.gripPos();
    if (Math.abs(gp.x - p.x) > 1000) {
      // Far from the patch: a little sprinkle where it stands.
      can.auto = { p: null, phase: 'fly', t: 0, dur: 0.8, from: gp, to: { x: gp.x + 20, y: gp.y - 70 }, grip: { ...gp } };
    } else {
      const off = tipOffset();
      const to = { x: p.x - off.x, y: soilY - 150 - off.y };
      can.auto = { p, phase: 'fly', t: 0, dur: 1.5, from: gp, to, grip: { ...gp } };
    }
    audio.whoosh();
  }

  function stepAuto(dt) {
    const a = can.auto;
    a.t += dt;
    if (a.phase === 'fly') {
      const k = ease(Math.min(1, a.t / 0.6));
      a.grip = { x: lerp(a.from.x, a.to.x, k), y: lerp(a.from.y, a.to.y, k) - Math.sin(k * Math.PI) * 90 };
      can.tilt = TILT * k;
      if (a.t >= 0.6) { a.phase = 'pour'; a.t = 0; }
      return;
    }
    can.tilt += (TILT - can.tilt) * Math.min(1, dt * 8);
    can.target = a.p;
    pour(a.p, dt);
    if (a.t >= a.dur) can.settle(a.grip);
  }

  /* ---------------- the harvest basket ---------------- */

  const BK = PLACES.basket;
  // Where things sit in the heap, bottom layer first.
  const HEAP_SPOTS = [
    [-58, -66], [-20, -68], [20, -68], [58, -66],
    [-40, -84], [0, -86], [40, -84],
    [-60, -98], [-20, -102], [20, -102], [60, -98],
    [-36, -116], [6, -120], [44, -114],
  ];
  const basket = {
    x: BK.x, y: BK.y, z: BK.y, wob: 0, bounce: 0, glow: 0, draggable: true, out: null,
    draw(g) {
      const d = depthAt(this.y);
      g.fillStyle = 'rgba(70,40,20,0.2)';
      g.beginPath(); g.ellipse(this.x, this.y + 2, 96 * d, 16 * d, 0, 0, Math.PI * 2); g.fill();
      if (this.glow > 0) {
        g.save();
        g.globalAlpha = this.glow;
        g.strokeStyle = '#ffc93c';
        g.lineWidth = 9;
        g.setLineDash([18, 12]);
        g.lineDashOffset = -W.t * 40;
        g.beginPath(); g.ellipse(this.x, this.y + 4, 130 * d, 24 * d, 0, 0, Math.PI * 2); g.stroke();
        g.restore();
      }
      const sq = Math.sin(this.wob * 16) * 0.06 * this.wob;
      g.save();
      g.translate(this.x, this.y);
      g.scale(d * (1 + sq), d * (1 - sq));
      W.blit(g, W.sprites.basketBack);
      heap.forEach((kind, i) => {
        const [hx, hy] = HEAP_SPOTS[i] || HEAP_SPOTS[HEAP_SPOTS.length - 1];
        const top = i === heap.length - 1 ? Math.sin(this.bounce * Math.PI) * 40 : 0;
        fruit(g, kind, hx, hy + 4 - top, (TOYS[kind] ? TOYS[kind].h : 70) * 0.56, hx * 0.004);
      });
      W.blit(g, W.sprites.basketFront);
      g.restore();
    },
    hit(x, y) { return Math.abs(x - this.x) < 115 && y > this.y - 190 && y < this.y + 16; },
    press() { this.wob = 0.8; },
    tap() {
      if (!heap.length) { audio.rustle(); return; }
      this.bounce = 1;
      audio.pop();
      W.say(TOYS[heap[heap.length - 1]].word);
      fx.sparkle(this.x, this.y - 130, 5, 80);
    },
    // Taking something out: the top of the heap comes away in the hand.
    grab(x, y) {
      const kind = heap.pop();
      if (!kind) return;
      save();
      this.out = W.spawnToy(kind, x, y);
      this.out.grab(x, y);
    },
    drag(x, y) { if (this.out) this.out.drag(x, y); },
    drop(x, y, vx, vy) {
      const t = this.out;
      this.out = null;
      if (t) t.drop(x, y, vx, vy);
    },
    add(toy, { quiet = false } = {}) {
      W.removeToy(toy);
      heap.push(toy.kind);
      while (heap.length > HEAP_MAX) heap.shift();
      save();
      if (quiet) return;
      this.wob = 1;
      this.bounce = 1;
      audio.pop();
      setTimeout(() => { if (W.isAlive()) audio.bell(heap.length); }, 120);
      fx.sparkle(this.x, this.y - 120, 8, 120);
    },
    update(dt) {
      this.wob = Math.max(0, this.wob - dt * 1.6);
      this.bounce = Math.max(0, this.bounce - dt * 2.4);
      // Glows while produce is carried over it.
      const held = W.toys.find(t => t.held && t.spec.produce);
      const over = held && Math.abs(held.hold.x - this.x) < 140 && held.hold.y > this.y - 330 && held.hold.y < this.y + 40;
      this.glow = clamp(this.glow + (over ? 6 : -4) * dt, 0, 1);
    },
    hint() { this.wob = 0.9; this.bounce = heap.length ? 1 : 0; },
  };

  W.dropTargets.push({
    accept(item, x, y) {
      if (!item.spec || !HEAPABLE.has(item.kind)) return false;
      if (Math.abs(x - basket.x) > 140 || y < basket.y - 330 || y > basket.y + 40) return false;
      basket.add(item);
      return true;
    },
  });

  /* ---------------- things in the air ---------------- */

  const overlay = {
    layer: 'front',
    draw(g) {
      // A packet being carried, or flying home to its shelf.
      if (stand.carrying) {
        drawPacket(g, stand.carrying, stand.hold.x, stand.hold.y + PACKET.h * 0.55, PACKET.w * 1.1, PACKET.h * 1.1,
          hoverPlot ? -0.5 + Math.sin(W.t * 18) * 0.1 : Math.sin(W.t * 4) * 0.08, hoverPlot ? 0.7 : 0);
      }
      if (stand.back) {
        const b = stand.back;
        const k = ease(Math.min(1, (W.t - b.t0) / 0.38));
        const { x, base } = slotOf(b.kind);
        drawPacket(g, b.kind, lerp(b.x, x, k), lerp(b.y + PACKET.h * 0.55, base, k) - Math.sin(k * Math.PI) * 60, PACKET.w, PACKET.h, (1 - k) * 0.4);
      }
      // Seeds on their way to a plot.
      for (const f of flights) {
        const k = Math.min(1, (W.t - f.t0) / 0.55);
        g.fillStyle = '#8a5a35';
        for (let i = 0; i < 6; i++) {
          const kk = clamp(k - i * 0.04, 0, 1);
          const x = lerp(f.x0, f.p.x, kk) + (i - 2.5) * 6;
          const y = lerp(f.y0, soilY - 10, kk) - Math.sin(kk * Math.PI) * 150 + (i % 2) * 5;
          g.beginPath(); g.ellipse(x, y, 4, 5.5, i, 0, Math.PI * 2); g.fill();
        }
      }
    },
    update() {
      for (let i = flights.length - 1; i >= 0; i--) {
        const f = flights[i];
        if (W.t - f.t0 < 0.6) continue;
        flights.splice(i, 1);
        if (!plant(f.p, f.kind)) fx.seeds(f.p.x, soilY - 20, 6);
      }
    },
  };

  /* ---------------- bees and butterflies ----------------
     On sunny days they come to the open flowers in the bed (a ripe
     sunflower or tulip, the strawberry's white blossoms), settle a while,
     visit another flower or flutter off. Tapped, they fly away: the bee
     with its real buzz. */

  const MAX_VISITORS = 2;
  const visitors = [];
  let visitAt = 3;

  // The open flowers on a plant, as points to land on.
  function bloomsOf(p) {
    if (!p.kind || p.pulling) return [];
    const k = grownK(p.g);
    const y0 = soilY + 2;
    if (p.kind === 'sunflower' && p.g >= RIPE) return [{ x: p.x + 2, y: y0 - 240 * k }];
    if (p.kind === 'tulip' && p.g >= RIPE) return [{ x: p.x, y: y0 - 132 * k }];
    if (p.kind === 'strawberry' && Math.floor(p.g) === 4) return [[-40, -26], [40, -28], [8, -22]].map(([dx, dy]) => ({ x: p.x + dx * k, y: y0 + dy * k }));
    return [];
  }

  const sunny = () => W.dayT < 0.3 && W.sky.weather === 'clear' && W.sky.snow < 0.1;
  const taken = (p, i) => visitors.some(v => v.state !== 'leave' && v.p === p && v.i === i);

  function freeBlooms() {
    const out = [];
    for (const p of plots) {
      bloomsOf(p).forEach((b, i) => { if (!taken(p, i) && W.onScreen(b.x, -40)) out.push({ p, i, ...b }); });
    }
    return out;
  }

  function makeVisitor(spot) {
    const cam = W.cam;
    const fromLeft = Math.random() < 0.5;
    const kind = spot.p.kind === 'sunflower' ? (Math.random() < 0.7 ? 'bee' : 'butterfly')
      : spot.p.kind === 'tulip' ? (Math.random() < 0.7 ? 'butterfly' : 'bee')
        : (Math.random() < 0.5 ? 'bee' : 'butterfly');
    const v = {
      kind, p: spot.p, i: spot.i, state: 'arrive', t: 0, flap: rand(0, 6),
      from: { x: fromLeft ? cam.x - 60 : cam.x + cam.viewW + 60, y: soilY - rand(380, 520) },
      x: 0, y: 0, face: fromLeft ? 1 : -1, stay: rand(4, 8), vx: 0, vy: 0,
      get z() { return B.y + 1; },
      draw(g) { drawVisitor(g, this); },
      hit(x, y) { return this.state !== 'leave' && Math.hypot(x - this.x, y - this.y) < 60; },
      tap() { shoo(this, true); },
      update(dt) { stepVisitor(this, dt); },
      hint() { this.flap += 2; },
    };
    v.x = v.from.x;
    v.y = v.from.y;
    visitors.push(v);
    W.add(v);
  }

  function shoo(v, tapped) {
    if (v.state === 'leave') return;
    v.state = 'leave';
    v.t = 0;
    v.vx = v.face * rand(240, 320);
    v.vy = -rand(220, 300);
    if (!tapped) return;
    fx.sparkle(v.x, v.y, 6, 90, ['#ffffff', '#fff3c4', '#ffd6f0']);
    if (v.kind === 'bee') {
      if (BEE) W.sky.playAnimal(BEE);
      W.say('Bee');
    } else {
      audio.shimmer(1318.5);
      setTimeout(() => { if (W.isAlive()) audio.shimmer(1568); }, 110);
      W.say('Butterfly');
    }
  }

  function stepVisitor(v, dt) {
    v.t += dt;
    const spot = bloomsOf(v.p)[v.i];
    if (v.state !== 'leave' && (!spot || !sunny())) shoo(v, false);
    if (v.state === 'arrive') {
      const k = Math.min(1, v.t / 1.9);
      const e = ease(k);
      v.x = lerp(v.from.x, spot.x, e) + Math.sin(v.t * 5) * 26 * (1 - k);
      v.y = lerp(v.from.y, spot.y - 14, e) + Math.sin(v.t * 7) * 22 * (1 - k);
      v.face = spot.x >= v.x ? 1 : -1;
      if (k >= 1) { v.state = 'sit'; v.t = 0; }
    } else if (v.state === 'sit') {
      v.x = spot.x;
      v.y = spot.y - 14 + Math.sin(v.t * 2.4) * 2;
      if (v.t > v.stay) {
        // On to another flower, or away.
        const next = freeBlooms().filter(b => b.p !== v.p || b.i !== v.i);
        if (next.length && Math.random() < 0.6) {
          const n = next[(Math.random() * next.length) | 0];
          v.from = { x: v.x, y: v.y };
          v.p = n.p;
          v.i = n.i;
          v.state = 'arrive';
          v.t = 0;
          v.stay = rand(4, 8);
        } else shoo(v, false);
      }
    } else {
      v.x += (v.vx + Math.sin(v.t * 6) * 60) * dt;
      v.y += v.vy * dt;
      if (!W.onScreen(v.x, 120) || v.y < W.cam.top - 120) {
        visitors.splice(visitors.indexOf(v), 1);
        W.remove(v);
      }
    }
  }

  function drawVisitor(g, v) {
    const img = W.img[v.kind === 'bee' ? 'animal_bee' : 'animal_butterfly'];
    if (!img) return;
    const h = v.kind === 'bee' ? 54 : 62;
    const w = h * img.naturalWidth / img.naturalHeight;
    const sitting = v.state === 'sit';
    g.save();
    g.translate(v.x, v.y);
    if (v.kind === 'butterfly') {
      // Wings open and close: quickly in flight, slowly at rest.
      const f = Math.abs(Math.sin(v.t * (sitting ? 2.2 : 16) + v.flap));
      g.scale(0.3 + 0.7 * f, 1);
    } else {
      g.translate(0, sitting ? 0 : Math.sin(v.t * 22) * 3);
      g.rotate(Math.sin(v.t * (sitting ? 6 : 30)) * 0.06);
      g.scale(v.face, 1);
    }
    g.drawImage(img, -w / 2, -h / 2, w, h);
    g.restore();
  }

  const garden = {
    layer: 'none',
    update() {
      if (W.t < visitAt) return;
      visitAt = W.t + rand(4, 8);
      if (visitors.length >= MAX_VISITORS || !sunny()) return;
      const spots = freeBlooms();
      if (spots.length) makeVisitor(spots[(Math.random() * spots.length) | 0]);
    },
  };

  // Ripe produce the baby can wish for (see kids.js); `stash` quietly tidies
  // a stray (an old apple lying about) into the basket.
  W.patch = {
    ripe(kind) {
      const p = plots.find(q => q.kind === kind && q.g >= RIPE && !q.pulling);
      return p ? { x: p.x, y: soilY + 60, hint: () => { p.wob = 1; } } : null;
    },
    stash(toy) { basket.add(toy, { quiet: true }); },
  };

  for (const e of [stand, bed, can, basket, overlay, garden]) W.add(e);
  return W.patch;
}
