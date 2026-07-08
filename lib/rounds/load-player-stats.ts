import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type PlayerStatsDistribution = {
  ace: number;
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  doublePlus: number;
};

export type PlayerStatsV1 = {
  roundsPlayed: number;
  bestVsPar: number | null;
  bestRoundId: string | null;
  avgVsPar: number | null;
  avgObPerRound: number | null;
  distribution: PlayerStatsDistribution;
};

const EMPTY_DISTRIBUTION: PlayerStatsDistribution = {
  ace: 0,
  eagle: 0,
  birdie: 0,
  par: 0,
  bogey: 0,
  doublePlus: 0,
};

/** Lifetime stats for completed rounds (Postgres `player_lifetime_stats` view). */
export async function loadPlayerStats(
  supabase: Client
): Promise<{ stats: PlayerStatsV1; error: string | null }> {
  const { data, error } = await supabase.from("player_lifetime_stats").select("*").maybeSingle();

  if (error) {
    return { stats: emptyStats(), error: error.message };
  }

  if (!data || !data.rounds_played) {
    return { stats: emptyStats(), error: null };
  }

  return {
    stats: {
      roundsPlayed: data.rounds_played,
      bestVsPar: data.best_vs_par,
      bestRoundId: data.best_round_id,
      avgVsPar: data.avg_vs_par,
      avgObPerRound: data.avg_ob_per_round,
      distribution: {
        ace: data.ace_total ?? 0,
        eagle: data.eagle_total ?? 0,
        birdie: data.birdie_total ?? 0,
        par: data.par_total ?? 0,
        bogey: data.bogey_total ?? 0,
        doublePlus: data.double_plus_total ?? 0,
      },
    },
    error: null,
  };
}

function emptyStats(): PlayerStatsV1 {
  return {
    roundsPlayed: 0,
    bestVsPar: null,
    bestRoundId: null,
    avgVsPar: null,
    avgObPerRound: null,
    distribution: { ...EMPTY_DISTRIBUTION },
  };
}
