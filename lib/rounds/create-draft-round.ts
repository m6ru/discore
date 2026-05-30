import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export type CreateDraftRoundResult =
  | { ok: true; roundId: string }
  | { ok: false; message: string; existingRoundId?: string };

const ACTIVE_ROUND_MESSAGE =
  "You already have an active round. Finish it before creating a new one.";

export async function findInProgressRoundId(
  supabase: Client,
  scorerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("rounds")
    .select("id")
    .eq("scorer_id", scorerId)
    .in("status", ["draft", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

export async function createDraftRound(
  supabase: Client,
  layoutId: string,
  scorerId: string
): Promise<CreateDraftRoundResult> {
  if (!layoutId) {
    return { ok: false, message: "Missing layout selection" };
  }

  const existingId = await findInProgressRoundId(supabase, scorerId);
  if (existingId) {
    return {
      ok: false,
      message: ACTIVE_ROUND_MESSAGE,
      existingRoundId: existingId,
    };
  }

  const roundId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("rounds").insert({
    id: roundId,
    layout_id: layoutId,
    scorer_id: scorerId,
    status: "draft",
  });

  if (insertError) {
    if (
      insertError.code === "23505" &&
      (insertError.details ?? "").includes("rounds_one_active_per_scorer_idx")
    ) {
      const racedId = await findInProgressRoundId(supabase, scorerId);
      return {
        ok: false,
        message: ACTIVE_ROUND_MESSAGE,
        existingRoundId: racedId ?? undefined,
      };
    }

    return {
      ok: false,
      message: [
        `Round create failed: ${insertError.message}`,
        `code=${insertError.code ?? "n/a"}`,
        `details=${insertError.details ?? "n/a"}`,
        `hint=${insertError.hint ?? "n/a"}`,
      ].join(" | "),
    };
  }

  // Scorer enrolled via `ensure_scorer_participant_trigger` on insert.
  return { ok: true, roundId };
}
