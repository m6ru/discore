import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type PlayerBestRound = {
  id: string;
  layoutName: string;
  courseName: string;
  completedAt: string | null;
};

export type PlayerMostPlayedLayout = {
  layoutId: string;
  layoutSlug: string;
  layoutName: string;
  courseSlug: string;
  courseName: string;
  roundCount: number;
};

export type PlayerGlobalStats = {
  roundsPlayed: number;
  bestVsPar: number | null;
  bestRound: PlayerBestRound | null;
  aceCount: number;
  mostPlayedLayout: PlayerMostPlayedLayout | null;
};

export type AceLogEntry = {
  roundId: string;
  completedAt: string | null;
  holeNumber: number;
  layoutName: string;
  courseName: string;
};

export type PlayerStatsDistribution = {
  ace: number;
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  doublePlus: number;
};

export type PlayerCourseStats = {
  courseId: string;
  courseSlug: string;
  courseName: string;
  roundsPlayed: number;
  lastPlayedAt: string | null;
};

export type PlayerLayoutStats = {
  layoutId: string;
  layoutSlug: string;
  layoutName: string;
  courseSlug: string;
  courseName: string;
  roundsPlayed: number;
  bestVsPar: number | null;
  bestRoundId: string | null;
  avgVsPar: number | null;
  holesPlayed: number;
  obHolesTotal: number;
  distribution: PlayerStatsDistribution;
};

/** Lifetime global stats for History block and Home teaser (Stats v2). */
export async function loadPlayerStats(
  supabase: Client
): Promise<{ stats: PlayerGlobalStats; error: string | null }> {
  const { data, error } = await supabase.from("player_lifetime_stats").select("*").maybeSingle();

  if (error) {
    return { stats: emptyStats(), error: error.message };
  }

  if (!data || !data.rounds_played) {
    return { stats: emptyStats(), error: null };
  }

  const bestRound =
    data.best_round_id && data.best_vs_par !== null
      ? {
          id: data.best_round_id,
          layoutName: data.best_round_layout_name ?? "Unknown layout",
          courseName: data.best_round_course_name ?? "Unknown course",
          completedAt: data.best_round_completed_at,
        }
      : null;

  const mostPlayedLayout =
    data.most_played_layout_id &&
    data.most_played_layout_slug &&
    data.most_played_course_slug
      ? {
          layoutId: data.most_played_layout_id,
          layoutSlug: data.most_played_layout_slug,
          layoutName: data.most_played_layout_name ?? "Unknown layout",
          courseSlug: data.most_played_course_slug,
          courseName: data.most_played_course_name ?? "Unknown course",
          roundCount: data.most_played_round_count ?? 0,
        }
      : null;

  return {
    stats: {
      roundsPlayed: data.rounds_played,
      bestVsPar: data.best_vs_par,
      bestRound,
      aceCount: data.ace_total ?? 0,
      mostPlayedLayout,
    },
    error: null,
  };
}

/** All aces for the current user, newest first. */
export async function loadAceLog(
  supabase: Client
): Promise<{ aces: AceLogEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from("player_ace_log")
    .select("round_id, completed_at, hole_number, layout_name, course_name")
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (error) {
    return { aces: [], error: error.message };
  }

  const aces: AceLogEntry[] = (data ?? []).map((row) => ({
    roundId: row.round_id!,
    completedAt: row.completed_at,
    holeNumber: row.hole_number!,
    layoutName: row.layout_name ?? "Unknown layout",
    courseName: row.course_name ?? "Unknown course",
  }));

  return { aces, error: null };
}

/** Park-level play summary for one course (completed rounds, all layouts). */
export async function loadPlayerCourseStats(
  supabase: Client,
  courseSlug: string
): Promise<{ stats: PlayerCourseStats | null; error: string | null }> {
  const { data, error } = await supabase
    .from("player_course_stats")
    .select("course_id, course_slug, course_name, rounds_played, last_played_at")
    .eq("course_slug", courseSlug)
    .maybeSingle();

  if (error) {
    return { stats: null, error: error.message };
  }

  if (!data || !data.rounds_played) {
    return { stats: null, error: null };
  }

  return {
    stats: {
      courseId: data.course_id!,
      courseSlug: data.course_slug!,
      courseName: data.course_name ?? "Unknown course",
      roundsPlayed: data.rounds_played,
      lastPlayedAt: data.last_played_at,
    },
    error: null,
  };
}

/** Per-layout stats for one course, keyed by layout id. */
export async function loadPlayerLayoutStatsForCourse(
  supabase: Client,
  courseSlug: string
): Promise<{ byLayoutId: Map<string, PlayerLayoutStats>; error: string | null }> {
  const { data, error } = await supabase
    .from("player_layout_stats")
    .select("*")
    .eq("course_slug", courseSlug);

  if (error) {
    return { byLayoutId: new Map(), error: error.message };
  }

  const byLayoutId = new Map<string, PlayerLayoutStats>();
  for (const row of data ?? []) {
    if (!row.layout_id) {
      continue;
    }
    byLayoutId.set(row.layout_id, mapLayoutStatsRow(row));
  }

  return { byLayoutId, error: null };
}

function mapLayoutStatsRow(row: {
  layout_id: string | null;
  layout_slug: string | null;
  layout_name: string | null;
  course_slug: string | null;
  course_name: string | null;
  rounds_played: number | null;
  best_vs_par: number | null;
  best_round_id: string | null;
  avg_vs_par: number | null;
  holes_played: number | null;
  ob_holes_total: number | null;
  ace_total: number | null;
  eagle_total: number | null;
  birdie_total: number | null;
  par_total: number | null;
  bogey_total: number | null;
  double_plus_total: number | null;
}): PlayerLayoutStats {
  return {
    layoutId: row.layout_id!,
    layoutSlug: row.layout_slug ?? "",
    layoutName: row.layout_name ?? "Unknown layout",
    courseSlug: row.course_slug ?? "",
    courseName: row.course_name ?? "Unknown course",
    roundsPlayed: row.rounds_played ?? 0,
    bestVsPar: row.best_vs_par,
    bestRoundId: row.best_round_id,
    avgVsPar: row.avg_vs_par,
    holesPlayed: row.holes_played ?? 0,
    obHolesTotal: row.ob_holes_total ?? 0,
    distribution: {
      ace: row.ace_total ?? 0,
      eagle: row.eagle_total ?? 0,
      birdie: row.birdie_total ?? 0,
      par: row.par_total ?? 0,
      bogey: row.bogey_total ?? 0,
      doublePlus: row.double_plus_total ?? 0,
    },
  };
}

function emptyStats(): PlayerGlobalStats {
  return {
    roundsPlayed: 0,
    bestVsPar: null,
    bestRound: null,
    aceCount: 0,
    mostPlayedLayout: null,
  };
}
