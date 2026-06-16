import type { HoleRow } from "../round-types";

type Props = {
  activeHole: HoleRow | null;
  holesLength: number;
};

export function ActiveHoleStatus({ activeHole, holesLength }: Props) {
  if (!activeHole) {
    return null;
  }

  return (
    <div className="space-y-2 pt-4 sm:pt-6">
      <p className="text-center text-base font-medium tabular-nums text-foreground">
        <span className="text-muted-foreground">Hole </span>
        <span className="font-mono text-lg font-semibold">{activeHole.hole_number}</span>
        <span className="text-muted-foreground"> / {holesLength}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-muted-foreground">Par </span>
        <span className="font-mono font-semibold">{activeHole.par}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="font-mono font-semibold">{activeHole.distance_m}</span>
        <span className="text-muted-foreground"> m</span>
      </p>
      {activeHole.notes ? (
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {activeHole.notes}
        </p>
      ) : null}
    </div>
  );
}
