/**
 * Deterministic pseudo-random number generation.
 *
 * Every synthetic dataset in this portfolio is produced from a fixed seed, so the
 * same customers, transactions, ledger entries and pipeline records are generated
 * on every machine, in every browser, and in every test run.
 *
 * Algorithm: mulberry32 (small, fast, well-distributed 32-bit generator).
 */
export type Rng = {
  /** float in [0, 1) */
  next(): number;
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number;
  /** float in [min, max) rounded to 2 decimals (money) */
  money(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
};

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    money: (min, max) => Math.round((min + next() * (max - min)) * 100) / 100,
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  };
}

/** Stable 32-bit FNV-1a hash, used to fingerprint datasets in tests and on screen. */
export function fingerprint(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
