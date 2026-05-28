import { describe, expect, it } from "vitest";
import { buildHoleProgress } from "./progress";
import { makeScoreLookupKey, type Hole, type Participant } from "./types";

const HOLES: Hole[] = [
  { id: "h1", hole_number: 1, par: 3 },
  { id: "h2", hole_number: 2, par: 4 },
  { id: "h3", hole_number: 3, par: 5 },
];

const ALICE: Participant = { id: "p-alice" };
const BOB: Participant = { id: "p-bob" };

function mkLookup(entries: Array<[string, string, number]>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [pid, hid, strokes] of entries) {
    map.set(makeScoreLookupKey(pid, hid), strokes);
  }
  return map;
}

describe("buildHoleProgress", () => {
  it("marks holes where every participant has a score as fully scored", () => {
    const lookup = mkLookup([
      ["p-alice", "h1", 3],
      ["p-bob", "h1", 4],
      ["p-alice", "h2", 5],
    ]);
    const progress = buildHoleProgress(HOLES, [ALICE, BOB], lookup, "h2", true);
    expect(progress[0].allScored).toBe(true);
    expect(progress[1].allScored).toBe(false);
    expect(progress[2].allScored).toBe(false);
  });

  it("only flags the active hole as current when the round is active", () => {
    const progress = buildHoleProgress(HOLES, [ALICE], new Map(), "h2", true);
    expect(progress[0].isCurrent).toBe(false);
    expect(progress[1].isCurrent).toBe(true);
    expect(progress[2].isCurrent).toBe(false);
  });

  it("never marks anything current when the round is inactive", () => {
    const progress = buildHoleProgress(HOLES, [ALICE], new Map(), "h2", false);
    expect(progress.every((entry) => !entry.isCurrent)).toBe(true);
  });

  it("never marks anything scored when there are no participants", () => {
    const progress = buildHoleProgress(HOLES, [], new Map(), null, true);
    expect(progress.every((entry) => !entry.allScored)).toBe(true);
  });
});
