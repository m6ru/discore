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
