// Children: up to four children can share one device, each with their own
// avatar, name, stickers, pictures, tunes, faces, photos, progress, learning
// stage and game choices. Parent things (volume, voice, recordings, calm and
// bedtime) stay shared. Everything is local; there are no accounts.
//
// Storage: per-child data lives under the same keys as before, suffixed with
// "::<child id>" — except for the first child, who keeps the original
// un-suffixed keys, so a device that already had one child's stickers and
// progress before profiles existed keeps all of it as child one.

import { animal } from '../data/animals.js';

const CHILDREN_KEY = 'tinytaps-children';
const LEGACY_NAME_KEY = 'tinytaps-child-name';
const FIRST = 'c1';
export const MAX_CHILDREN = 4;

// Animal friends a child can choose as their picture.
export const AVATARS = ['bunny', 'bear', 'cat', 'dog', 'duck', 'lion', 'monkey', 'frog', 'elephant', 'owl', 'pig', 'giraffe']
  .filter(id => animal(id));

let cache = null;

function storage() {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch (e) { return null; }
}

function load() {
  if (cache) return cache;
  const ls = storage();
  let data = null;
  try { data = ls && JSON.parse(ls.getItem(CHILDREN_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || !Array.isArray(data.list) || !data.list.length) {
    // First run with profiles: whatever was saved so far is child one's,
    // including the name a parent may already have typed for Trace It.
    let name = '';
    try { name = (ls && ls.getItem(LEGACY_NAME_KEY)) || ''; } catch (e) { /* optional */ }
    data = { active: FIRST, list: [{ id: FIRST, name: tidyName(name), avatar: AVATARS[0] }] };
  }
  data.list = data.list.filter(c => c && typeof c.id === 'string').map(c => ({
    id: c.id, name: tidyName(c.name), avatar: AVATARS.includes(c.avatar) ? c.avatar : AVATARS[0],
  }));
  if (!data.list.some(c => c.id === FIRST)) data.list.unshift({ id: FIRST, name: '', avatar: AVATARS[0] });
  if (!data.list.some(c => c.id === data.active)) data.active = FIRST;
  cache = data;
  return cache;
}

function save() {
  const ls = storage();
  if (!ls) return;
  try { ls.setItem(CHILDREN_KEY, JSON.stringify(cache)); } catch (e) { /* optional */ }
}

function tidyName(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 16);
}

// The storage key for a per-child setting, for whoever is playing now.
export function childKey(base) {
  const id = load().active;
  return id === FIRST ? base : `${base}::${id}`;
}

export function children() {
  return load().list.map(c => ({ ...c }));
}

export function activeChild() {
  const data = load();
  return { ...data.list.find(c => c.id === data.active) };
}

export function setActive(id) {
  const data = load();
  if (!data.list.some(c => c.id === id)) return;
  data.active = id;
  save();
}

export function avatarArt(child) {
  const a = animal(child.avatar) || animal(AVATARS[0]);
  return a.art;
}

// Shown wherever a name is needed and none was typed.
export function displayName(child) {
  if (child.name) return child.name;
  const n = load().list.findIndex(c => c.id === child.id);
  return `Child ${n + 1}`;
}

export function addChild() {
  const data = load();
  if (data.list.length >= MAX_CHILDREN) return null;
  let n = 2;
  while (data.list.some(c => c.id === `c${n}`)) n++;
  const used = new Set(data.list.map(c => c.avatar));
  const child = { id: `c${n}`, name: '', avatar: AVATARS.find(a => !used.has(a)) || AVATARS[0] };
  data.list.push(child);
  save();
  return { ...child };
}

export function updateChild(id, patch) {
  const data = load();
  const child = data.list.find(c => c.id === id);
  if (!child) return;
  if ('name' in patch) child.name = tidyName(patch.name);
  if ('avatar' in patch && AVATARS.includes(patch.avatar)) child.avatar = patch.avatar;
  save();
}

// Removes a child and everything saved for them. Child one cannot be
// removed (their data is the device's original data); rename them instead.
export function removeChild(id) {
  const data = load();
  if (id === FIRST || !data.list.some(c => c.id === id)) return false;
  data.list = data.list.filter(c => c.id !== id);
  if (data.active === id) data.active = FIRST;
  save();
  const ls = storage();
  if (ls) {
    const suffix = `::${id}`;
    for (let i = ls.length - 1; i >= 0; i--) {
      const key = ls.key(i);
      if (key && key.endsWith(suffix)) ls.removeItem(key);
    }
  }
  return true;
}

export function isFirst(id) {
  return id === FIRST;
}
