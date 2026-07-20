// Trace It: a glowing dashed path appears; drag a finger along it and a
// rainbow stroke fills in behind a star marker. Forgiveness is the whole
// mechanic — a generous tolerance means near enough always counts. The
// classic 2-4yo pre-writing exercise; nothing else in the app practices
// controlled continuous finger motion.

import { pick } from '../engine/rand.js';
import { S } from '../data/strings.js';

// Easiest to hardest: a straight line first; a circle last, since it has no
// start/end landmark and demands one continuous curve all the way around.
const PATHS = [
  { id: 'line', d: 'M30 100 L270 100' },
  { id: 'wave', d: 'M20 110 Q80 50 140 110 T260 110' },
  { id: 'zigzag', d: 'M20 160 L80 40 L140 160 L200 40 L260 160' },
  { id: 'mountain', d: 'M20 170 L90 60 L150 130 L210 40 L280 170' },
  { id: 'circle', d: 'M150 40 A60 60 0 1 1 149.9 40 Z' },
];

// Starts at the easiest shape and advances one step per completed trace.
// Once at the hardest, keeps things fresh by picking randomly among all of
// them on replay rather than looping the same fixed order forever.
let level = 0;
function nextPath() {
  if (level < PATHS.length - 1) return PATHS[level++];
  return pick(PATHS);
}

const TOL = 34;              // generous hit tolerance, in path viewBox units
const MAX_ADVANCE_FRAC = 0.18; // forward search window per pointer move, as a fraction of the path

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 70 Q35 20 55 55 T90 30" fill="none" stroke="#7ed67e" stroke-width="8" stroke-linecap="round" stroke-dasharray="1 13"/>
  <circle cx="90" cy="30" r="9" fill="#ffd54a" stroke="#fff" stroke-width="2"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let pathIndex = null;
  let progress = 0;
  let done = false;
  let dragging = false;

  const wrap = document.createElement('div');
  wrap.className = 'trace-wrap';
  wrap.innerHTML = `
    <svg class="trace-svg" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="trace-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ff8a70"/>
          <stop offset="50%" stop-color="#ffd54a"/>
          <stop offset="100%" stop-color="#7ed67e"/>
        </linearGradient>
      </defs>
      <path class="trace-guide" fill="none" stroke="#d7d0e6" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 18"/>
      <path class="trace-fill" fill="none" stroke="url(#trace-grad)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
      <circle class="trace-star" r="11" fill="#ffd54a" stroke="#fff" stroke-width="2.4"/>
    </svg>`;
  stage.appendChild(wrap);

  const svg = wrap.querySelector('.trace-svg');
  const guide = wrap.querySelector('.trace-guide');
  const fillPath = wrap.querySelector('.trace-fill');
  const star = wrap.querySelector('.trace-star');

  function toLocal(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x, y: loc.y };
  }

  function buildIndex(pathEl) {
    const total = pathEl.getTotalLength();
    const n = Math.max(20, Math.floor(total / 3));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const len = (i / n) * total;
      const p = pathEl.getPointAtLength(len);
      pts.push({ x: p.x, y: p.y, len });
    }
    return { pts, total };
  }

  function updateVisual() {
    const p = pathIndex.pts[progress];
    fillPath.setAttribute('stroke-dasharray', `${p.len} ${pathIndex.total}`);
    star.setAttribute('cx', p.x);
    star.setAttribute('cy', p.y);
  }

  function tryAdvance(clientX, clientY) {
    if (!pathIndex) return;
    const local = toLocal(clientX, clientY);
    const maxAdvance = Math.max(6, Math.floor(pathIndex.pts.length * MAX_ADVANCE_FRAC));
    const upper = Math.min(pathIndex.pts.length - 1, progress + maxAdvance);
    let best = -1, bestDist = Infinity;
    for (let i = progress; i <= upper; i++) {
      const pt = pathIndex.pts[i];
      const dist = Math.hypot(pt.x - local.x, pt.y - local.y);
      if (dist <= TOL && dist < bestDist) { bestDist = dist; best = i; }
    }
    if (best > progress) {
      const crossedTenth = Math.floor(best / 10) > Math.floor(progress / 10);
      progress = best;
      updateVisual();
      if (crossedTenth) audio.pop();
      if (progress >= pathIndex.pts.length - 1) finish();
    }
  }

  async function finish() {
    if (done || !alive) return;
    done = true;
    const end = pathIndex.pts[pathIndex.pts.length - 1];
    const screenPt = svg.createSVGPoint();
    screenPt.x = end.x; screenPt.y = end.y;
    const ctm = svg.getScreenCTM();
    const r = svg.getBoundingClientRect();
    const screen = ctm ? screenPt.matrixTransform(ctm) : { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    celebrate.burst(screen.x, screen.y, { count: 30 });
    await speech.speak(S.traceDone);
    if (!alive) return;
    celebrate.big({ quick: false });
    setTimeout(() => newRound(false), 1000);
  }

  function onDown(e) {
    if (!alive || done) return;
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    tryAdvance(e.clientX, e.clientY);
  }
  function onMove(e) {
    if (!alive || done || !dragging) return;
    tryAdvance(e.clientX, e.clientY);
  }
  function onUp() { dragging = false; }
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);

  function newRound(first) {
    if (!alive) return;
    done = false;
    progress = 0;
    const current = nextPath();
    guide.setAttribute('d', current.d);
    fillPath.setAttribute('d', current.d);
    pathIndex = buildIndex(fillPath);
    fillPath.setAttribute('stroke-dasharray', `0 ${pathIndex.total}`);
    const startPt = pathIndex.pts[0];
    star.setAttribute('cx', startPt.x);
    star.setAttribute('cy', startPt.y);
    speech.speak(S.traceIntro, { interrupt: false });
  }

  setReprompt(() => speech.speak(S.traceReprompt));
  newRound(true);

  return () => { alive = false; };
}

export default {
  id: 'trace',
  title: 'Trace It',
  icon: ICON,
  start,
};
