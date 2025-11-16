/**
 * Create a deterministic pseudo-random number generator from a seed string
 * Uses FNV-1a hash for seeding and a simple PRNG algorithm
 * @param seed - String to use as seed (e.g., building ID)
 * @returns Function that returns random numbers between 0 and 1
 */
export function createDeterministicRNG(seed: string): () => number {
  // FNV-1a hash to convert seed string to number
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  // Return PRNG function
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
