import type { ParticipantRow, UnifiedPlayer } from "./round-rows";

/**
 * Resolve a display label for a participant by looking up its `UnifiedPlayer`
 * entry. Falls back to the stored `guest_name`, then a generic placeholder.
 *
 * The `isPending` state for invitees is carried as a separate field on
 * `UnifiedPlayer` and rendered by `DraftPlayersPanel`; it is never spliced into
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

/** First names where space is tight; players who share one keep their full name. */
export function firstNamesUnlessShared(labels: string[]): string[] {
  const firstNames = labels.map((label) => label.trim().split(/\s+/)[0] || label);
  return firstNames.map((name, index) =>
    firstNames.filter((other) => other === name).length > 1 ? labels[index] : name
  );
}
