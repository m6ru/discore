import type { ParticipantRow, UnifiedPlayer } from "@/app/rounds/[roundId]/round-types";

/**
 * Resolve a display label for a participant by looking up its `UnifiedPlayer`
 * entry. Falls back to the stored `guest_name`, then a generic placeholder.
 *
 * The `isPending` state for invitees is carried as a separate field on
 * `UnifiedPlayer` and rendered by `ParticipantsList`; it is never spliced into
 * the label string itself.
 */
export function getParticipantLabel(
  participant: ParticipantRow,
  unifiedPlayers: UnifiedPlayer[],
): string {
  return (
    unifiedPlayers.find((item) => item.participantId === participant.id)?.label ??
    participant.guest_name ??
    "Player"
  );
}
