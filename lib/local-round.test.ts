import { describe, expect, it } from "vitest";
import {
  addGuestPlayer,
  createLocalTrial,
  isLocalTrialFullyScored,
  parseLocalTrial,
  startLocalTrialPlay,
  validateLocalTrialForClaim,
  type LocalTrialPlayer,
  type LocalTrialRound,
} from "./local-round";

const HOLES = [
  { id: "h1", hole_number: 1, par: 3, distance_m: 90, notes: null },
  { id: "h2", hole_number: 2, par: 4, distance_m: 110, notes: "basket right" },
];

const SCORER: LocalTrialPlayer = { id: "p-me", name: "Kristjan", isScorer: true };
const GUEST: LocalTrialPlayer = { id: "p-mari", name: "Mari", isScorer: false };

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
    players: [SCORER, GUEST],
    scores: [
      { holeId: "h1", playerId: "p-me", strokes: 3, ob: false },
      { holeId: "h1", playerId: "p-mari", strokes: 4, ob: false },
      { holeId: "h2", playerId: "p-me", strokes: 5, ob: true },
      { holeId: "h2", playerId: "p-mari", strokes: 4, ob: false },
    ],
    ...overrides,
  };
}

describe("parseLocalTrial", () => {
  it("accepts a multi-player round", () => {
    const parsed = parseLocalTrial(completedTrial());
    expect(parsed?.players).toHaveLength(2);
    expect(parsed?.scores[2]?.playerId).toBe("p-me");
    expect(parsed?.scores[2]?.ob).toBe(true);
  });

  it("migrates a legacy solo v1 payload to a You player", () => {
    const parsed = parseLocalTrial({
      version: 1,
      claimId: "claim-1",
      status: "active",
      layoutId: "layout-1",
      courseName: "Test Park",
      courseSlug: "test-park",
      layoutName: "White",
      startedAt: "2026-08-17T08:00:00.000Z",
      completedAt: null,
      holes: HOLES,
      scores: [
        { holeId: "h1", strokes: 3, ob: false },
        { holeId: "h2", strokes: 5, ob: true },
      ],
    });
    expect(parsed?.players).toEqual([{ id: "trial", name: "You", isScorer: true }]);
    expect(parsed?.scores[0]).toEqual({ holeId: "h1", playerId: "trial", strokes: 3, ob: false });
  });

  it("rejects a wrong version or empty holes", () => {
    expect(parseLocalTrial({ ...completedTrial(), version: 2 })).toBeNull();
    expect(parseLocalTrial({ ...completedTrial(), holes: [] })).toBeNull();
  });
});

describe("createLocalTrial / startLocalTrialPlay", () => {
  it("starts in setup with an empty scorer slot", () => {
    const round = createLocalTrial({
      layoutId: "layout-1",
      courseName: "Test Park",
      courseSlug: "test-park",
      layoutName: "White",
      holes: [HOLES[1]!, HOLES[0]!],
    });
    expect(round.status).toBe("setup");
    expect(round.scores).toEqual([]);
    expect(round.players).toHaveLength(1);
    expect(round.players[0]?.isScorer).toBe(true);
    expect(round.players[0]?.name).toBe("");
    expect(round.holes.map((hole) => hole.hole_number)).toEqual([1, 2]);
  });

  it("requires a scorer name before play starts", () => {
    const round = createLocalTrial({
      layoutId: "layout-1",
      courseName: "Test Park",
      courseSlug: "test-park",
      layoutName: "White",
      holes: HOLES,
    });
    const started = startLocalTrialPlay(round, round.players);
    expect(started.ok).toBe(false);
  });
});

describe("addGuestPlayer", () => {
  it("rejects a duplicate name", () => {
    const added = addGuestPlayer([SCORER], "kristjan");
    expect(added.ok).toBe(false);
  });
});

describe("isLocalTrialFullyScored / validateLocalTrialForClaim", () => {
  it("requires every player scored on every hole", () => {
    const incomplete = completedTrial({
      status: "active",
      completedAt: null,
      scores: [
        { holeId: "h1", playerId: "p-me", strokes: 3, ob: false },
        { holeId: "h1", playerId: "p-mari", strokes: 4, ob: false },
      ],
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
        { holeId: "h1", playerId: "p-me", strokes: 0, ob: false },
        { holeId: "h1", playerId: "p-mari", strokes: 4, ob: false },
        { holeId: "h2", playerId: "p-me", strokes: 5, ob: false },
        { holeId: "h2", playerId: "p-mari", strokes: 4, ob: false },
      ],
    });
    expect(validateLocalTrialForClaim(round)).toBe("Trial has an invalid stroke count.");
  });
});
