import { describe, expect, it } from "vitest";
import {
  formatVsPar,
  getFirstIncompleteHoleIndex,
  getTotalStrokes,
  segmentPlayerStats,
} from "./stats";
import { makeScoreLookupKey, type Hole, type HoleScore, type Participant } from "./types";

const HOLES: Hole[] = [
  { id: "h1", hole_number: 1, par: 3 },
  { id: "h2", hole_number: 2, par: 4 },
  { id: "h3", hole_number: 3, par: 5 },
];

const ALICE: Participant = { id: "p-alice" };
const BOB: Participant = { id: "p-bob" };

function buildLookup(scores: HoleScore[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of scores) {
    map.set(makeScoreLookupKey(s.participant_id, s.hole_id), s.strokes);
  }
  return map;
}

describe("formatVsPar", () => {
  it("returns 'E' for even par", () => {
    expect(formatVsPar(0)).toBe("E");
  });
  it("prefixes positives with '+'", () => {
    expect(formatVsPar(2)).toBe("+2");
  });
  it("renders negatives unchanged", () => {
    expect(formatVsPar(-3)).toBe("-3");
  });
});

describe("segmentPlayerStats", () => {
  it("only counts holes where the participant has a strokes value", () => {
    const lookup = buildLookup([
      { participant_id: "p-alice", hole_id: "h1", strokes: 3 },
      { participant_id: "p-alice", hole_id: "h2", strokes: 5 },
    ]);
    const stats = segmentPlayerStats("p-alice", HOLES, lookup);
    expect(stats.totalStrokes).toBe(8);
    expect(stats.thru).toBe(2);
    expect(stats.vsPar).toBe(8 - (3 + 4));
  });

  it("returns zeros when the participant has no scores", () => {
    const stats = segmentPlayerStats("p-alice", HOLES, new Map());
    expect(stats).toEqual({ totalStrokes: 0, vsPar: 0, thru: 0 });
  });
});

describe("getFirstIncompleteHoleIndex", () => {
  it("returns 0 when nothing is scored", () => {
    expect(getFirstIncompleteHoleIndex(HOLES, [ALICE, BOB], [])).toBe(0);
  });

  it("returns the first hole where any participant is missing", () => {
    const scores: HoleScore[] = [
      { participant_id: "p-alice", hole_id: "h1", strokes: 3 },
      { participant_id: "p-bob", hole_id: "h1", strokes: 4 },
      { participant_id: "p-alice", hole_id: "h2", strokes: 4 },
      // Bob has not played h2 yet.
    ];
    expect(getFirstIncompleteHoleIndex(HOLES, [ALICE, BOB], scores)).toBe(1);
  });

  it("returns the last hole index when the round is complete", () => {
    const scores: HoleScore[] = HOLES.flatMap((h) => [
      { participant_id: "p-alice", hole_id: h.id, strokes: 3 },
      { participant_id: "p-bob", hole_id: h.id, strokes: 4 },
    ]);
    expect(getFirstIncompleteHoleIndex(HOLES, [ALICE, BOB], scores)).toBe(HOLES.length - 1);
  });

  it("returns 0 when there are no holes or no participants", () => {
    expect(getFirstIncompleteHoleIndex([], [ALICE], [])).toBe(0);
    expect(getFirstIncompleteHoleIndex(HOLES, [], [])).toBe(0);
  });
});

describe("getTotalStrokes", () => {
  it("sums strokes for the requested participant across the target holes only", () => {
    const scores: HoleScore[] = [
      { participant_id: "p-alice", hole_id: "h1", strokes: 3 },
      { participant_id: "p-alice", hole_id: "h2", strokes: 5 },
      { participant_id: "p-alice", hole_id: "h3", strokes: 4 },
      { participant_id: "p-bob", hole_id: "h1", strokes: 9 },
    ];
    expect(getTotalStrokes(scores, "p-alice", ["h1", "h2"])).toBe(8);
    expect(getTotalStrokes(scores, "p-alice", [])).toBe(0);
  });
});
