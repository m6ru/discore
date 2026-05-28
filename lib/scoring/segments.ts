import type { Participant, ScoreLookup } from "./types";
import { makeScoreLookupKey } from "./types";

/**
 * Returns true iff every `participant` has a saved strokes value for every
 * hole id in `segmentHoleIds`. Empty inputs are treated as "not complete".
 */
export function isSegmentComplete(
  segmentHoleIds: readonly string[],
  participants: readonly Participant[],
  scoreLookup: ScoreLookup,
): boolean {
  if (segmentHoleIds.length === 0 || participants.length === 0) {
    return false;
  }
  for (const holeId of segmentHoleIds) {
    for (const participant of participants) {
      if (scoreLookup.get(makeScoreLookupKey(participant.id, holeId)) === undefined) {
        return false;
      }
    }
  }
  return true;
}
