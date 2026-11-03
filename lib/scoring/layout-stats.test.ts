import { describe, expect, it } from "vitest";
import {
  formatAverageVsPar,
  formatHolePattern,
  formatTrend,
  holeLossTone,
  rankHolesByLoss,
  type HoleLossInput,
} from "./layout-stats";

const hole = (overrides: Partial<HoleLossInput>): HoleLossInput => ({
  holeNumber: 1,
  par: 3,
  timesPlayed: 6,
  avgVsPar: 0,
  obCount: 0,
  doublePlusCount: 0,
  usualStrokes: 3,
  ...overrides,
});

describe("formatAverageVsPar", () => {
  it("formats over, under and even", () => {
    expect(formatAverageVsPar(3.44)).toBe("+3.4");
    expect(formatAverageVsPar(-1.26)).toBe("−1.3");
    expect(formatAverageVsPar(0.04)).toBe("E");
  });
});

describe("formatTrend", () => {
  it("compares the last three rounds with the first three", () => {
    expect(formatTrend([6, 4, 5, 2, 3, -2])).toBe(
      "Your last 3 average +1.0, the first 3 +5.0. Getting better."
    );
  });

  it("uses smaller windows with fewer rounds", () => {
    expect(formatTrend([3, 3, 4, 3])).toBe(
      "Your last 2 average +3.5, the first 2 +3.0. Holding steady."
    );
  });

  it("says when it got worse", () => {
    expect(formatTrend([1, 1, 4, 4])).toBe(
      "Your last 2 average +4.0, the first 2 +1.0. A bit worse lately."
    );
  });

  it("stays quiet with fewer than four rounds", () => {
    expect(formatTrend([2, 1, 0])).toBeNull();
  });
});

describe("formatHolePattern", () => {
  it("names OB and frequent doubles", () => {
    expect(formatHolePattern(hole({ obCount: 2, doublePlusCount: 2 }))).toBe(
      "OB 2 in 6 · often double"
    );
  });

  it("falls back to the usual score", () => {
    expect(formatHolePattern(hole({ usualStrokes: 5 }))).toBe("Usually 5");
  });
});

describe("rankHolesByLoss", () => {
  it("keeps holes over par, worst first", () => {
    const ranked = rankHolesByLoss([
      hole({ holeNumber: 3, avgVsPar: 0.5 }),
      hole({ holeNumber: 7, avgVsPar: 1.5 }),
      hole({ holeNumber: 9, avgVsPar: -0.2 }),
      hole({ holeNumber: 12, avgVsPar: 0.5 }),
    ]);
    expect(ranked.map((h) => h.holeNumber)).toEqual([7, 3, 12]);
  });
});

describe("holeLossTone", () => {
  it("maps averages to scorecard tones", () => {
    expect(holeLossTone(1.5)).toBe("overStrong");
    expect(holeLossTone(0.4)).toBe("over");
    expect(holeLossTone(-0.3)).toBe("good");
    expect(holeLossTone(0)).toBeNull();
  });
});
