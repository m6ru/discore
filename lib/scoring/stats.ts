import type {
  Hole,
  HoleScore,
  Participant,
  ScoreLookup,
  SegmentStats,
} from "./types";
import { makeScoreLookupKey } from "./types";

export function formatVsPar(diff: number): string {
  if (diff === 0) {
    return "E";
  }
  return diff > 0 ? `+${diff}` : String(diff);
}

export function segmentPlayerStats(
  participantId: string,
  segmentHoles: readonly Hole[],
  scoreLookup: ScoreLookup
): SegmentStats {
  let totalStrokes = 0;
  let parForScoredHoles = 0;
  let thru = 0;
  for (const hole of segmentHoles) {
    const strokes = scoreLookup.get(makeScoreLookupKey(participantId, hole.id));
    if (strokes !== undefined) {
      totalStrokes += strokes;
      parForScoredHoles += hole.par;
      thru += 1;
    }
  }
  return { totalStrokes, vsPar: totalStrokes - parForScoredHoles, thru };
}

export function getFirstIncompleteHoleIndex(
  holes: readonly Hole[],
  scoringParticipants: readonly Participant[],
  scores: readonly HoleScore[]
): number {
  if (holes.length === 0 || scoringParticipants.length === 0) {
    return 0;
  }

  const firstIncompleteIndex = holes.findIndex((hole) =>
    scoringParticipants.some(
      (participant) =>
        !scores.some(
          (score) =>
            score.hole_id === hole.id && score.participant_id === participant.id
        )
    )
  );

  return firstIncompleteIndex === -1 ? holes.length - 1 : firstIncompleteIndex;
}

export function getTotalStrokes(
  scores: readonly HoleScore[],
  participantId: string,
  targetHoleIds: readonly string[]
): number {
  const targetSet = new Set(targetHoleIds);
  let total = 0;
  for (const score of scores) {
    if (
      score.participant_id === participantId &&
      targetSet.has(score.hole_id)
    ) {
      total += score.strokes;
    }
  }
  return total;
}
