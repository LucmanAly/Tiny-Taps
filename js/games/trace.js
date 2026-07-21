// Trace It 3.1: choose letters, shapes, numbers or animals. Each item is a
// sequence of generous centre-line strokes. Computer speech is used once,
// only after the whole item is complete; recorded parent praise then follows
// through the normal celebration path.

import { TRACE_CATEGORIES } from '../data/trace-items.js';

const TOL = 30;
const CATEGORY_KEY = 'tinytaps-trace-category';

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 70 Q35 20 55 55 T90 30" fill="none" stroke="#7ed67e" stroke-width="8" stroke-linecap="round" stroke-dasharray="1 13"/>
  <circle cx="90" cy="30" r="9" fill="#ffd54a" stroke="#fff" stroke-width="2"/>
</svg>`;

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt, recordOutcome } = ctx;
  let alive = true;
  let category = TRACE_CATEGORIES[localStorage.getItem(CATEGORY_KEY)]
    ? localStorage.getItem(CATEGORY_KEY) : 'alphabet';
  const cursors = { alphabet: 0, shapes: 0, numbers: 0, animals: 0 };
  let current = null;
  let indexes = [];
  let fills = [];
  let guides = [];
  let strokeIndex = 0;
  let pointIndex = 0;
  let dragging = false;
  let done = false;

  const shell = document.createElement('div');
  shell.className = 'trace-shell';
  shell.innerHTML = `
    <div class="trace-tabs" role="group" aria-label="Choose what to trace"></div>
    <div class="trace-card">
      <div class="trace-item-name"></div>
      <svg class="trace-svg" viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="trace-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff8a70"/>
            <stop offset="45%" stop-color="#ffd54a"/>
            <stop offset="100%" stop-color="#4db8d8"/>
          </linearGradient>
        </defs>
        <image class="trace-animal-preview" x="55" y="25" width="190" height="190" preserveAspectRatio="xMidYMid meet"/>
        <g class="trace-guides"></g>
        <g class="trace-fills"></g>
        <circle class="trace-star" r="10" fill="#ffd54a" stroke="#fff" stroke-width="2.5"/>
      </svg>
      <div class="trace-stroke-dots"></div>
    </div>`;
  stage.appendChild(shell);

  const tabs = shell.querySelector('.trace-tabs');
  const svg = shell.querySelector('.trace-svg');
  const guideGroup = shell.querySelector('.trace-guides');
  const fillGroup = shell.querySelector('.trace-fills');
  const star = shell.querySelector('.trace-star');
  const preview = shell.querySelector('.trace-animal-preview');
  const name = shell.querySelector('.trace-item-name');
  const strokeDots = shell.querySelector('.trace-stroke-dots');

  for (const [id, group] of Object.entries(TRACE_CATEGORIES)) {
    const button = document.createElement('button');
    button.className = 'trace-tab';
    button.dataset.category = id;
    button.textContent = group.label;
    button.addEventListener('pointerdown', e => {
      e.stopPropagation();
      if (category === id) return;
      category = id;
      localStorage.setItem(CATEGORY_KEY, id);
      speech.stop();
      audio.pop();
      renderNext();
    });
    tabs.appendChild(button);
  }

  function pathIndex(pathEl) {
    const total = pathEl.getTotalLength();
    const count = Math.max(20, Math.ceil(total / 3));
    const pts = [];
    for (let i = 0; i <= count; i++) {
      const len = (i / count) * total;
      const p = pathEl.getPointAtLength(len);
      pts.push({ x: p.x, y: p.y, len });
    }
    return { total, pts };
  }

  function activateStroke(index) {
    strokeIndex = index;
    pointIndex = 0;
    guides.forEach((g, i) => g.classList.toggle('active', i === index));
    const p = indexes[index].pts[0];
    star.setAttribute('cx', p.x);
    star.setAttribute('cy', p.y);
    star.style.opacity = '1';
    [...strokeDots.children].forEach((dot, i) => {
      dot.classList.toggle('done', i < index);
      dot.classList.toggle('active', i === index);
    });
  }

  function renderNext() {
    if (!alive) return;
    done = false;
    dragging = false;
    const group = TRACE_CATEGORIES[category];
    current = group.items[cursors[category] % group.items.length];
    cursors[category]++;
    tabs.querySelectorAll('.trace-tab').forEach(b =>
      b.classList.toggle('selected', b.dataset.category === category));
    name.textContent = current.label;
    if (current.art) {
      preview.setAttribute('href', current.art);
      preview.style.display = '';
    } else {
      preview.removeAttribute('href');
      preview.style.display = 'none';
    }
    guideGroup.innerHTML = current.paths.map(d =>
      `<path class="trace-guide" d="${d}"/>`).join('');
    fillGroup.innerHTML = current.paths.map(d =>
      `<path class="trace-fill" d="${d}"/>`).join('');
    guides = [...guideGroup.querySelectorAll('path')];
    fills = [...fillGroup.querySelectorAll('path')];
    indexes = fills.map(pathIndex);
    fills.forEach((p, i) => p.setAttribute('stroke-dasharray', `0 ${indexes[i].total}`));
    strokeDots.innerHTML = current.paths.map(() => '<span></span>').join('');
    activateStroke(0);
  }

  function toLocal(clientX, clientY) {
    const point = svg.createSVGPoint();
    point.x = clientX; point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: -999, y: -999 };
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function advance(clientX, clientY) {
    if (!indexes[strokeIndex] || done) return;
    const local = toLocal(clientX, clientY);
    const index = indexes[strokeIndex];
    const upper = pointIndex > 0
      ? index.pts.length - 1
      : Math.min(index.pts.length - 1, Math.max(6, Math.floor(index.pts.length * 0.2)));
    let best = -1;
    for (let i = pointIndex; i <= upper; i++) {
      const p = index.pts[i];
      if (Math.hypot(p.x - local.x, p.y - local.y) <= TOL) best = i;
    }
    if (best <= pointIndex) return;
    const oldBand = Math.floor(pointIndex / 12);
    pointIndex = best;
    const p = index.pts[pointIndex];
    fills[strokeIndex].setAttribute('stroke-dasharray', `${p.len} ${index.total}`);
    star.setAttribute('cx', p.x);
    star.setAttribute('cy', p.y);
    if (Math.floor(pointIndex / 12) > oldBand) audio.pop();
    if (pointIndex >= index.pts.length - 1) completeStroke();
  }

  function completeStroke() {
    fills[strokeIndex].setAttribute('stroke-dasharray', `${indexes[strokeIndex].total} 0`);
    if (strokeIndex < indexes.length - 1) {
      audio.chime();
      activateStroke(strokeIndex + 1);
      return;
    }
    completeItem();
  }

  async function completeItem() {
    if (done || !alive) return;
    done = true;
    dragging = false;
    star.style.opacity = '0';
    [...strokeDots.children].forEach(dot => dot.classList.add('done'));
    const r = svg.getBoundingClientRect();
    celebrate.burst(r.left + r.width / 2, r.top + r.height / 2, { count: 34 });
    if (recordOutcome) recordOutcome(true, `${category}:${current.id}`);
    await speech.speakWord(current.spoken, { rate: 0.86, pitch: 1.02 });
    if (!alive) return;
    celebrate.big({ quick: false });
    setTimeout(renderNext, 900);
  }

  function onDown(e) {
    if (!alive || done) return;
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    advance(e.clientX, e.clientY);
  }
  function onMove(e) { if (dragging && alive && !done) advance(e.clientX, e.clientY); }
  function onUp() { dragging = false; }
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);

  setReprompt(null);
  renderNext();
  return () => { alive = false; speech.stop(); };
}

export default { id: 'trace', title: 'Trace It', icon: ICON, start };
