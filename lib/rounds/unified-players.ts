import type { ParticipantRow, UnifiedPlayer } from "@/app/rounds/[roundId]/round-types";
import type { InviteRow } from "@/lib/rounds/invite-rows";

export function buildInviteNameByUserId(invites: InviteRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const invite of invites) {
    if (invite.profiles?.display_name) {
      map.set(invite.invited_user_id, invite.profiles.display_name);
    }
  }
  return map;
}

export type BuildUnifiedPlayersInput = {
  participants: ParticipantRow[];
  invites: InviteRow[];
  scorerUserId: string;
  scorerDisplayName: string;
  roundStatus: string;
  isScorer: boolean;
};

export function buildUnifiedPlayers(input: BuildUnifiedPlayersInput): UnifiedPlayer[] {
  const {
    participants,
    invites,
    scorerUserId,
    scorerDisplayName,
    roundStatus,
    isScorer,
  } = input;
  const inviteNameByUserId = buildInviteNameByUserId(invites);
  const registeredParticipantIds = new Set<string>();
  const rows: UnifiedPlayer[] = [];

  for (const participant of participants) {
    if (participant.user_id) {
      registeredParticipantIds.add(participant.user_id);
    }

    if (participant.guest_name) {
      rows.push({
        key: `guest-${participant.id}`,
        label: participant.guest_name,
        isPending: false,
        canRemove: roundStatus === "draft" && isScorer,
        source: "participant",
        participantId: participant.id,
      });
      continue;
    }

    if (participant.user_id === scorerUserId) {
      rows.push({
        key: `user-${participant.id}`,
        label: `${scorerDisplayName} (scorer)`,
        isPending: false,
        canRemove: false,
        source: "participant",
        participantId: participant.id,
        invitedUserId: participant.user_id ?? undefined,
      });
      continue;
    }

    rows.push({
      key: `user-${participant.id}`,
      label:
        inviteNameByUserId.get(participant.user_id ?? "") ??
        `Registered user (${participant.user_id})`,
      isPending: false,
      canRemove: roundStatus === "draft" && isScorer,
      source: "participant",
      participantId: participant.id,
      invitedUserId: participant.user_id ?? undefined,
    });
  }

  for (const invite of invites) {
    if (registeredParticipantIds.has(invite.invited_user_id)) {
      continue;
    }
    if (invite.status === "declined" || invite.status === "cancelled") {
      continue;
    }

    rows.push({
      key: `invite-${invite.id}`,
      label: invite.profiles?.display_name ?? invite.invited_user_id,
      isPending: invite.status === "pending",
      canRemove: roundStatus === "draft" && isScorer,
      source: "invite",
      inviteId: invite.id,
      invitedUserId: invite.invited_user_id,
    });
  }

  return rows;
}
