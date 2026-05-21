import type { SupabaseClient } from "@supabase/supabase-js";
import type { HoleScoreRow } from "@/app/rounds/[roundId]/round-types";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type HoleScoreUpsertRow = {
  round_id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: boolean;
  fairway_hit: boolean | null;
};

export async function upsertHoleScores(supabase: Client, payload: HoleScoreUpsertRow[]) {
  return supabase
    .from("hole_scores")
    .upsert(payload, { onConflict: "round_id,participant_id,hole_id" })
    .select("id, participant_id, hole_id, strokes, ob, fairway_hit");
}

export async function abandonRound(supabase: Client, roundId: string) {
  return supabase.from("rounds").update({ status: "abandoned" }).eq("id", roundId);
}

export async function completeRound(supabase: Client, roundId: string) {
  return supabase
    .from("rounds")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", roundId);
}

export function parseUpsertedHoleScores(data: unknown): HoleScoreRow[] {
  return (data ?? []) as HoleScoreRow[];
}
