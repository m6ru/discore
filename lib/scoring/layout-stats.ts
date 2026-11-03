/** Course stats helpers (BLUEPRINT §8a, A and C + G). */

/** How many rounds each end of the trend sentence averages. */
const TREND_WINDOW = 3;

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatAverageVsPar(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return "E";
  }
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1).replace("-", "−");
}

/**
 * "Your last 3 average +1.0, the first 3 +5.0. Getting better."
 * Needs at least two rounds on each side; null before that.
 */
export function formatTrend(vsParOldestFirst: number[]): string | null {
  const window = Math.min(TREND_WINDOW, Math.floor(vsParOldestFirst.length / 2));
  if (window < 2) {
    return null;
  }
  const first = average(vsParOldestFirst.slice(0, window));
  const last = average(vsParOldestFirst.slice(-window));
  const verdict =
    last <= first - 1 ? "Getting better." : last >= first + 1 ? "A bit worse lately." : "Holding steady.";
  return `Your last ${window} average ${formatAverageVsPar(last)}, the first ${window} ${formatAverageVsPar(first)}. ${verdict}`;
}

export type HoleLossInput = {
  holeNumber: number;
  par: number;
  timesPlayed: number;
  avgVsPar: number | null;
  obCount: number;
  doublePlusCount: number;
  /** Strokes of the most common result, or null when that is double bogey or worse. */
  usualStrokes: number | null;
};

/** A share at or above this reads as "often". */
const OFTEN_SHARE = 1 / 3;

/** "OB 2 in 6 · often double", falling back to "Usually 5". */
export function formatHolePattern(hole: HoleLossInput): string {
  const parts: string[] = [];
  if (hole.obCount > 0) {
    parts.push(`OB ${hole.obCount} in ${hole.timesPlayed}`);
  }
  if (hole.timesPlayed > 0 && hole.doublePlusCount / hole.timesPlayed >= OFTEN_SHARE) {
    parts.push("often double");
  }
  if (parts.length === 0) {
    return hole.usualStrokes !== null ? `Usually ${hole.usualStrokes}` : "Usually double or worse";
  }
  return parts.join(" · ");
}

/** Holes that cost strokes on average, worst first (ties: lower hole number). */
export function rankHolesByLoss<T extends HoleLossInput>(holes: T[]): T[] {
  return holes
    .filter((hole) => hole.avgVsPar !== null && hole.avgVsPar > 0)
    .sort((a, b) => b.avgVsPar! - a.avgVsPar! || a.holeNumber - b.holeNumber);
}

/** Scorecard tone for a hole's average against par. */
export function holeLossTone(avgVsPar: number | null): "good" | "over" | "overStrong" | null {
  if (avgVsPar === null) {
    return null;
  }
  if (avgVsPar >= 1) {
    return "overStrong";
  }
  if (avgVsPar > 0) {
    return "over";
  }
  return avgVsPar < 0 ? "good" : null;
}
