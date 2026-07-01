import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { pickOne } from "@/lib/supabase/select-helpers";
import { isProfileOnboardingComplete } from "@/lib/profiles/is-profile-onboarding-complete";
import { segmentPlayerStats } from "@/lib/scoring/stats";
import type { Hole } from "@/lib/scoring/types";
import { makeScoreLookupKey } from "@/lib/scoring/types";
import {
  HOME_PARTICIPATION_ROW_LIMIT,
  parseHomeParticipantRounds,
} from "./parse-participant-rounds";
import type { HomeData, HomeInvite, HomeRecentRound } from "./types";

type Client = SupabaseClient<Database>;

const PARTICIPATION_ROUND_STATUSES = ["active", "completed", "draft", "abandoned"] as const;

export async function loadHomeData(
  supabase: Client,
  userId: string
): Promise<HomeData> {
  const [profileResult, invitesResult, participationResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, display_name, avatar_url, city")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("round_invitations")
      .select(
        "id, round_id, created_at, rounds!inner(id, layouts(name, courses(name)), scorer:profiles!rounds_scorer_id_fkey(display_name))"
      )
      .eq("invited_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("round_participants")
      .select(
        "rounds!inner(id, scorer_id, status, started_at, completed_at, layout_id, layouts(name, courses(name)))"
      )
      .eq("user_id", userId)
      .in("rounds.status", [...PARTICIPATION_ROUND_STATUSES])
      .order("joined_at", { ascending: false })
      .limit(HOME_PARTICIPATION_ROW_LIMIT),
  ]);

  const profile = profileResult.data;
  const { activeRounds, recentRounds, hasJoinedRound } = parseHomeParticipantRounds(
    participationResult.data ?? []
  );

  const invites: HomeInvite[] = (invitesResult.data ?? []).map((row) => {
    const round = pickOne(row.rounds);
    const layout = pickOne(round?.layouts);
    const course = pickOne(layout?.courses);
    const scorer = pickOne(round?.scorer);
    return {
      id: row.id,
      round_id: row.round_id,
      created_at: row.created_at,
      course_name: course?.name ?? null,
      layout_name: layout?.name ?? null,
      inviter_display_name: scorer?.display_name ?? null,
    };
  });

  const recentRoundsWithScores = await attachScoresToRecentRounds(
    supabase,
    userId,
    recentRounds
  );

  return {
    profile,
    invites,
    activeRounds,
    recentRounds: recentRoundsWithScores,
    hasJoinedRound,
    profileOnboardingComplete: profile ? isProfileOnboardingComplete(profile) : false,
  };
}

async function attachScoresToRecentRounds(
  supabase: Client,
  userId: string,
  rounds: HomeRecentRound[]
): Promise<HomeRecentRound[]> {
  if (rounds.length === 0) {
    return rounds;
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

  if (participantsResult.error || scoresResult.error || holesResult.error) {
    return rounds;
  }

  const participantIdByRoundId = new Map(
    (participantsResult.data ?? []).map((row) => [row.round_id, row.id])
  );

  const holesByLayoutId = new Map<string, Hole[]>();
  for (const hole of holesResult.data ?? []) {
    const list = holesByLayoutId.get(hole.layout_id) ?? [];
    list.push({
      id: hole.id,
      hole_number: hole.hole_number,
      par: hole.par,
    });
    holesByLayoutId.set(hole.layout_id, list);
  }

  const scoresByParticipantId = new Map<string, { hole_id: string; strokes: number }[]>();
  for (const score of scoresResult.data ?? []) {
    const list = scoresByParticipantId.get(score.participant_id) ?? [];
    list.push({ hole_id: score.hole_id, strokes: score.strokes });
    scoresByParticipantId.set(score.participant_id, list);
  }

  return rounds.map((round) => {
    const participantId = participantIdByRoundId.get(round.id);
    if (!participantId) {
      return round;
    }

    const layoutHoles = holesByLayoutId.get(round.layoutId) ?? [];
    const participantScores = scoresByParticipantId.get(participantId) ?? [];
    const lookup = new Map<string, number>();
    for (const score of participantScores) {
      lookup.set(makeScoreLookupKey(participantId, score.hole_id), score.strokes);
    }
    const stats = segmentPlayerStats(participantId, layoutHoles, lookup);
    if (stats.thru === 0) {
      return round;
    }

    return {
      ...round,
      totalStrokes: stats.totalStrokes,
      vsPar: stats.vsPar,
    };
  });
}
