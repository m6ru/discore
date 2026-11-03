import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { pickOne } from "@/lib/supabase/select-helpers";
import { isProfileOnboardingComplete } from "@/lib/profiles/is-profile-onboarding-complete";
import {
  HOME_PARTICIPATION_ROW_LIMIT,
  parseHomeParticipantRounds,
} from "./parse-participant-rounds";
import type { HomeData, HomeInvite, HomeRecentRound, HomeSuggestionThanks } from "./types";

type Client = SupabaseClient<Database>;

const HOME_RECENT_ROUND_LIMIT = 3;

const PARTICIPATION_ROUND_STATUSES = ["active", "completed", "draft", "abandoned"] as const;

export async function loadHomeData(
  supabase: Client,
  userId: string
): Promise<HomeData> {
  // One wave: recent rounds come straight from the player's own stats view
  // (course, layout, dates and totals), so nothing waits for another query.
  const [profileResult, invitesResult, participationResult, thanksResult, recentResult] = await Promise.all([
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
    supabase
      .from("course_suggestions")
      .select("id, kind, course_name, owner_note, courses(name), layouts(name)")
      .eq("user_id", userId)
      .eq("status", "applied")
      .is("thanked_seen_at", null)
      .order("reviewed_at", { ascending: false })
      .limit(3),
    supabase
      .from("player_round_stats")
      .select("round_id, layout_id, status, started_at, completed_at, course_name, layout_name, total_strokes, vs_par, holes_scored")
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(HOME_RECENT_ROUND_LIMIT),
  ]);

  const profile = profileResult.data;
  const { activeRounds, hasJoinedRound } = parseHomeParticipantRounds(
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

  const suggestionThanks: HomeSuggestionThanks[] = (thanksResult.data ?? []).map((row) => ({
    id: row.id,
    courseName: row.kind === "new_course" ? row.course_name : (pickOne(row.courses)?.name ?? null),
    layoutName: pickOne(row.layouts)?.name ?? null,
    ownerNote: row.owner_note,
  }));

  const recentRounds: HomeRecentRound[] = (recentResult.data ?? []).flatMap((row) => {
    if (!row.round_id || !row.layout_id || (row.status !== "completed" && row.status !== "abandoned")) {
      return [];
    }
    const scored = (row.holes_scored ?? 0) > 0;
    return [
      {
        id: row.round_id,
        layoutId: row.layout_id,
        courseName: row.course_name ?? "Unknown course",
        layoutName: row.layout_name ?? "Unknown layout",
        status: row.status,
        completedAt: row.completed_at,
        startedAt: row.started_at,
        totalStrokes: scored ? row.total_strokes : null,
        vsPar: scored ? row.vs_par : null,
      },
    ];
  });

  return {
    profile,
    invites,
    activeRounds,
    recentRounds,
    hasJoinedRound,
    profileOnboardingComplete: profile ? isProfileOnboardingComplete(profile) : false,
    suggestionThanks,
  };
}
