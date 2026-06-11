import { describe, expect, it } from "vitest";
import { buildTeePositionMap } from "./tee-order";
import { makeScoreLookupKey, type Hole, type Participant } from "./types";

const HOLES: Hole[] = [
  { id: "h1", hole_number: 1, par: 3 },
  { id: "h2", hole_number: 2, par: 4 },
  { id: "h3", hole_number: 3, par: 3 },
];

const PARTICIPANTS: Participant[] = [
  { id: "p-alice" },
  { id: "p-bob" },
  { id: "p-carol" },
];

function mkLookup(entries: Array<[string, string, number]>): Map<string, number> {
  const map = new Map<string, number>();
  for (const [pid, hid, strokes] of entries) {
    map.set(makeScoreLookupKey(pid, hid), strokes);
  }
  return map;
}

describe("buildTeePositionMap", () => {
  it("uses join order on the first hole", () => {
    const positions = buildTeePositionMap(HOLES, 0, PARTICIPANTS, mkLookup([]));
    expect(positions.get("p-alice")).toBe(1);
    expect(positions.get("p-bob")).toBe(2);
    expect(positions.get("p-carol")).toBe(3);
  });

  it("tees off lowest score on the previous hole first", () => {
    const lookup = mkLookup([
      ["p-alice", "h1", 4],
      ["p-bob", "h1", 3],
      ["p-carol", "h1", 5],
    ]);
    const positions = buildTeePositionMap(HOLES, 1, PARTICIPANTS, lookup);
    expect(positions.get("p-bob")).toBe(1);
    expect(positions.get("p-alice")).toBe(2);
    expect(positions.get("p-carol")).toBe(3);
  });

  it("walks back an extra hole when the previous hole is tied", () => {
    const lookup = mkLookup([
      ["p-alice", "h1", 3],
      ["p-bob", "h1", 4],
      ["p-alice", "h2", 4],
      ["p-bob", "h2", 4],
    ]);
    const positions = buildTeePositionMap(HOLES, 2, PARTICIPANTS, lookup);
    expect(positions.get("p-alice")).toBe(1);
    expect(positions.get("p-bob")).toBe(2);
  });
});
