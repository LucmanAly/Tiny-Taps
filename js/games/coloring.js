// Coloring: coloring-book pages. Pick a fat color dot, tap a region to fill.
// Animal pages are new storybook line art with large closed regions so
// toddlers get an engaging picture without fiddly detail.

import { animal } from '../data/animals.js';
import { S as TXT } from '../data/strings.js';
import { childKey } from '../engine/children.js';

// Finished pictures, saved as colored SVG snapshots.
const GALLERY_KEY = 'tinytaps-gallery';
const CATEGORY_KEY = 'tinytaps-coloring-category';
// Unfinished pictures survive leaving the game: per page, the ordered list of
// [region, color] fills. Replaying the list rebuilds the picture, and popping
// it is Undo.
const DRAFTS_KEY = 'tinytaps-coloring-drafts';
const LAST_PAGE_KEY = 'tinytaps-coloring-last';
const MAX_OPS = 200;

function savedPictures() {
  try { return JSON.parse(localStorage.getItem(childKey(GALLERY_KEY)) || '[]'); }
  catch (e) { return []; }
}

function savePicture(svg, name) {
  const list = savedPictures();
  list.push({ svg, name, t: Date.now() });
  while (list.length > 24) list.shift();
  try { localStorage.setItem(childKey(GALLERY_KEY), JSON.stringify(list)); } catch (e) { /* full */ }
}

function readDrafts() {
  try {
    const raw = JSON.parse(localStorage.getItem(childKey(DRAFTS_KEY)) || '{}');
    const out = {};
    for (const [id, ops] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
      if (!Array.isArray(ops)) continue;
      const clean = ops.filter(op => Array.isArray(op) && typeof op[0] === 'string' && typeof op[1] === 'string');
      if (clean.length) out[id] = clean;
    }
    return out;
  } catch (e) { return {}; }
}

function writeDrafts(drafts) {
  try { localStorage.setItem(childKey(DRAFTS_KEY), JSON.stringify(drafts)); } catch (e) { /* optional */ }
}

// A very long session is folded into one fill per region so storage stays
// small; only the oldest undo steps are lost.
function compact(ops) {
  if (ops.length <= MAX_OPS) return ops;
  const last = new Map();
  for (const [region, color] of ops) { last.delete(region); last.set(region, color); }
  return [...last];
}

// Renders a saved SVG snapshot to a PNG and hands it to the share sheet
// (iOS: Save Image) or downloads it. Parsing through HTML and re-serializing
// as XML guarantees a standalone, namespaced SVG the <img> decoder accepts.
function renderPng(svgText) {
  return new Promise((resolve, reject) => {
    const holder = document.createElement('div');
    holder.innerHTML = svgText;
    const svg = holder.querySelector('svg');
    if (!svg) { reject(new Error('No picture')); return; }
    const vb = (svg.getAttribute('viewBox') || '0 0 200 200').split(/[\s,]+/).map(Number);
    const w = vb[2] > 0 ? vb[2] : 200;
    const h = vb[3] > 0 ? vb[3] : 200;
    const k = 1600 / Math.max(w, h);
    const W = Math.round(w * k);
    const H = Math.round(h * k);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    const xml = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
    const img = new Image();
    img.onload = () => {
      const pad = Math.round(Math.max(W, H) * 0.04);
      const canvas = document.createElement('canvas');
      canvas.width = W + pad * 2;
      canvas.height = H + pad * 2;
      const g = canvas.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(img, pad, pad, W, H);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('PNG failed'))), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Picture could not render')); };
    img.src = url;
  });
}

async function sharePng(blob, name) {
  const slug = String(name || 'picture').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'picture';
  const file = new File([blob], `tiny-taps-${slug}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Tiny Taps picture' });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const PALETTE = [
  { color: '#0062E0', name: 'Blue' },
  { color: '#FF8800', name: 'Orange' },
  { color: '#75D018', name: 'Green' },
  { color: '#FFDE00', name: 'Yellow' },
  { color: '#FF3B94', name: 'Pink' },
  { color: '#FFFFFF', name: 'White' },
  { color: '#BD0D19', name: 'Red' },
  { color: '#000000', name: 'Black' },
  { color: '#8B5CF6', name: 'Purple' },
  { color: '#17B7D6', name: 'Cyan' },
  { color: '#8B5A2B', name: 'Brown' },
  { color: '#D8A17D', name: 'Kashmiri skin tone' },
];
const LINE = '#3a3357';
const SW = 5;

// Shared sketchy stroke attributes: round joins + a hint of a second pass,
// like pencil over ink.
const S = `fill="#fff" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round" stroke-linecap="round"`;
const INK = `fill="none" stroke="${LINE}" stroke-linecap="round"`;
const PENCIL = `fill="none" stroke="${LINE}" stroke-linecap="round" opacity="0.45"`;

const EXTERNAL_SVG_CACHE = new Map();

function loadExternalSvg(src) {
  if (!EXTERNAL_SVG_CACHE.has(src)) {
    EXTERNAL_SVG_CACHE.set(src, fetch(src).then(response => {
      if (!response.ok) throw new Error(`Could not load ${src}`);
      return response.text();
    }));
  }
  return EXTERNAL_SVG_CACHE.get(src);
}

// Each page: an SVG with data-region elements (white until filled). A
// data-region on a <g> fills every child at once (children carry no fill of
// their own).
const PAGES = [
  {
    id: 'parrot', name: 'Parrot',
    src: 'assets/animal-art/coloring/parrot.svg',
  },
  {
    id: 'daddy-shark', name: 'Daddy Shark',
    src: 'assets/animal-art/coloring/daddy-shark.svg',
    sound: 'assets/audio/animals/daddy_shark.mp3',
    category: 'characters',
  },
  {
    id: 'motu', name: 'Motu',
    src: 'assets/art/motu-coloring.svg',
    category: 'characters',
  },
  {
    id: 'john-the-don', name: 'John the Don',
    src: 'assets/art/john-the-don-coloring.svg',
    category: 'characters',
  },
  {
    id: 'patlu', name: 'Patlu',
    src: 'assets/art/patlu-coloring.svg',
    portrait: true,
    category: 'characters',
  },
  {
    id: 'family-man', name: 'Dad',
    src: 'assets/art/family-man-coloring.svg',
    portrait: true,
    category: 'characters',
  },
  {
    id: 'family-woman', name: 'Mom',
    src: 'assets/art/family-woman-coloring.svg',
    portrait: true,
    category: 'characters',
  },
  {
    id: 'family-baby-camera', name: 'Baby',
    src: 'assets/art/family-baby-camera-coloring.svg',
    portrait: true,
    category: 'characters',
  },
  {
    id: 'family-boy', name: 'Boy',
    src: 'assets/art/family-boy-coloring.svg',
    portrait: true,
    category: 'characters',
  },
  {
    id: 'chingam', name: 'Chingam',
    src: 'assets/art/chingam-coloring.svg',
    portrait: true,
    category: 'characters',
  },
  { id: 'frog', name: 'frog', src: 'assets/animal-art/coloring/frog.svg' },
  { id: 'fish', name: 'fish', src: 'assets/animal-art/coloring/fish.svg' },
  { id: 'duck', name: 'duck', src: 'assets/animal-art/coloring/duck.svg' },
  { id: 'cat', name: 'cat', src: 'assets/animal-art/coloring/cat.svg' },
  { id: 'dog', name: 'dog', src: 'assets/animal-art/coloring/dog.svg' },
  { id: 'bunny', name: 'bunny', src: 'assets/animal-art/coloring/bunny.svg' },
  { id: 'bear', name: 'bear', src: 'assets/animal-art/coloring/bear.svg' },
  { id: 'butterfly', name: 'butterfly', src: 'assets/animal-art/coloring/butterfly.svg' },
  { id: 'dinosaur', name: 'dinosaur', src: 'assets/animal-art/coloring/dinosaur.svg' },
  { id: 'turtle', name: 'turtle', src: 'assets/animal-art/coloring/turtle.svg' },
  { id: 'elephant', name: 'elephant', src: 'assets/animal-art/coloring/elephant.svg' },
  { id: 'monkey', name: 'monkey', src: 'assets/animal-art/coloring/monkey.svg' },
];

const UNDO_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M9 5.5 L4 10 L9 14.5" fill="none" stroke="#3a3357" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M4.5 10 H14.5 A5 5 0 0 1 14.5 20 H10" fill="none" stroke="#3a3357" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

const SAVE_ICON = `
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M12 4 V14 M7.5 10 L12 14.5 L16.5 10" fill="none" stroke="#3a3357" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M5 16.5 V19 H19 V16.5" fill="none" stroke="#3a3357" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const CHECK_ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 54 L42 76 L84 26" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const ICON = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="co-i" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#ff9fce"/><stop offset="100%" stop-color="#e5548a"/>
    </linearGradient>
  </defs>
  <g transform="rotate(40 50 50)">
    <rect x="40" y="24" width="20" height="58" rx="4" fill="url(#co-i)"/>
    <path d="M40 24 L50 6 L60 24 Z" fill="url(#co-i)"/>
    <path d="M46 12 L50 6 L54 12 Z" fill="#3a3357"/>
    <rect x="40" y="76" width="20" height="8" rx="4" fill="#e0b8cb"/>
  </g>
</svg>`;

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All', icon: '🎨' },
  { id: 'characters', label: 'Characters', icon: '🙂' },
];

function savedCategory() {
  try {
    const saved = localStorage.getItem(childKey(CATEGORY_KEY));
    return CATEGORY_OPTIONS.some(option => option.id === saved) ? saved : 'all';
  } catch (_) {
    return 'all';
  }
}

function pagesFor(category) {
  return category === 'characters'
    ? PAGES.filter(page => page.category === 'characters')
    : PAGES;
}

function start(ctx) {
  const { stage, audio, speech, celebrate, setReprompt } = ctx;
  let alive = true;
  let selected = PALETTE[3].color;
  let finishing = false;
  let pageRequest = 0;
  let finishTimer = null;
  let galleryOverlay = null;
  let category = savedCategory();
  const drafts = readDrafts();
  // Come back to an unfinished picture if the child left one.
  let currentPage = (() => {
    const pages = pagesFor(category);
    let last = null;
    try { last = localStorage.getItem(childKey(LAST_PAGE_KEY)); } catch (_) { /* optional */ }
    return pages.find(page => page.id === last && drafts[page.id]) || pages[0];
  })();
  let ops = [];              // the current page's fills, oldest first
  let regions = [];          // the current page's paintable elements
  let original = new Map();  // element → its fill before any coloring
  const touched = () => ops.length > 0;

  stage.classList.add('coloring-game');
  const sidebar = document.createElement('aside');
  sidebar.className = 'coloring-sidebar';
  sidebar.id = 'coloring-picture-sidebar';
  sidebar.setAttribute('aria-label', 'Choose a coloring picture');
  const heading = document.createElement('h2');
  heading.className = 'coloring-sidebar-title';
  heading.textContent = 'Pictures';
  const sidebarHeader = document.createElement('div');
  sidebarHeader.className = 'coloring-sidebar-header';
  const closeSidebar = document.createElement('button');
  closeSidebar.type = 'button';
  closeSidebar.className = 'coloring-sidebar-close';
  closeSidebar.textContent = '×';
  closeSidebar.setAttribute('aria-label', 'Close picture sidebar');
  closeSidebar.addEventListener('click', () => setSidebarOpen(false));
  sidebarHeader.append(heading, closeSidebar);
  const filters = document.createElement('div');
  filters.className = 'coloring-filters';
  const categoryButtons = new Map();
  for (const option of CATEGORY_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'coloring-filter';
    button.dataset.category = option.id;
    button.textContent = option.label;
    button.setAttribute('aria-label', option.id === 'all' ? 'All pictures' : 'Characters');
    button.addEventListener('click', () => selectCategory(option.id));
    filters.appendChild(button);
    categoryButtons.set(option.id, button);
  }
  const pictureList = document.createElement('div');
  pictureList.className = 'coloring-picture-list';
  sidebar.append(sidebarHeader, filters, pictureList);
  const sidebarBackdrop = document.createElement('button');
  sidebarBackdrop.type = 'button';
  sidebarBackdrop.className = 'coloring-sidebar-backdrop';
  sidebarBackdrop.setAttribute('aria-label', 'Close picture sidebar');
  sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));

  const workspace = document.createElement('div');
  workspace.className = 'coloring-workspace';
  const toolbar = document.createElement('div');
  toolbar.className = 'coloring-toolbar';
  const sidebarButton = document.createElement('button');
  sidebarButton.type = 'button';
  sidebarButton.className = 'big-btn coloring-pictures-toggle';
  sidebarButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg><span>Pictures</span>`;
  sidebarButton.setAttribute('aria-controls', sidebar.id);
  let sidebarOpen = false;
  sidebarButton.addEventListener('click', () => {
    audio.pop();
    setSidebarOpen(!sidebarOpen);
  });
  const pageTitle = document.createElement('h2');
  pageTitle.className = 'coloring-page-title';
  const actions = document.createElement('div');
  actions.className = 'coloring-actions';
  const area = document.createElement('div');
  area.className = 'color-stage';
  const pic = document.createElement('div');
  pic.className = 'color-pic';
  area.appendChild(pic);
  const bar = document.createElement('div');
  bar.className = 'palette-row';
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Colors');
  workspace.append(toolbar, area, bar);
  stage.append(sidebarBackdrop, sidebar, workspace);

  const dots = [];
  PALETTE.forEach(({ color, name }) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'palette-dot';
    dot.style.background = `radial-gradient(circle at 35% 30%, ${color}cc, ${color})`;
    dot.setAttribute('aria-label', name);
    dot.setAttribute('aria-pressed', String(color === selected));
    dot.addEventListener('click', () => {
      selected = color;
      dots.forEach(button => {
        const active = button === dot;
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
      });
      audio.pop();
    });
    bar.appendChild(dot);
    dots.push(dot);
  });
  dots[3].classList.add('selected');

  // Completion is a separate action above the picture, never a palette item.
  const done = document.createElement('button');
  done.type = 'button';
  done.className = 'big-btn done-btn';
  done.innerHTML = `${CHECK_ICON}<span>Done</span>`;
  done.setAttribute('aria-label', 'Done coloring, save picture');
  done.disabled = true;
  done.addEventListener('click', () => {
    if (!alive || !touched() || finishing) return;
    const svg = pic.querySelector('svg');
    if (!svg) return;
    savePicture(svg.outerHTML, currentPage.name);
    finishing = true;
    done.disabled = true;
    undo.disabled = true;
    celebrate.big({ quick: false });
    const completedPage = currentPage;
    delete drafts[completedPage.id];
    writeDrafts(drafts);
    markDrafts();
    finishTimer = setTimeout(() => {
      finishTimer = null;
      if (!alive) return;
      finishing = false;
      // Continue through the visible category, wrapping after its last sketch.
      const pages = pagesFor(category);
      const nextIndex = (pages.indexOf(completedPage) + 1) % pages.length;
      setSidebarOpen(false, false);
      loadPage(pages[nextIndex]);
    }, 1000);
  });

  const galleryBtn = document.createElement('button');
  galleryBtn.type = 'button';
  galleryBtn.className = 'big-btn gallery-btn';
  galleryBtn.setAttribute('aria-label', 'View saved pictures');
  galleryBtn.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="#3a3357" stroke-width="2.2"/>
      <circle cx="9" cy="10" r="2" fill="#3a3357"/>
      <path d="M5 17 L10 12.5 L13.5 15.5 L16.5 13 L19 15.5" fill="none" stroke="#3a3357" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  galleryBtn.addEventListener('click', () => {
    if (!alive) return;
    audio.pop();
    showGallery();
  });
  // Undo takes back the last fill, one tap at a time, all the way to blank.
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.className = 'big-btn undo-btn';
  undo.setAttribute('aria-label', 'Undo last color');
  undo.innerHTML = UNDO_ICON;
  undo.disabled = true;
  undo.addEventListener('click', () => {
    if (!alive || finishing || !ops.length) return;
    const [region] = ops.pop();
    paint();
    persist();
    audio.pop();
    const part = regions.find(r => r.getAttribute('data-region') === region);
    if (part) {
      part.classList.remove('undo-flash');
      void part.getBoundingClientRect();
      part.classList.add('undo-flash');
    }
  });

  actions.append(undo, galleryBtn, done);
  toolbar.append(sidebarButton, pageTitle, actions);

  function setSidebarOpen(open, restoreFocus = true) {
    sidebarOpen = open;
    sidebar.hidden = !open;
    // Inline display also protects against older cached styles overriding hidden.
    sidebar.style.display = open ? 'flex' : 'none';
    sidebarBackdrop.hidden = !open;
    sidebarBackdrop.style.display = open ? 'block' : 'none';
    workspace.inert = open;
    if (open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
    }
    stage.classList.toggle('sidebar-open', open);
    sidebarButton.setAttribute('aria-expanded', String(open));
    if (open) closeSidebar.focus();
    else if (!open && restoreFocus) sidebarButton.focus();
  }

  function handleSidebarKey(event) {
    if (event.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    // Keep keyboard focus inside the picture picker.
    if (event.key === 'Tab' && sidebarOpen) {
      const buttons = [...sidebar.querySelectorAll('button')];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
  stage.addEventListener('keydown', handleSidebarKey);
  setSidebarOpen(false, false);

  // Rebuilds the picture from scratch: every region back to its original
  // fill, then the fills replayed in order.
  function paint() {
    for (const [part, fill] of original) {
      if (fill == null) part.removeAttribute('fill');
      else part.setAttribute('fill', fill);
    }
    for (const [region, color] of ops) {
      regions
        .filter(part => part.getAttribute('data-region') === region)
        .forEach(part => part.setAttribute('fill', color));
    }
    syncButtons();
  }

  function persist() {
    if (ops.length) drafts[currentPage.id] = ops.slice();
    else delete drafts[currentPage.id];
    writeDrafts(drafts);
    markDrafts();
  }

  // A paint-dot badge on every thumbnail with an unfinished picture.
  function markDrafts() {
    for (const button of pictureList.querySelectorAll('.coloring-picture-button')) {
      button.classList.toggle('has-draft', Boolean(drafts[button.dataset.page]));
    }
  }

  function syncButtons() {
    done.disabled = finishing || !touched();
    undo.disabled = finishing || !ops.length;
  }

  function updateSelection() {
    for (const button of pictureList.querySelectorAll('.coloring-picture-button')) {
      const active = button.dataset.page === currentPage.id;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    }
    for (const [id, button] of categoryButtons) {
      const active = id === category;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function renderPictures() {
    pictureList.replaceChildren();
    for (const page of pagesFor(category)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'coloring-picture-button';
      button.dataset.page = page.id;
      button.setAttribute('aria-label', `Color ${page.name}`);
      const thumbnail = document.createElement('span');
      thumbnail.className = 'coloring-thumbnail';
      thumbnail.setAttribute('aria-hidden', 'true');
      if (page.src) {
        const image = document.createElement('img');
        image.src = page.src;
        image.alt = '';
        image.loading = 'lazy';
        image.draggable = false;
        thumbnail.appendChild(image);
      } else {
        thumbnail.innerHTML = page.svg;
      }
      const label = document.createElement('span');
      label.className = 'coloring-picture-name';
      label.textContent = page.name;
      button.append(thumbnail, label);
      button.addEventListener('click', () => {
        if (!alive) return;
        // Close immediately on every screen, including the current sketch and
        // while an external SVG is still loading. Resizing never reopens it.
        setSidebarOpen(false);
        if (finishing) return;
        if (page !== currentPage) {
          audio.pop();
          loadPage(page);
        }
      });
      pictureList.appendChild(button);
    }
    updateSelection();
    markDrafts();
  }

  function selectCategory(nextCategory) {
    if (!alive || finishing || category === nextCategory) return;
    category = nextCategory;
    try { localStorage.setItem(childKey(CATEGORY_KEY), category); } catch (_) { /* optional */ }
    renderPictures();
    audio.pop();
    if (!pagesFor(category).includes(currentPage)) loadPage(pagesFor(category)[0]);
  }

  function showGallery() {
    if (galleryOverlay) return;
    const pics = savedPictures();
    galleryOverlay = document.createElement('div');
    galleryOverlay.className = 'gallery-overlay';
    galleryOverlay.setAttribute('role', 'dialog');
    galleryOverlay.setAttribute('aria-modal', 'true');
    galleryOverlay.setAttribute('aria-label', 'Saved coloring pictures');
    const shown = pics.slice().reverse();
    const cells = shown.length
      ? shown.map((picture, n) => `<div class="gallery-cell">${picture.svg}<button type="button" class="gallery-save" data-n="${n}" aria-label="Hold to save as an image" title="Hold to save as an image">${SAVE_ICON}</button></div>`).join('')
      : '<div class="gallery-empty">Color a picture and tap Done to save it here!</div>';
    galleryOverlay.innerHTML = `
      <div class="gallery-panel">
        <div class="gallery-grid">${cells}</div>
        <p class="gallery-hint">${shown.length ? 'Grown-ups: hold ⤓ on a picture to save it as an image.' : ''}</p>
        <button type="button" class="big-btn gallery-close" aria-label="Close saved pictures">✕</button>
      </div>`;
    document.body.appendChild(galleryOverlay);
    speech.speak(TXT.galleryIntro);
    // Saving is a hold (so a toddler's tap never opens a share sheet). The
    // PNG starts rendering on press and is shared on release, which keeps the
    // share call inside a real user gesture as iOS requires.
    galleryOverlay.querySelectorAll('.gallery-save').forEach(button => {
      const picture = shown[Number(button.dataset.n)];
      let pressedAt = 0;
      let rendering = null;
      button.addEventListener('pointerdown', () => {
        pressedAt = performance.now();
        button.classList.add('holding');
        rendering = renderPng(picture.svg);
        rendering.catch(() => {});
      });
      const end = async () => {
        if (!pressedAt) return;
        const held = performance.now() - pressedAt;
        pressedAt = 0;
        button.classList.remove('holding');
        if (held < 650 || !rendering) return;
        try {
          await sharePng(await rendering, picture.name);
        } catch (e) {
          console.warn('Picture could not be saved', e);
        }
      };
      button.addEventListener('pointerup', end);
      button.addEventListener('pointercancel', () => { pressedAt = 0; button.classList.remove('holding'); });
      button.addEventListener('pointerleave', () => { pressedAt = 0; button.classList.remove('holding'); });
    });
    const close = galleryOverlay.querySelector('.gallery-close');
    close.addEventListener('click', () => {
      galleryOverlay.remove();
      galleryOverlay = null;
      galleryBtn.focus();
    });
    close.focus();
  }

  async function loadPage(page, first = false) {
    if (!alive) return;
    const request = ++pageRequest;
    currentPage = page;
    try { localStorage.setItem(childKey(LAST_PAGE_KEY), page.id); } catch (_) { /* optional */ }
    ops = (drafts[page.id] || []).slice();
    regions = [];
    original = new Map();
    syncButtons();
    pageTitle.textContent = page.name;
    updateSelection();
    pic.replaceChildren();
    pic.setAttribute('aria-busy', 'true');
    let svgText = page.svg;
    if (!svgText && page.src) {
      try {
        svgText = await loadExternalSvg(page.src);
      } catch (error) {
        if (!alive || request !== pageRequest) return;
        console.error(`Coloring page ${page.src} could not be loaded.`, error);
        // Allow a failed download to be retried by reselecting the picture.
        EXTERNAL_SVG_CACHE.delete(page.src);
        pic.textContent = 'Picture could not load. Choose another picture, then try again.';
        pic.removeAttribute('aria-busy');
        return;
      }
    }
    if (!alive || request !== pageRequest || !svgText) return;

    pic.innerHTML = svgText;
    pic.removeAttribute('aria-busy');
    pic.classList.toggle('portrait-page', Boolean(page.portrait));
    pic.classList.remove('pop-in');
    void pic.offsetWidth;
    pic.classList.add('pop-in');
    regions = [...pic.querySelectorAll('[data-region]')];
    original = new Map(regions.map(part => [part, part.getAttribute('fill')]));
    // A redesigned page can have different regions from an older draft.
    // Keep matching fills; obsolete names must not become phantom Undo steps.
    ops = ops.filter(([name]) => regions.some(part => part.getAttribute('data-region') === name));
    paint();
    regions.forEach(region => {
      region.addEventListener('pointerdown', event => {
        if (!alive || finishing || request !== pageRequest) return;
        event.preventDefault();
        const regionName = region.getAttribute('data-region');
        // Tapping a region with the color it already has changes nothing,
        // so it is not an undo step either.
        if (region.getAttribute('fill') !== selected) {
          ops.push([regionName, selected]);
          ops = compact(ops);
          regions
            .filter(part => part.getAttribute('data-region') === regionName)
            .forEach(part => part.setAttribute('fill', selected));
          persist();
          syncButtons();
        }
        audio.sparkle();
      });
    });
    if (first) speech.speak(TXT.colorIntro(page.name), { interrupt: false });
    const a = animal(page.id);
    const sound = page.sound || (a && a.sound);
    if (sound) {
      const audioName = 'coloring:' + page.id;
      audio.load(audioName, sound).then(() => {
        if (alive && request === pageRequest) audio.play(audioName, { maxDuration: 2.2 });
      });
    }
  }

  renderPictures();
  setReprompt(() => speech.speak(TXT.colorReprompt));
  loadPage(currentPage, true);
  return () => {
    alive = false;
    ++pageRequest;
    clearTimeout(finishTimer);
    galleryOverlay?.remove();
    stage.removeEventListener('keydown', handleSidebarKey);
    stage.classList.remove('coloring-game', 'sidebar-open');
  };
}

export default {
  id: 'coloring',
  title: 'Coloring',
  icon: ICON,
  start,
};
