import { describe, expect, it } from "vitest";
import { parseHomeParticipantRounds } from "./parse-participant-rounds";

describe("parseHomeParticipantRounds", () => {
  it("splits active and recent completed rounds", () => {
    const result = parseHomeParticipantRounds([
      {
        rounds: {
          id: "active-1",
          scorer_id: "user-1",
          status: "active",
          started_at: "2026-06-17T10:00:00.000Z",
          completed_at: null,
          layouts: { name: "Pro 18", courses: { name: "Jarve" } },
        },
      },
      {
        rounds: {
          id: "done-1",
          scorer_id: "user-1",
          status: "completed",
          started_at: "2026-06-10T10:00:00.000Z",
          completed_at: "2026-06-10T14:00:00.000Z",
          layouts: { name: "Yellow", courses: { name: "Keila" } },
        },
      },
      {
        rounds: {
          id: "done-2",
          scorer_id: "user-1",
          status: "completed",
          started_at: "2026-06-15T10:00:00.000Z",
          completed_at: "2026-06-15T14:00:00.000Z",
          layouts: { name: "Blue", courses: { name: "Maardu" } },
        },
      },
    ]);

    expect(result.hasJoinedRound).toBe(true);
    expect(result.activeRounds).toHaveLength(1);
    expect(result.activeRounds[0]?.id).toBe("active-1");
    expect(result.recentRounds.map((round) => round.id)).toEqual(["done-2", "done-1"]);
  });

  it("marks draft participation as joined without recent completed rows", () => {
    const result = parseHomeParticipantRounds([
      {
        rounds: {
          id: "draft-1",
          scorer_id: "user-1",
          status: "draft",
          started_at: null,
          completed_at: null,
          layouts: { name: "Pro 18", courses: { name: "Jarve" } },
        },
      },
    ]);

    expect(result.hasJoinedRound).toBe(true);
    expect(result.activeRounds).toHaveLength(0);
    expect(result.recentRounds).toHaveLength(0);
  });
});
