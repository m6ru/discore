/** The signed-in player's own history on one hole (BLUEPRINT §8a, D). */
export type HoleHistory = {
  timesPlayed: number;
  usualStrokes: number;
  bestStrokes: number;
  obCount: number;
};

/** "Usually 4 · best 3", or "Last time 4" after a single round; null with no history. */
export function formatHoleHistory(history: HoleHistory | undefined): string | null {
  if (!history || history.timesPlayed === 0) {
    return null;
  }
  if (history.timesPlayed === 1) {
    return `Last time ${history.usualStrokes}`;
  }
  return history.bestStrokes < history.usualStrokes
    ? `Usually ${history.usualStrokes} · best ${history.bestStrokes}`
    : `Usually ${history.usualStrokes}`;
}

export type PlayedHole = {
  holeId: string;
  holeNumber: number;
  strokes: number;
  ob: boolean;
};

/** Fewer than this many earlier rounds on a hole is too little to call a "usual". */
const MIN_ROUNDS_FOR_USUAL = 2;

/**
 * "Where it went": the 1–2 holes that cost the most against the player's own
 * usual, worst first. Holes played at or under the usual never appear.
 */
export function pickWhereItWent(
  played: PlayedHole[],
  historyByHoleId: ReadonlyMap<string, HoleHistory>,
  limit = 2
): string[] {
  return played
    .flatMap((hole) => {
      const history = historyByHoleId.get(hole.holeId);
      if (!history || history.timesPlayed < MIN_ROUNDS_FOR_USUAL) {
        return [];
      }
      const lost = hole.strokes - history.usualStrokes;
      return lost > 0 ? [{ hole, usual: history.usualStrokes, lost }] : [];
    })
    .sort((a, b) => b.lost - a.lost || a.hole.holeNumber - b.hole.holeNumber)
    .slice(0, limit)
    .map(
      ({ hole, usual }) =>
        `Hole ${hole.holeNumber}: ${hole.strokes}, usually ${usual}${hole.ob ? ", OB" : ""}`
    );
}
