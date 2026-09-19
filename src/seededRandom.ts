import type { Random } from './sessionClock';

/** Park–Miller LCG: a deterministic stand-in for `Math.random`. */
export function seededRandom(seed: number): Random {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
