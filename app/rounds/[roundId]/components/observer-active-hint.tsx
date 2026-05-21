import type { HoleRow } from "../round-types";

type Props = {
  activeHole: HoleRow | null;
  holesLength: number;
};

export function ObserverActiveHint({ activeHole, holesLength }: Props) {
  return (
    <p className="text-sm text-zinc-600">
      Current hole: <span className="font-medium">{activeHole?.hole_number}</span> of{" "}
      <span className="font-medium">{holesLength}</span> (par {activeHole?.par}). Follow the scorecard
      below for hole-by-hole scores.
    </p>
  );
}
