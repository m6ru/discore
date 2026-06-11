import type { Hole, Participant, ScoreLookup } from "./types";
import { makeScoreLookupKey } from "./types";

const MISSING_STROKES = Number.POSITIVE_INFINITY;

/**
 * Tee order for the hole at `currentHoleIndex` (0-based).
 * Lowest strokes on the previous hole tees first; ties walk back hole by hole.
 * Hole 1 uses participant list order. Final tiebreaker: join order index.
 */
export function buildTeePositionMap(
  sortedHoles: readonly Hole[],
  currentHoleIndex: number,
  participants: readonly Participant[],
  scoreLookup: ScoreLookup
): ReadonlyMap<string, number> {
  const joinIndex = new Map<string, number>();
  for (let i = 0; i < participants.length; i += 1) {
    joinIndex.set(participants[i]!.id, i);
  }

  const sortedIds = [...participants]
    .map((p) => p.id)
    .sort((aId, bId) =>
      compareTeeOrder(aId, bId, sortedHoles, currentHoleIndex, scoreLookup, joinIndex)
    );

  const positions = new Map<string, number>();
  for (let i = 0; i < sortedIds.length; i += 1) {
    positions.set(sortedIds[i]!, i + 1);
  }
  return positions;
}

function compareTeeOrder(
  aId: string,
  bId: string,
  sortedHoles: readonly Hole[],
  currentHoleIndex: number,
  scoreLookup: ScoreLookup,
  joinIndex: ReadonlyMap<string, number>
): number {
  if (currentHoleIndex <= 0) {
    return (joinIndex.get(aId) ?? 0) - (joinIndex.get(bId) ?? 0);
  }

  for (let holeIdx = currentHoleIndex - 1; holeIdx >= 0; holeIdx -= 1) {
    const hole = sortedHoles[holeIdx];
    if (!hole) {
      continue;
    }

    const aStrokes =
      scoreLookup.get(makeScoreLookupKey(aId, hole.id)) ?? MISSING_STROKES;
    const bStrokes =
      scoreLookup.get(makeScoreLookupKey(bId, hole.id)) ?? MISSING_STROKES;

    if (aStrokes !== bStrokes) {
      return aStrokes - bStrokes;
    }
  }

  return (joinIndex.get(aId) ?? 0) - (joinIndex.get(bId) ?? 0);
}
