import type { ParticipantRow, UnifiedPlayer } from "@/app/rounds/[roundId]/round-types";

export function getParticipantLabel(
  participant: ParticipantRow,
  unifiedPlayers: UnifiedPlayer[]
): string {
  const player =
    unifiedPlayers.find((item) => item.participantId === participant.id)?.label ??
    participant.guest_name ??
    "Player";
  return player.replace(" (pending)", "");
}
