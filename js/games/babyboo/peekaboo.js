// A round is temporary: leaving/reloading always brings Boo safely back.
// Only the first completed game is remembered by the per-child world save.
export const playingPeekaboo = p => ['hiding', 'hidden', 'revealing'].includes(p.phase);
export function createPeekaboo() {
  return { phase: 'idle', spot: -1, elapsed: 0, from: null, wiggles: [0, 0, 0] };
}
export function beginPeekaboo(p, from) {
  if (playingPeekaboo(p)) return false;
  p.phase = 'hiding'; p.spot = (p.spot + 1) % 3; p.elapsed = 0;
  p.from = from; p.wiggles = [0, 0, 0];
  return true;
}
export function choosePumpkin(p, spot) {
  if (p.phase !== 'hidden' || !Number.isInteger(spot) || spot < 0 || spot > 2) return null;
  if (spot !== p.spot) { p.wiggles[spot] = .7; return 'rustle'; }
  p.phase = 'revealing'; p.elapsed = 0;
  return 'found';
}
export function stepPeekaboo(p, dt) {
  p.wiggles = p.wiggles.map(n => Math.max(0, n - dt));
  if (!['hiding', 'revealing'].includes(p.phase)) return null;
  p.elapsed += dt;
  if (p.phase === 'hiding' && p.elapsed >= 1.6) {
    p.phase = 'hidden'; p.elapsed = 0; return 'hidden';
  }
  if (p.phase === 'revealing' && p.elapsed >= 1.1) {
    p.phase = 'found'; p.elapsed = 0; return 'complete';
  }
  return null;
}
