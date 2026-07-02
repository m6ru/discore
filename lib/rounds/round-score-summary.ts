import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { segmentPlayerStats } from "@/lib/scoring/stats";
import type { Hole, SegmentStats } from "@/lib/scoring/types";
import { makeScoreLookupKey } from "@/lib/scoring/types";

type Client = SupabaseClient<Database>;

/** A round the caller wants per-player totals for, from the current user's perspective. */
export type ScoredRoundRef = { id: string; layoutId: string };

/**
 * Loads the current user's stroke totals for a set of rounds in one fan-out
 * (participants + scores + holes), keyed by round id. Shared by the Home hub
 * and the History list, which both render "vs par" the same way.
 *
 * Rounds with no scored holes for the user are omitted from the map, so callers
 * can treat a missing entry as "no score yet".
 */
export async function loadRoundScoreSummaries(
  supabase: Client,
  userId: string,
  rounds: readonly ScoredRoundRef[]
): Promise<{ summaries: Map<string, SegmentStats>; error: string | null }> {
  const summaries = new Map<string, SegmentStats>();
  if (rounds.length === 0) {
    return { summaries, error: null };
  }

  const roundIds = rounds.map((round) => round.id);
  const layoutIds = [...new Set(rounds.map((round) => round.layoutId))];

  const [participantsResult, scoresResult, holesResult] = await Promise.all([
    supabase
      .from("round_participants")
      .select("id, round_id")
      .eq("user_id", userId)
      .in("round_id", roundIds),
    supabase
      .from("hole_scores")
      .select("participant_id, hole_id, strokes")
      .in("round_id", roundIds),
    supabase
      .from("holes")
      .select("id, layout_id, hole_number, par")
      .in("layout_id", layoutIds)
      .order("hole_number", { ascending: true }),
  ]);

  const error =
    participantsResult.error?.message ??
    scoresResult.error?.message ??
    holesResult.error?.message ??
    null;
  if (error) {
    return { summaries, error };
  }

  const participantIdByRoundId = new Map(
    (participantsResult.data ?? []).map((row) => [row.round_id, row.id])
  );

  const holesByLayoutId = new Map<string, Hole[]>();
  for (const hole of holesResult.data ?? []) {
    const list = holesByLayoutId.get(hole.layout_id) ?? [];
    list.push({ id: hole.id, hole_number: hole.hole_number, par: hole.par });
    holesByLayoutId.set(hole.layout_id, list);
  }

  const scoresByParticipantId = new Map<string, { hole_id: string; strokes: number }[]>();
  for (const score of scoresResult.data ?? []) {
    const list = scoresByParticipantId.get(score.participant_id) ?? [];
    list.push({ hole_id: score.hole_id, strokes: score.strokes });
    scoresByParticipantId.set(score.participant_id, list);
  }

  for (const round of rounds) {
    const participantId = participantIdByRoundId.get(round.id);
    if (!participantId) {
      continue;
    }
    const layoutHoles = holesByLayoutId.get(round.layoutId) ?? [];
    const lookup = new Map<string, number>();
    for (const score of scoresByParticipantId.get(participantId) ?? []) {
      lookup.set(makeScoreLookupKey(participantId, score.hole_id), score.strokes);
    }
    summaries.set(round.id, segmentPlayerStats(participantId, layoutHoles, lookup));
  }

  return { summaries, error: null };
}
