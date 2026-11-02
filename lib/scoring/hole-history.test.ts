import { describe, expect, it } from "vitest";
import { formatHoleHistory, pickWhereItWent, type HoleHistory } from "./hole-history";

const history = (usual: number, best: number, timesPlayed = 3): HoleHistory => ({
  timesPlayed,
  usualStrokes: usual,
  bestStrokes: best,
  obCount: 0,
});

describe("formatHoleHistory", () => {
  it("shows usual and best", () => {
    expect(formatHoleHistory(history(4, 3))).toBe("Usually 4 · best 3");
  });

  it("drops best when it equals the usual", () => {
    expect(formatHoleHistory(history(3, 3))).toBe("Usually 3");
  });

  it("says last time after a single round", () => {
    expect(formatHoleHistory(history(5, 5, 1))).toBe("Last time 5");
  });

  it("is empty without history", () => {
    expect(formatHoleHistory(undefined)).toBeNull();
  });
});

describe("pickWhereItWent", () => {
  const byHole = new Map<string, HoleHistory>([
    ["h1", history(3, 2)],
    ["h2", history(4, 3)],
    ["h3", history(3, 3)],
    ["h4", history(3, 3, 1)],
  ]);

  it("lists the holes that cost the most, worst first, with OB", () => {
    expect(
      pickWhereItWent(
        [
          { holeId: "h1", holeNumber: 1, strokes: 4, ob: false },
          { holeId: "h2", holeNumber: 2, strokes: 7, ob: true },
          { holeId: "h3", holeNumber: 3, strokes: 5, ob: false },
        ],
        byHole
      )
    ).toEqual(["Hole 2: 7, usually 4, OB", "Hole 3: 5, usually 3"]);
  });

  it("ignores holes at or under the usual and holes with too little history", () => {
    expect(
      pickWhereItWent(
        [
          { holeId: "h1", holeNumber: 1, strokes: 3, ob: false },
          { holeId: "h4", holeNumber: 4, strokes: 8, ob: false },
        ],
        byHole
      )
    ).toEqual([]);
  });
});
