export type HoleScoreTone =
  | "empty"
  | "ace"
  | "eagle"
  | "birdie"
  | "par"
  | "bogey"
  | "doubleBogey";

export function holeScoreTone(strokes: number | undefined, par: number): HoleScoreTone {
  if (strokes === undefined) {
    return "empty";
  }
  if (strokes === 1) {
    return "ace";
  }

  const vsPar = strokes - par;
  if (vsPar <= -2) {
    return "eagle";
  }
  if (vsPar === -1) {
    return "birdie";
  }
  if (vsPar === 0) {
    return "par";
  }
  if (vsPar === 1) {
    return "bogey";
  }
  return "doubleBogey";
}
