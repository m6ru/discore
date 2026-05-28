import type { Hole, Participant, ScoreLookup } from "./types";
import { segmentPlayerStats } from "./stats";

export type LeaderboardEntry = {
  participantId: string;
  label: string;
  totalStrokes: number;
  vsPar: number;
  thru: number;
};

/**
 * Build a leaderboard sorted by score-to-par on the holes each participant has
 * actually played:
 *
 * 1. Participants with zero saved holes (`thru === 0`) sink to the bottom,
 *    sorted alphabetically by label to keep the placeholder order stable.
 * 2. Otherwise sort ascending by `vsPar`, then ascending by `totalStrokes`,
 *    then alphabetically.
 *
 * The sort function `Array.prototype.sort` mutates in place; we sort a copy so
 * the caller's `participants` argument stays untouched.
 */
export function buildLeaderboard(
  participants: readonly Participant[],
  sortedHoles: readonly Hole[],
  scoreLookup: ScoreLookup,
  labelFor: (id: string) => string,
): LeaderboardEntry[] {
  const rows: LeaderboardEntry[] = participants.map((participant) => {
    const stats = segmentPlayerStats(participant.id, sortedHoles, scoreLookup);
    return {
      participantId: participant.id,
      label: labelFor(participant.id),
      totalStrokes: stats.totalStrokes,
      vsPar: stats.vsPar,
      thru: stats.thru,
    };
  });

  rows.sort((a, b) => {
    if (a.thru === 0 && b.thru === 0) return a.label.localeCompare(b.label);
    if (a.thru === 0) return 1;
    if (b.thru === 0) return -1;
    if (a.vsPar !== b.vsPar) return a.vsPar - b.vsPar;
    if (a.totalStrokes !== b.totalStrokes) return a.totalStrokes - b.totalStrokes;
    return a.label.localeCompare(b.label);
  });

  return rows;
}
