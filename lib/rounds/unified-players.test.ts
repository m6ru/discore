import { describe, expect, it } from "vitest";
import { buildUnifiedPlayers } from "./unified-players";

const base = {
  scorerUserId: "scorer",
  scorerDisplayName: "Sam Scorer",
  roundStatus: "active" as const,
  isScorer: false,
};

describe("buildUnifiedPlayers", () => {
  it("names a registered player from their profile when the viewer can't read their invite", () => {
    const players = buildUnifiedPlayers({
      ...base,
      participants: [
        { id: "p1", user_id: "scorer", guest_name: null, joined_at: "2026-11-03T10:00:00Z" },
        { id: "p2", user_id: "friend", guest_name: null, joined_at: "2026-11-03T10:01:00Z", display_name: "Fran Friend" },
      ],
      invites: [],
    });
    expect(players.map((player) => player.label)).toEqual(["Sam Scorer", "Fran Friend"]);
  });

  it("falls back to the invite's name", () => {
    const players = buildUnifiedPlayers({
      ...base,
      participants: [{ id: "p2", user_id: "friend", guest_name: null, joined_at: "2026-11-03T10:01:00Z" }],
      invites: [
        {
          id: "i1",
          invited_user_id: "friend",
          status: "accepted",
          created_at: "2026-11-03T10:00:00Z",
          profiles: { display_name: "Fran Friend" },
        },
      ],
    });
    expect(players.map((player) => player.label)).toEqual(["Fran Friend"]);
  });
});
