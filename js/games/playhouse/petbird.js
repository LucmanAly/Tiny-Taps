// A pet budgie: open its cage, let it flutter down, or invite the baby to
// share seeds. Everything runs on world time, so leaving stops every action.
import { PLACES } from './layout.js';
import { quietMotion } from '../../engine/calm.js';

const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const INK = '#6b5945';

export function createPetBird(W) {
  const C = PLACES.birdcage;
  const baby = W.baby;
  const perch = { x: C.x, y: C.y - 128 };
  const ground = { x: C.x + 72, y: C.y + 46 };
  let visit = null;
  let nextHop = W.t + 7;
  let fedAt = -99;

  function chirp() { if (W.onScreen(bird.x)) W.audio.chirp(); }
  function hearts(x, y) { W.fx.hearts(x, y, quietMotion() ? 1 : 3); }

  const cage = {
    kind: 'birdcage', x: C.x, y: C.y, z: C.y, open: false, closing: false,
    hit(x, y) { return Math.abs(x - this.x) < 112 && y > this.y - 282 && y < this.y + 15; },
    hint() { chirp(); },
    tap() {
      W.say('Bird');
      W.audio.click();
      if (!this.open || this.closing) {
        this.open = true;
        this.closing = false;
        bird.flyTo(ground.x, ground.y, 'ground');
      } else {
        cancelVisit();
        this.closing = true;
        bird.flyTo(perch.x, perch.y, 'caged');
      }
    },
    draw(g) { drawCage(g, true); },
  };

  const bird = {
    kind: 'petbird', x: perch.x, y: perch.y,
    state: 'caged', face: 1, flight: null, peck: 0,
    // Inside, behind the bars; outside, in front of the baby and her seeds.
    get z() { return this.state === 'caged' ? C.y - 0.5 : C.y + 67; },
    hit(x, y) {
      return cage.open && !cage.closing && Math.hypot(x - this.x, y - (this.y - 24)) < 60;
    },
    tap() {
      W.say('Bird');
      chirp();
      if (visit || cage.closing) return;
      play();
    },
    flyTo(x, y, end) {
      this.flight = { x0: this.x, y0: this.y, x, y, end, t: 0,
        dur: quietMotion() ? 2.2 : 1.6, lift: quietMotion() ? 35 : 105 };
      this.face = x >= this.x ? 1 : -1;
      this.state = 'fly';
      this.peck = 0;
    },
    update(dt) {
      if (this.flight) {
        const f = this.flight;
        f.t += dt;
        const k = Math.min(1, f.t / f.dur);
        const smooth = k * k * (3 - 2 * k);
        this.x = lerp(f.x0, f.x, smooth);
        this.y = lerp(f.y0, f.y, smooth) - Math.sin(k * Math.PI) * f.lift;
        if (k === 1) {
          this.flight = null;
          this.state = f.end;
          nextHop = W.t + rand(6, 10);
          if (f.end === 'caged' && cage.closing) { cage.open = false; cage.closing = false; }
          if (f.end === 'feed' && visit) { visit.phase = 'feed'; visit.until = W.t + 3.2; }
        }
      } else if (this.state === 'feed') {
        this.peck = Math.sin(W.t * 9) * 0.22;
      } else if (W.t > nextHop && !visit && !cage.closing) {
        nextHop = W.t + rand(6, 10);
        if (W.dayT > 0.5 || W.sky.weather !== 'clear') {
          if (this.state !== 'caged') this.flyTo(perch.x, perch.y, 'caged');
        } else if (cage.open && !quietMotion()) {
          this.flyTo(C.x + rand(-35, 105), ground.y, 'ground');
        }
      }
      stepVisit();
    },
    draw(g) {
      g.save();
      g.translate(this.x, this.y - 24);
      g.scale(this.face, 1);
      g.rotate(this.peck);
      g.lineWidth = 3;
      g.strokeStyle = INK;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      if (!this.flight) {
        g.beginPath(); g.moveTo(-6, 19); g.lineTo(-8, 26); g.lineTo(-15, 26);
        g.moveTo(9, 19); g.lineTo(9, 26); g.lineTo(16, 26); g.stroke();
      }
      g.fillStyle = '#6dc3ac';
      g.beginPath(); g.moveTo(-22, 8); g.lineTo(-47, 21); g.lineTo(-39, -8); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, 0, 31, 23, -0.15, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#d5eda4';
      g.beginPath(); g.ellipse(8, 8, 18, 12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe175';
      g.beginPath(); g.arc(23, -19, 19, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#efad55';
      g.beginPath(); g.moveTo(39, -21); g.lineTo(53, -15); g.lineTo(39, -10); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#384354';
      g.beginPath(); g.arc(28, -24, 4, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(29, -25, 1.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#f8b6a1'; g.beginPath(); g.arc(32, -12, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9cdec5';
      const flap = this.flight && !quietMotion() ? Math.sin(W.t * 17) : 0;
      g.beginPath(); g.ellipse(-9, -5 - flap * 12, 23, 10 + Math.abs(flap) * 5, -0.35 - flap * 0.45, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-18, -7); g.lineTo(-3, -4); g.moveTo(-21, 0); g.lineTo(-7, 3); g.stroke();
      g.restore();
    },
  };

  // The broad bowl remains in front of the toys and baby, and needs only a
  // tap. Feeding has no scarce seeds, score, or wrong answer.
  const bowl = {
    kind: 'birdseed', x: C.x + 195, y: C.y + 55, z: 790,
    hit(x, y) { return Math.hypot((x - this.x) / 1.15, y - (this.y - 30)) < 58; },
    hint() { if (!quietMotion()) W.fx.sparkle(this.x, this.y - 35, 4, 60); },
    tap() {
      chirp();
      if (visit || cage.closing || !baby.free()) return;
      cage.open = true;
      baby.want = null;
      baby.nextWantAt = Math.max(baby.nextWantAt, W.t + 22);
      visit = { phase: 'come', until: W.t + 35 };
      W.reveal(C.x);
      baby.crawlOver(C.x - 155, C.y + 65, () => {
        if (!visit || visit.phase !== 'come' || !baby.free()) return;
        visit.phase = 'land';
        baby.facing = 1;
        baby.settleUntil = W.t + 20;
        baby.setState('feedbird', 9);
        bird.flyTo(baby.x + 101, baby.y - 25, 'feed');
      });
      visit.target = baby.crawlTo;
      visit.then = baby.then;
    },
    draw(g) {
      g.save();
      g.translate(this.x, this.y);
      g.fillStyle = 'rgba(70,60,30,0.14)';
      g.beginPath(); g.ellipse(0, 4, 59, 13, 0, 0, Math.PI * 2); g.fill();
      if (visit) {
        g.strokeStyle = '#fff2b0'; g.lineWidth = 6;
        g.beginPath(); g.ellipse(0, -20, 61, 36, 0, 0, Math.PI * 2); g.stroke();
      }
      g.fillStyle = '#e8a079'; g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-48, -31); g.quadraticCurveTo(-38, 4, 0, 4); g.quadraticCurveTo(38, 4, 48, -31); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fbe2a3'; g.beginPath(); g.ellipse(0, -31, 48, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      seeds(g, 0, -31);
      // A little painted bird on the bowl is the invitation to feed.
      g.fillStyle = '#fff5d1'; g.beginPath(); g.ellipse(0, -12, 11, 7, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(9, -18, 5, 0, Math.PI * 2); g.fill();
      g.restore();
    },
  };

  function play() {
    cage.open = true;
    bird.flyTo(C.x + (bird.x > C.x + 30 ? -28 : 92), ground.y, 'ground');
    if (baby.free() && Math.abs(baby.x - C.x) < 360) {
      baby.crawlTo = null;
      baby.then = null;
      baby.want = null;
      baby.nextWantAt = Math.max(baby.nextWantAt, W.t + 8);
      baby.facing = bird.face;
      baby.setState('clap', 2);
      baby.settleUntil = W.t + 18;
      W.voice.baby('laugh');
      hearts(baby.x, baby.y - 175);
    }
  }

  function cancelVisit() {
    if (!visit) return;
    const phase = visit.phase;
    const visitThen = visit.then;
    visit = null;
    if (phase === 'come' && baby.then === visitThen) {
      baby.crawlTo = null;
      baby.then = null;
      if (baby.state === 'crawl') baby.setState('sit');
    } else if (baby.state === 'feedbird') baby.setState('sit');
    if (bird.state === 'feed') { bird.state = 'ground'; bird.peck = 0; }
  }

  function stepVisit() {
    if (!visit) return;
    const p = visit.phase;
    if (W.t > visit.until && p !== 'feed') { cancelVisit(); return; }
    if (p === 'come') {
      if (baby.held || baby.state !== 'crawl' || baby.crawlTo !== visit.target) cancelVisit();
      return;
    }
    // Lifting her, sending her elsewhere, sleeping or giving her a toy
    // cancels the visit before any later reaction can interrupt that action.
    if (baby.held || baby.state !== 'feedbird' || Math.abs(baby.x - (C.x - 155)) > 80) {
      cancelVisit();
      if (!cage.closing) bird.flyTo(ground.x, ground.y, 'ground');
      return;
    }
    if (p === 'feed' && W.t >= visit.until) {
      visit = null;
      baby.setState('clap', 2.2);
      W.voice.baby('delight');
      chirp();
      hearts(baby.x + 65, baby.y - 135);
      if (W.t - fedAt > 5) { fedAt = W.t; W.recordOutcome(true, 'feed:petbird'); W.praise(); }
      bird.flyTo(ground.x, ground.y, 'ground');
    }
  }

  function seeds(g, x, y) {
    for (let i = 0; i < 9; i++) {
      g.fillStyle = i % 2 ? '#b68541' : '#ffe694';
      g.beginPath(); g.ellipse(x + (i % 5 - 2) * 12, y + (i < 5 ? -3 : 5), 4, 2.5, i, 0, Math.PI * 2); g.fill();
    }
  }

  function drawCage(g, front) {
    g.save(); g.translate(C.x, C.y);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const outline = () => {
      g.beginPath(); g.moveTo(-95, -14); g.lineTo(-95, -165);
      g.bezierCurveTo(-95, -277, 95, -277, 95, -165); g.lineTo(95, -14);
    };
    if (!front) {
      g.fillStyle = 'rgba(194,237,229,0.32)'; outline(); g.closePath(); g.fill();
      g.strokeStyle = '#b8d5c6'; g.lineWidth = 3;
      for (let x = -66; x < 90; x += 33) { g.beginPath(); g.moveTo(x, -202); g.lineTo(x, -20); g.stroke(); }
      g.strokeStyle = '#b88654'; g.lineWidth = 9;
      g.beginPath(); g.moveTo(-78, -128); g.lineTo(78, -128); g.stroke();
    } else {
      g.fillStyle = '#79bab3'; g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.roundRect(-105, -16, 210, 29, 10); g.fill(); g.stroke();
      g.strokeStyle = '#5e9998'; g.lineWidth = 5; outline(); g.stroke();
      g.strokeStyle = '#8cbfba'; g.lineWidth = 3;
      for (let x = -64; x <= 64; x += 32) {
        if (Math.abs(x) < 40) continue; // doorway stays legible
        g.beginPath(); g.moveTo(x, -232 + Math.abs(x) * 0.55); g.lineTo(x, -18); g.stroke();
      }
      g.beginPath(); g.moveTo(-94, -170); g.lineTo(94, -170); g.stroke();
      g.beginPath(); g.arc(0, -257, 13, 0, Math.PI * 2); g.stroke();
      // The open door swings aside instead of hiding the pet.
      const dx = cage.open ? 82 : 0, dw = cage.open ? 30 : 72;
      g.strokeStyle = '#5e9998'; g.lineWidth = 4;
      g.beginPath(); g.roundRect(dx - dw / 2, -156, dw, 138, 25); g.stroke();
      if (!cage.open) {
        g.lineWidth = 2;
        for (const x of [-18, 0, 18]) { g.beginPath(); g.moveTo(x, -149); g.lineTo(x, -20); g.stroke(); }
      }
      g.fillStyle = '#ffd97b'; g.beginPath(); g.arc(dx + dw / 2 - 8, -86, 7, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  const back = { z: C.y - 2, draw(g) { drawCage(g, false); } };
  const feedHand = {
    z: C.y + 66,
    draw(g) {
      if (!visit || !['land', 'feed'].includes(visit.phase) || baby.state !== 'feedbird') return;
      g.save();
      g.fillStyle = '#ffe0b1'; g.strokeStyle = INK; g.lineWidth = 2;
      g.beginPath(); g.ellipse(baby.x + 57, baby.y - 60, 20, 10, -0.1, 0, Math.PI * 2); g.fill(); g.stroke();
      seeds(g, baby.x + 57, baby.y - 65);
      g.restore();
    },
  };
  for (const e of [back, bird, cage, bowl, feedHand]) W.add(e);
  W.petBird = { cage, bird, bowl };
  return W.petBird;
}
