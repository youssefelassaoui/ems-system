/** Small seeded generator (LCG) → [0, 1). Deterministic, so textures and maps are stable between renders. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Roughly normal sample (mean 0, σ 1) from a uniform generator. */
export const gaussian = (rand: () => number) => (rand() + rand() + rand() + rand() - 2) * 1.732;
