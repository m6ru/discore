// Domain types for scoring math. Framework-agnostic: no React, Next, or Supabase.

export type Hole = {
  id: string;
  hole_number: number;
  par: number;
};

export type Participant = {
  id: string;
};

export type HoleScore = {
  participant_id: string;
  hole_id: string;
  strokes: number;
};

export type SegmentStats = {
  totalStrokes: number;
  vsPar: number;
  thru: number;
};

export type ScoreLookup = ReadonlyMap<string, number>;

export function makeScoreLookupKey(participantId: string, holeId: string): string {
  return `${participantId}:${holeId}`;
}
