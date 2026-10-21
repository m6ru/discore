import { describe, expect, it } from "vitest";
import {
  addPendingScores,
  countPendingHoles,
  isRetryableSaveError,
  overlayPendingScores,
  removeSyncedScores,
  type PendingScore,
} from "./pending-scores";

function score(participant: string, hole: string, strokes: number, ob = false): PendingScore {
  return { round_id: "r1", participant_id: participant, hole_id: hole, strokes, ob, fairway_hit: null };
}

describe("addPendingScores", () => {
  it("keeps only the latest value per participant × hole", () => {
    const pending = addPendingScores(addPendingScores({}, [score("a", "h1", 3)]), [score("a", "h1", 4)]);
    expect(Object.values(pending)).toEqual([score("a", "h1", 4)]);
  });
});

describe("removeSyncedScores", () => {
  it("removes confirmed rows", () => {
    const sent = [score("a", "h1", 3), score("b", "h1", 4)];
    expect(removeSyncedScores(addPendingScores({}, sent), sent)).toEqual({});
  });

  it("keeps a row that changed while the request was in flight", () => {
    const sent = [score("a", "h1", 3)];
    const pending = addPendingScores({}, [score("a", "h1", 5)]);
    expect(Object.values(removeSyncedScores(pending, sent))).toEqual([score("a", "h1", 5)]);
  });

  it("keeps a row whose OB changed while in flight", () => {
    const pending = addPendingScores({}, [score("a", "h1", 3, true)]);
    expect(Object.keys(removeSyncedScores(pending, [score("a", "h1", 3)]))).toHaveLength(1);
  });
});

describe("overlayPendingScores", () => {
  const server = [
    { id: "s1", participant_id: "a", hole_id: "h1", strokes: 3, ob: false, fairway_hit: null },
    { id: "s2", participant_id: "a", hole_id: "h2", strokes: 4, ob: false, fairway_hit: null },
  ];

  it("returns server rows unchanged when nothing is pending", () => {
    expect(overlayPendingScores(server, {})).toBe(server);
  });

  it("local values win over server values and keep the server id", () => {
    const result = overlayPendingScores(server, addPendingScores({}, [score("a", "h1", 6, true)]));
    expect(result).toHaveLength(2);
    expect(result.find((row) => row.hole_id === "h1")).toMatchObject({ id: "s1", strokes: 6, ob: true });
  });

  it("adds rows the server doesn't have yet", () => {
    const result = overlayPendingScores(server, addPendingScores({}, [score("a", "h3", 2)]));
    expect(result.find((row) => row.hole_id === "h3")).toMatchObject({ id: "pending:a:h3", strokes: 2 });
  });
});

describe("countPendingHoles", () => {
  it("counts holes, not players", () => {
    const pending = addPendingScores({}, [score("a", "h1", 3), score("b", "h1", 3), score("a", "h2", 3)]);
    expect(countPendingHoles(pending)).toBe(2);
  });
});

describe("isRetryableSaveError", () => {
  it("retries network, auth, rate-limit and server errors", () => {
    for (const status of [0, 401, 408, 429, 500, 503]) {
      expect(isRetryableSaveError(status)).toBe(true);
    }
  });

  it("does not retry the database refusing the write", () => {
    for (const status of [400, 403, 404, 409]) {
      expect(isRetryableSaveError(status)).toBe(false);
    }
  });
});
