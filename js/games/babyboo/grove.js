// Free play: no tune to copy, score, timer, sound queue or autonomous playback.
// Visual responses remain useful with sound off; all state here is transient.
export const LOG_STEPS = [0, 2, 3]; // C, E, G in the shared soft-bell scale.
export const LOG_COLORS = ['#E7B9EE', '#FFE0A0', '#AFE2CA'];
export function createGrove() {
  return { strikes: [0, 0, 0], lights: [0, 0, 0], lastNote: -1,
    lastTap: -Infinity, notes: 0, sway: 0 };
}
export function tapLog(grove, index, now) {
  if (!Number.isInteger(index) || index < 0 || index >= 3 || !Number.isFinite(now)) return false;
  grove.strikes[index] = 1;
  // A busy finger still gets feedback, without stacking an unbounded chorus.
  if (now - grove.lastTap < .16) return false;
  grove.lastTap = now; grove.lastNote = index; grove.notes++;
  return true;
}
export function stepGrove(grove, dt) {
  const blend = Math.min(1, dt * 9);
  for (let i = 0; i < 3; i++) {
    grove.lights[i] += (grove.strikes[i] - grove.lights[i]) * blend;
    grove.strikes[i] = Math.max(0, grove.strikes[i] - dt * .75);
  }
  const target = Math.max(...grove.strikes);
  grove.sway += (target - grove.sway) * Math.min(1, dt * 4);
}
