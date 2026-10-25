// Serializable adventure rules. Rendering and travel never own an item: this
// one model keeps tap, drag, scene changes, reloads and boat delivery consistent.
export const SCENES = ['home', 'path', 'pond', 'patch'];
export const ITEMS = ['leaf', 'candy', 'flower'];
const LOCATIONS = [...SCENES, 'held', 'boat', 'basket', 'shared'];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function createState(saved) {
  const s = {
    version: 1, scene: 'home', held: null,
    items: { leaf: 'path', candy: 'basket', flower: 'path' },
    dropped: {}, boat: { phase: 'none', cargo: null, progress: 0 },
    memories: { shared: false, boat: false, home: false, flower: false, peekaboo: false },
  };
  if (!saved || saved.version !== 1) return s;
  if (SCENES.includes(saved.scene)) s.scene = saved.scene;
  for (const name of ITEMS) {
    const allowed = name === 'leaf' ? LOCATIONS.filter(x => !['basket','shared'].includes(x))
      : name === 'candy' ? LOCATIONS.filter(x => x !== 'shared') : LOCATIONS.filter(x => x !== 'basket');
    if (allowed.includes(saved.items?.[name])) s.items[name] = saved.items[name];
    const d = saved.dropped?.[name];
    if (d && Number.isFinite(d.x)) s.dropped[name] = { x: clamp(d.x, .15, .85) };
  }
  if (ITEMS.includes(saved.held)) s.held = saved.held;
  // Repair incomplete or older saved gestures, never strand an item.
  for (const name of ITEMS) {
    if (name === s.held) s.items[name] = 'held';
    else if (s.items[name] === 'held') s.items[name] = name === 'candy' ? 'basket' : 'path';
  }
  if (['ready', 'sailing', 'arrived', 'returning'].includes(saved.boat?.phase)
      && s.items.leaf === 'boat') {
    s.boat.phase = saved.boat.phase;
    s.boat.progress = Number.isFinite(saved.boat.progress) ? clamp(saved.boat.progress, 0, 1) : 0;
    if (['candy', 'flower'].includes(saved.boat.cargo) && saved.boat.cargo !== s.held) {
      s.boat.cargo = saved.boat.cargo;
      s.items[s.boat.cargo] = 'boat';
    }
  } else if (s.items.leaf === 'boat') {
    s.items.leaf = 'pond';
  }
  for (const name of ['candy', 'flower']) {
    if (s.items[name] === 'boat' && s.boat.cargo !== name) s.items[name] = name === 'candy' ? 'basket' : 'path';
  }
  for (const key of Object.keys(s.memories)) s.memories[key] = saved.memories?.[key] === true;
  return s;
}

export function dropHeld(s, x = .5) {
  if (!s.held) return false;
  s.items[s.held] = s.scene;
  s.dropped[s.held] = { x: clamp(x, .16, .84) };
  s.held = null;
  return true;
}

export function take(s, item, x = .5) {
  if (!ITEMS.includes(item)) return false;
  const location = s.items[item];
  if (location !== s.scene && !(item === 'candy' && location === 'basket' && ['home', 'pond'].includes(s.scene))) return false;
  if (s.held) dropHeld(s, x);
  s.items[item] = 'held';
  s.held = item;
  delete s.dropped[item];
  return true;
}

export function placeLeaf(s) {
  if (s.scene !== 'pond' || s.held !== 'leaf' || s.boat.phase !== 'none') return false;
  s.held = null;
  s.items.leaf = 'boat';
  s.boat = { phase: 'ready', cargo: null, progress: 0 };
  return true;
}

export function loadBoat(s) {
  if (s.scene !== 'pond' || s.boat.phase !== 'ready' || s.boat.cargo || !['candy', 'flower'].includes(s.held)) return false;
  s.boat.cargo = s.held;
  s.items[s.held] = 'boat';
  s.held = null;
  return true;
}

export function share(s) {
  if (s.held === 'candy') {
    s.held = null;
    s.items.candy = 'basket';
    s.memories.shared = true;
    return 'candy';
  }
  if (s.held === 'flower') {
    s.held = null;
    s.items.flower = 'shared';
    s.memories.flower = true;
    return 'flower';
  }
  return null;
}

export function ripple(s) {
  if (s.scene !== 'pond' || !['ready', 'sailing'].includes(s.boat.phase)) return false;
  s.boat.phase = 'sailing';
  s.boat.progress = Math.min(.98, s.boat.progress + .16);
  return true;
}

// Returns a single event at each boundary so a rapid tap or a resumed tab cannot
// duplicate candy consumption, celebration, or the recorded activity outcome.
export function stepBoat(s, dt) {
  if (s.scene !== 'pond') return null;
  const b = s.boat;
  if (b.phase === 'sailing') {
    b.progress = Math.min(1, b.progress + dt * .13);
    if (b.progress >= 1) { b.phase = 'arrived'; b.progress = 0; return 'arrived'; }
  } else if (b.phase === 'arrived') {
    b.progress += dt;
    if (b.progress >= 1.2) {
      const cargo = b.cargo;
      if (cargo === 'candy') { s.items.candy = 'basket'; s.memories.shared = true; }
      if (cargo === 'flower') { s.items.flower = 'shared'; s.memories.flower = true; }
      if (cargo) s.memories.boat = true;
      b.cargo = null; b.phase = 'returning'; b.progress = 0;
      return cargo || 'empty';
    }
  } else if (b.phase === 'returning') {
    b.progress = Math.min(1, b.progress + dt * .36);
    if (b.progress >= 1) { b.phase = 'ready'; b.progress = 0; return 'ready'; }
  }
  return null;
}

export function visit(s, scene) {
  if (!SCENES.includes(scene)) return false;
  s.scene = scene;
  if (scene === 'home' && s.memories.boat) s.memories.home = true;
  return true;
}

export function nextHint(s) {
  if (s.scene === 'patch') return s.held === 'candy' || s.held === 'flower' ? 'monster' : s.held === 'leaf' ? 'previous' : 'peekaboo';
  if (s.held === 'candy') return s.scene === 'pond' && s.boat.phase === 'ready' && !s.boat.cargo ? 'boat' : 'monster';
  if (s.held === 'flower') return s.scene === 'pond' && s.boat.phase === 'ready' && !s.boat.cargo ? 'boat' : 'mommy';
  if (s.held === 'leaf') return s.scene === 'pond' ? 'dock' : 'next';
  if (s.scene === 'home') return s.memories.shared ? 'next' : 'basket';
  if (s.scene === 'path') return s.items.leaf === 'path' ? 'leaf' : 'next';
  if (s.boat.phase === 'none') return s.items.leaf === 'pond' ? 'leaf' : 'previous';
  if (s.boat.phase === 'ready') return s.boat.cargo ? 'water' : 'basket';
  return 'water';
}
