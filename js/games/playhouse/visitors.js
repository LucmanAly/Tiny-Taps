// Small storybook zombies and skeletons on a path OUTSIDE the picket fence.
// They pause between strolls and only wave when touched: no chasing or harm.
import { WORLD } from './layout.js';
import { quietMotion } from '../../engine/calm.js';

const rand = (a, b) => a + Math.random() * (b - a);
const INK = '#6c6975';

export function createVisitors(W) {
  const visitors = [];
  W.add({
    layer: 'outside',
    draw(g) {
      g.fillStyle = '#d3c7a4';
      g.beginPath(); g.moveTo(1660, 395);
      g.bezierCurveTo(2600, 370, 3650, 397, WORLD.W, 383);
      g.lineTo(WORLD.W, 460); g.lineTo(1660, 460); g.closePath(); g.fill();
    },
  });
  for (const [i, kind] of ['zombie', 'skeleton', 'zombie', 'skeleton'].entries()) {
    const v = {
      kind, layer: 'outside', x: 1920 + i * 770, y: 444,
      face: i % 2 ? -1 : 1, target: null, phase: i, wave: 0,
      next: W.t + 2 + i * 2.5,
      hit(x, y) { return Math.abs(x - this.x) < 46 && y > this.y - 152 && y < 389; },
      tap() {
        this.wave = 2.4;
        this.target = null;
        this.next = W.t + rand(8, 16);
        W.audio.bell(kind === 'zombie' ? 2 : 4);
      },
      update(dt) {
        this.wave = Math.max(0, this.wave - dt);
        if (quietMotion()) { this.target = null; this.next = W.t + 8; return; }
        if (!W.onScreen(this.x, 180)) { this.next = W.t + 2; return; }
        if (this.target !== null) {
          const dx = this.target - this.x;
          const step = 32 * dt;
          this.face = dx >= 0 ? 1 : -1;
          if (Math.abs(dx) <= step) { this.x = this.target; this.target = null; this.next = W.t + rand(8, 17); }
          else { this.x += this.face * step; this.phase += dt * 4; }
        } else if (!this.wave && W.t >= this.next) {
          this.target = Math.max(1750, Math.min(WORLD.W - 100, this.x + rand(-200, 200)));
        }
      },
      draw(g) { drawVisitor(g, this); },
    };
    visitors.push(W.add(v));
  }
  W.visitors = visitors;
  return visitors;
}

function drawVisitor(g, v) {
  const moving = v.target !== null;
  const quiet = quietMotion();
  const stride = moving && !quiet ? Math.sin(v.phase) * 9 : 0;
  const wave = v.wave && !quiet ? Math.sin(v.wave * 10) * 9 : 0;
  g.save();
  g.translate(v.x, v.y - (moving && !quiet ? Math.abs(stride) * 0.25 : 0));
  g.scale(v.face, 1);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = INK; g.lineWidth = 3;
  const line = (x0, y0, x1, y1, color, width) => {
    g.strokeStyle = color; g.lineWidth = width;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  };
  g.fillStyle = 'rgba(64,73,70,0.12)'; g.beginPath(); g.ellipse(0, 0, 35, 8, 0, 0, Math.PI * 2); g.fill();
  if (v.kind === 'zombie') {
    // Soft green face, patched purple jumper, both eyes and a little smile.
    line(-10, -46, -15 + stride, -5, '#757c9e', 17);
    line(10, -46, 15 - stride, -5, '#757c9e', 17);
    line(-16, -79, -33, -48, '#a5c598', 12);
    line(17, -80, 34, v.wave ? -119 + wave : -56, '#a5c598', 12);
    g.fillStyle = '#b4a2d3'; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.roundRect(-25, -96, 50, 53, 13); g.fill(); g.stroke();
    g.fillStyle = '#f9ce8c'; g.beginPath(); g.roundRect(-13, -70, 15, 15, 3); g.fill();
    g.fillStyle = '#a9ce9a'; g.beginPath(); g.roundRect(-29, -144, 58, 51, 19); g.fill(); g.stroke();
    line(-17, -139, -12, -147, '#697455', 5); line(0, -142, 3, -149, '#697455', 5);
    g.fillStyle = '#c5ddb4'; g.beginPath(); g.ellipse(-16, -126, 7, 10, 0, 0, Math.PI * 2); g.fill();
  } else {
    // Rounded ivory bones and a grinning skull with a peach bow tie.
    for (const [x, dx] of [[-10, stride], [10, -stride]]) {
      line(x, -51, x + dx, -27, INK, 11); line(x + dx, -27, x * 1.7 - dx, -5, INK, 11);
      line(x, -51, x + dx, -27, '#fff3d8', 7); line(x + dx, -27, x * 1.7 - dx, -5, '#fff3d8', 7);
    }
    line(-19, -89, -34, -56, '#fff3d8', 9);
    line(19, -89, 37, v.wave ? -122 + wave : -60, '#fff3d8', 9);
    line(0, -100, 0, -48, INK, 12); line(0, -100, 0, -48, '#fff3d8', 8);
    for (const y of [-86, -76, -66]) {
      g.strokeStyle = '#fff3d8'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(-19, y - 3); g.quadraticCurveTo(0, y + 10, 19, y - 3); g.stroke();
    }
    g.fillStyle = '#fff3d8'; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.roundRect(-29, -147, 58, 49, 21); g.fill(); g.stroke();
    g.fillStyle = '#efb4a4';
    g.beginPath(); g.moveTo(0, -99); g.lineTo(-13, -106); g.lineTo(-13, -91); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(0, -99); g.lineTo(13, -106); g.lineTo(13, -91); g.closePath(); g.fill();
  }
  g.fillStyle = '#505263';
  for (const x of [-10, 12]) {
    g.beginPath(); g.ellipse(x, -125, v.kind === 'skeleton' ? 6 : 4, 6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 1, -127, 1.5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#505263';
  }
  g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.moveTo(-9, -111); g.quadraticCurveTo(0, -102, 11, -111); g.stroke();
  g.restore();
}
