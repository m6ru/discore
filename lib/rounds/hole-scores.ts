export type MergeableHoleScore = {
  id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: boolean;
  fairway_hit: boolean | null;
};

const LEGACY_PENDING_QUEUE_PREFIX = "discore_pending_queue";

export function clearLegacyPendingQueueStorage(roundId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(`${LEGACY_PENDING_QUEUE_PREFIX}:${roundId}`);
  } catch {
    /* ignore */
  }
}

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
