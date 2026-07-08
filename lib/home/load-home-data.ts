import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { pickOne } from "@/lib/supabase/select-helpers";
import { isProfileOnboardingComplete } from "@/lib/profiles/is-profile-onboarding-complete";
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
  rounds: HomeRecentRound[]
): Promise<HomeRecentRound[]> {
  if (rounds.length === 0) {
    return rounds;
  }

  const { data } = await supabase
    .from("player_round_stats")
    .select("round_id, total_strokes, vs_par, holes_scored")
    .in(
      "round_id",
      rounds.map((round) => round.id)
    );

  const byRoundId = new Map((data ?? []).map((row) => [row.round_id, row]));

  return rounds.map((round) => {
    const stats = byRoundId.get(round.id);
    if (!stats || (stats.holes_scored ?? 0) === 0) {
      return round;
    }
    return { ...round, totalStrokes: stats.total_strokes, vsPar: stats.vs_par };
  });
}
