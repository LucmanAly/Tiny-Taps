// Trace It 3.2: choose letters, shapes, numbers or animals. Each item is a
// sequence of generous centre-line strokes. Computer speech is used once,
// only after the whole item is complete; recorded parent praise then follows
// through the normal celebration path.

import { TRACE_CATEGORIES } from '../data/trace-items.js';

const TOL = 30;
const START_TOL = 36;
const SAMPLE_STEP = 6;
const LOOKAHEAD_DISTANCE = 12;
const MIN_FINGER_TRAVEL = 0.7;
const CATEGORY_KEY = 'tinytaps-trace-category';

// Pure forward-progress calculation kept exported for the release check. It
// never moves without finger travel and can inspect only a short arc ahead.
export function nextPathPoint(index, pointIndex, local, travel) {
  if (travel <= 0 || pointIndex >= index.pts.length - 1) return pointIndex;
  const currentLength = index.pts[pointIndex].len;
  const maxLength = currentLength + Math.max(LOOKAHEAD_DISTANCE, travel * 1.6);
  let best = pointIndex;
  for (let i = pointIndex; i < index.pts.length; i++) {
    const p = index.pts[i];
    if (p.len > maxLength) break;
    if (Math.hypot(p.x - local.x, p.y - local.y) <= TOL) best = i;
  }
  return best;
}

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
  let pointerId = null;
  let lastPointer = null;
  let fingerTravel = 0;
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
    fingerTravel = 0;
    lastPointer = null;
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

  function advanceSample(local, travel) {
    if (!indexes[strokeIndex] || done) return;
    const index = indexes[strokeIndex];
    fingerTravel += travel;
    if (pointIndex >= index.pts.length - 1) {
      if (fingerTravel >= index.total * MIN_FINGER_TRAVEL) completeStroke();
      return;
    }
    const best = nextPathPoint(index, pointIndex, local, travel);
    if (best <= pointIndex) return;
    const oldBand = Math.floor(pointIndex / 12);
    pointIndex = best;
    const p = index.pts[pointIndex];
    fills[strokeIndex].setAttribute('stroke-dasharray', `${p.len} ${index.total}`);
    star.setAttribute('cx', p.x);
    star.setAttribute('cy', p.y);
    if (Math.floor(pointIndex / 12) > oldBand) audio.pop();
    if (pointIndex >= index.pts.length - 1 && fingerTravel >= index.total * MIN_FINGER_TRAVEL) {
      completeStroke();
    }
  }

  function advanceTo(local) {
    if (!lastPointer) { lastPointer = local; return; }
    const activeStroke = strokeIndex;
    const dx = local.x - lastPointer.x;
    const dy = local.y - lastPointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.5) return;
    const steps = Math.max(1, Math.ceil(distance / SAMPLE_STEP));
    for (let i = 1; i <= steps && !done && strokeIndex === activeStroke; i++) {
      const sample = {
        x: lastPointer.x + dx * (i / steps),
        y: lastPointer.y + dy * (i / steps),
      };
      advanceSample(sample, distance / steps);
    }
    if (strokeIndex === activeStroke) lastPointer = local;
  }

  function completeStroke() {
    fills[strokeIndex].setAttribute('stroke-dasharray', `${indexes[strokeIndex].total} 0`);
    if (strokeIndex < indexes.length - 1) {
      audio.chime();
      dragging = false;
      pointerId = null;
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
    const local = toLocal(e.clientX, e.clientY);
    const expected = indexes[strokeIndex]?.pts[pointIndex];
    if (!expected || Math.hypot(expected.x - local.x, expected.y - local.y) > START_TOL) return;
    dragging = true;
    pointerId = e.pointerId;
    lastPointer = local;
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onMove(e) {
    if (!dragging || e.pointerId !== pointerId || !alive || done) return;
    const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const events = coalesced.length ? coalesced : [e];
    for (const event of events) advanceTo(toLocal(event.clientX, event.clientY));
    e.preventDefault();
  }
  function onUp(e) {
    if (pointerId !== null && e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    lastPointer = null;
  }
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);

  setReprompt(null);
  renderNext();
  return () => { alive = false; speech.stop(); };
}

export default { id: 'trace', title: 'Trace It', icon: ICON, start };
