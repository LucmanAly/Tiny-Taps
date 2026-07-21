// Private, on-device play history and adaptive difficulty. Nothing leaves the
// browser. The data is deliberately observational: no grades, streaks or age
// comparisons.

const KEY = 'tinytaps-progress-v1';
const LEVELS = 3;

function empty() {
  return { games: {}, recent: [], totalPlays: 0, totalWins: 0, totalMisses: 0 };
}

export function read() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch (e) { return empty(); }
}

function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* optional */ }
}

function game(data, id) {
  if (!data.games[id]) data.games[id] = {
    plays: 0, wins: 0, misses: 0, level: 1, momentum: 0, lastPlayed: 0,
    details: {},
  };
  return data.games[id];
}

export function start(id) {
  const data = read();
  const g = game(data, id);
  g.plays++;
  g.lastPlayed = Date.now();
  data.totalPlays++;
  data.recent = [id, ...data.recent.filter(x => x !== id)].slice(0, 5);
  write(data);
}

export function outcome(id, correct, detail = '') {
  const data = read();
  const g = game(data, id);
  if (correct) {
    g.wins++;
    data.totalWins++;
    g.momentum = Math.min(6, g.momentum + 1);
    if (g.momentum >= 4 && g.level < LEVELS) {
      g.level++;
      g.momentum = 0;
    }
  } else {
    g.misses++;
    data.totalMisses++;
    g.momentum = Math.max(-4, g.momentum - 1);
    if (g.momentum <= -3 && g.level > 1) {
      g.level--;
      g.momentum = 0;
    }
  }
  if (detail) {
    const d = g.details[detail] || { wins: 0, misses: 0 };
    d[correct ? 'wins' : 'misses']++;
    g.details[detail] = d;
  }
  write(data);
  return g.level;
}

export function level(id) {
  return game(read(), id).level || 1;
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* optional */ }
}

export function hardestDetails(id, limit = 3) {
  const g = game(read(), id);
  return Object.entries(g.details || {})
    .filter(([, d]) => d.misses > 0)
    .sort((a, b) => (b[1].misses - b[1].wins) - (a[1].misses - a[1].wins))
    .slice(0, limit)
    .map(([name]) => name);
}
