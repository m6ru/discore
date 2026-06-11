import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export async function sendRoundInvite(
  supabase: Client,
  roundId: string,
  invitedUserId: string,
  invitedBy: string
) {
  return supabase.from("round_invitations").insert({
    round_id: roundId,
    invited_user_id: invitedUserId,
    invited_by: invitedBy,
  });
}

export async function addGuestParticipant(
  supabase: Client,
  roundId: string,
  guestName: string
) {
  return supabase.from("round_participants").insert({
    round_id: roundId,
    guest_name: guestName,
  });
}

export async function cancelRoundInvitation(supabase: Client, inviteId: string) {
  return supabase.from("round_invitations").update({ status: "cancelled" }).eq("id", inviteId);
}

export async function removeRoundParticipant(supabase: Client, participantId: string) {
  return supabase.from("round_participants").delete().eq("id", participantId);
}

export async function cancelInvitesForUser(
  supabase: Client,
  roundId: string,
  invitedUserId: string
) {
  return supabase
    .from("round_invitations")
    .update({ status: "cancelled" })
    .eq("round_id", roundId)
    .eq("invited_user_id", invitedUserId)
    .in("status", ["pending", "accepted"]);
}

export async function startRound(supabase: Client, roundId: string) {
  return supabase
    .from("rounds")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("id", roundId);
}

export async function deleteDraftRound(supabase: Client, roundId: string) {
  return supabase.from("rounds").delete().eq("id", roundId);
}

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

export async function updateRoundName(
  supabase: Client,
  roundId: string,
  name: string | null
) {
  const trimmed = name?.trim() ?? "";
  return supabase
    .from("rounds")
    .update({ name: trimmed.length > 0 ? trimmed : null })
    .eq("id", roundId);
}

export async function createDraftRound(
  supabase: Client,
  layoutId: string,
  scorerId: string,
  name?: string | null
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

  const trimmedName = name?.trim() ?? "";
  const roundId = crypto.randomUUID();
  const { error: insertError } = await supabase.from("rounds").insert({
    id: roundId,
    layout_id: layoutId,
    scorer_id: scorerId,
    status: "draft",
    name: trimmedName.length > 0 ? trimmedName : null,
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
