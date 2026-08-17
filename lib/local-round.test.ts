import { describe, expect, it } from "vitest";
import {
  createLocalTrial,
  isLocalTrialFullyScored,
  parseLocalTrial,
  validateLocalTrialForClaim,
  type LocalTrialRound,
} from "./local-round";

const HOLES = [
  { id: "h1", hole_number: 1, par: 3, distance_m: 90, notes: null },
  { id: "h2", hole_number: 2, par: 4, distance_m: 110, notes: "basket right" },
];

function completedTrial(overrides: Partial<LocalTrialRound> = {}): LocalTrialRound {
  return {
    version: 1,
    claimId: "claim-1",
    status: "completed",
    layoutId: "layout-1",
    courseName: "Test Park",
    courseSlug: "test-park",
    layoutName: "White",
    startedAt: "2026-08-17T08:00:00.000Z",
    completedAt: "2026-08-17T09:30:00.000Z",
    holes: HOLES,
    scores: [
      { holeId: "h1", strokes: 3, ob: false },
      { holeId: "h2", strokes: 5, ob: true },
    ],
    ...overrides,
  };
}

describe("parseLocalTrial", () => {
  it("accepts a valid v1 round", () => {
    const parsed = parseLocalTrial(completedTrial());
    expect(parsed?.claimId).toBe("claim-1");
    expect(parsed?.holes).toHaveLength(2);
    expect(parsed?.scores[1]?.ob).toBe(true);
  });

  it("rejects a wrong version or empty holes", () => {
    expect(parseLocalTrial({ ...completedTrial(), version: 2 })).toBeNull();
    expect(parseLocalTrial({ ...completedTrial(), holes: [] })).toBeNull();
  });
});

describe("createLocalTrial", () => {
  it("starts active with holes in number order", () => {
    const round = createLocalTrial({
      layoutId: "layout-1",
      courseName: "Test Park",
      courseSlug: "test-park",
      layoutName: "White",
      holes: [HOLES[1]!, HOLES[0]!],
    });
    expect(round.status).toBe("active");
    expect(round.scores).toEqual([]);
    expect(round.holes.map((hole) => hole.hole_number)).toEqual([1, 2]);
    expect(round.claimId.length).toBeGreaterThan(0);
  });
});

describe("isLocalTrialFullyScored / validateLocalTrialForClaim", () => {
  it("requires every hole scored before claim", () => {
    const incomplete = completedTrial({
      status: "active",
      completedAt: null,
      scores: [{ holeId: "h1", strokes: 3, ob: false }],
    });
    expect(isLocalTrialFullyScored(incomplete)).toBe(false);
    expect(validateLocalTrialForClaim(incomplete)).toBe("Trial is not completed.");
  });

  it("accepts a fully scored completed round", () => {
    const round = completedTrial();
    expect(isLocalTrialFullyScored(round)).toBe(true);
    expect(validateLocalTrialForClaim(round)).toBeNull();
  });

  it("rejects strokes outside 1-25", () => {
    const round = completedTrial({
      scores: [
        { holeId: "h1", strokes: 0, ob: false },
        { holeId: "h2", strokes: 5, ob: false },
      ],
    });
    expect(validateLocalTrialForClaim(round)).toBe("Trial has an invalid stroke count.");
  });
});
