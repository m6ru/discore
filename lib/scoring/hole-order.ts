import type { Hole } from "./types";

/** Holes sorted by `hole_number` ascending. */
export function sortHolesByNumber<T extends Hole>(holes: readonly T[]): T[] {
  return [...holes].sort((a, b) => a.hole_number - b.hole_number);
}

/**
 * Play order for a full round: start at `startingHole`, then continue through
 * the layout (e.g. start 10 → 10…18, 1…9). Invalid or hole 1 keeps numeric order.
 */
export function orderHolesForPlay<T extends Hole>(
  holes: readonly T[],
  startingHole: number
): T[] {
  const sorted = sortHolesByNumber(holes);
  if (sorted.length === 0 || startingHole <= 1) {
    return sorted;
  }

  const startIdx = sorted.findIndex((hole) => hole.hole_number === startingHole);
  if (startIdx <= 0) {
    return sorted;
  }

  return [...sorted.slice(startIdx), ...sorted.slice(0, startIdx)];
}
