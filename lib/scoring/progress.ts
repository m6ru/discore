import type { Hole, Participant, ScoreLookup } from "./types";
import { makeScoreLookupKey } from "./types";

export type HoleProgressEntry<H extends Hole = Hole> = {
  hole: H;
  allScored: boolean;
  isCurrent: boolean;
};

/**
 * For each hole, compute whether every participant has a saved score and
 * whether the hole is the round's current focus. Returned in the same order as
 * `sortedHoles`.
 */
export function buildHoleProgress<H extends Hole>(
  sortedHoles: readonly H[],
  participants: readonly Participant[],
  scoreLookup: ScoreLookup,
  activeHoleId: string | null,
  isRoundActive: boolean,
): HoleProgressEntry<H>[] {
  return sortedHoles.map((hole) => ({
    hole,
    allScored:
      participants.length > 0 &&
      participants.every(
        (participant) =>
          scoreLookup.get(makeScoreLookupKey(participant.id, hole.id)) !== undefined,
      ),
    isCurrent: isRoundActive && activeHoleId === hole.id,
  }));
}
