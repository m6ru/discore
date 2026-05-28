import { describe, expect, it } from "vitest";
import { isSegmentComplete } from "./segments";
import { makeScoreLookupKey, type Participant } from "./types";

const ALICE: Participant = { id: "p-alice" };
const BOB: Participant = { id: "p-bob" };

function lookup(entries: Array<[string, string, number]>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [participantId, holeId, strokes] of entries) {
    map.set(makeScoreLookupKey(participantId, holeId), strokes);
  }
  return map;
}

describe("isSegmentComplete", () => {
  it("returns false when no holes are given", () => {
    expect(isSegmentComplete([], [ALICE], new Map())).toBe(false);
  });

  it("returns false when no participants are given", () => {
    expect(isSegmentComplete(["h1"], [], new Map())).toBe(false);
  });

  it("returns false when any cell is missing", () => {
    const map = lookup([
      ["p-alice", "h1", 3],
      ["p-bob", "h1", 4],
      ["p-alice", "h2", 5],
      // missing: bob/h2
    ]);
    expect(isSegmentComplete(["h1", "h2"], [ALICE, BOB], map)).toBe(false);
  });

  it("returns true only when every (participant, hole) cell has a value", () => {
    const map = lookup([
      ["p-alice", "h1", 3],
      ["p-alice", "h2", 4],
      ["p-bob", "h1", 5],
      ["p-bob", "h2", 6],
    ]);
    expect(isSegmentComplete(["h1", "h2"], [ALICE, BOB], map)).toBe(true);
  });
});
