/**
 * Mulberry32 seeded PRNG — deterministic word list from room code.
 * All players in the same room get identical words[].
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededWordList(wordPool: readonly string[], count: number, seed: number): string[] {
  const rand = mulberry32(seed)
  return Array.from({ length: count }, () => wordPool[Math.floor(rand() * wordPool.length)])
}
