import { describe, expect, it } from "vitest";
import { buildFinishRankMap, buildLeaderboard } from "./leaderboard";
import { makeScoreLookupKey, type Hole, type Participant } from "./types";

const HOLES: Hole[] = [
  { id: "h1", hole_number: 1, par: 3 },
  { id: "h2", hole_number: 2, par: 4 },
  { id: "h3", hole_number: 3, par: 5 },
];

function mkLookup(entries: Array<[string, string, number]>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [pid, hid, strokes] of entries) {
    map.set(makeScoreLookupKey(pid, hid), strokes);
  }
  return map;
}

const PARTICIPANTS: Participant[] = [
  { id: "p-alice" },
  { id: "p-bob" },
  { id: "p-carol" },
];

const LABELS: Record<string, string> = {
  "p-alice": "Alice",
  "p-bob": "Bob",
  "p-carol": "Carol",
};

const labelFor = (id: string) => LABELS[id] ?? id;

describe("buildLeaderboard", () => {
  it("orders by vsPar ascending, then by total strokes, then alphabetically", () => {
    const lookup = mkLookup([
      ["p-alice", "h1", 3],
      ["p-alice", "h2", 3],
      ["p-alice", "h3", 4],
      ["p-bob", "h1", 4],
      ["p-bob", "h2", 4],
      ["p-bob", "h3", 6],
      ["p-carol", "h1", 2],
      ["p-carol", "h2", 5],
      ["p-carol", "h3", 5],
    ]);
    // Par totals: 12. Alice 10 (-2), Bob 14 (+2), Carol 12 (E).
    const rows = buildLeaderboard(PARTICIPANTS, HOLES, lookup, labelFor);
    expect(rows.map((r) => r.label)).toEqual(["Alice", "Carol", "Bob"]);
    expect(rows.map((r) => r.vsPar)).toEqual([-2, 0, 2]);
  });

  it("pushes participants with thru=0 to the bottom in label order", () => {
    const lookup = mkLookup([
      ["p-alice", "h1", 3],
      ["p-alice", "h2", 4],
      ["p-alice", "h3", 5], // vsPar 0
      // Bob and Carol have no scores yet.
    ]);
    const rows = buildLeaderboard(PARTICIPANTS, HOLES, lookup, labelFor);
    expect(rows.map((r) => r.label)).toEqual(["Alice", "Bob", "Carol"]);
    expect(rows[1].thru).toBe(0);
    expect(rows[2].thru).toBe(0);
  });

  it("breaks vsPar ties by total strokes", () => {
    const participants: Participant[] = [{ id: "x" }, { id: "y" }];
    const lookup = mkLookup([
      ["x", "h1", 3], // par 3 → 0
      ["y", "h1", 3],
      ["y", "h2", 4], // par 7 over 2 holes vs strokes 7 → 0
    ]);
    const rows = buildLeaderboard(participants, HOLES, lookup, (id) => id);
    // Both at vsPar=0; y has more strokes (7), so x (3) ranks first.
    expect(rows.map((r) => r.participantId)).toEqual(["x", "y"]);
  });
});

describe("buildFinishRankMap", () => {
  it("assigns ranks by competitive order regardless of join order", () => {
    const lookup = mkLookup([
      ["p-alice", "h1", 4],
      ["p-bob", "h1", 3],
      ["p-carol", "h1", 5],
    ]);
    const ranks = buildFinishRankMap(PARTICIPANTS, HOLES, lookup, labelFor);
    expect(ranks.get("p-bob")).toBe(1);
    expect(ranks.get("p-alice")).toBe(2);
    expect(ranks.get("p-carol")).toBe(3);
  });
});
