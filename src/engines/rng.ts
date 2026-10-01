/**
 * Deterministic RNG — mulberry32.
 * The dice result is decided by the RNG FIRST; the animation is then guided
 * to land on that result. Seeded + stream-position tracked → fair, replayable,
 * cheat-proof (only the host holds the stream in multiplayer).
 */

export interface RngState {
  seed: number;
  counter: number;
}

/** Pure step: returns value and advances counter immutably. */
export function nextRandom(rs: RngState): number {
  let t = (rs.seed + rs.counter * 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return v;
}

export function rngNextInt(rs: RngState, maxExclusive: number): number {
  return Math.floor(nextRandom(rs) * maxExclusive) % maxExclusive;
}

export function rollDie(rs: RngState): number {
  return rngNextInt(rs, 6) + 1;
}

/** Fisher–Yates using the seeded stream (pure w.r.t. given array copy). */
export function seededShuffle<T>(items: readonly T[], rs: RngState): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rngNextInt(rs, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
