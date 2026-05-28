export type MergeableHoleScore = {
  id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: boolean;
  fairway_hit: boolean | null;
};

export function mergeHoleScoresByCell<T extends MergeableHoleScore>(
  base: T[],
  incoming: T[]
): T[] {
  const next = [...base];
  for (const row of incoming) {
    const idx = next.findIndex(
      (s) =>
        s.participant_id === row.participant_id && s.hole_id === row.hole_id
    );
    if (idx >= 0) {
      next[idx] = row;
    } else {
      next.push(row);
    }
  }
  return next;
}
