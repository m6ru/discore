import type { HoleRow } from "../round-types";

type Props = {
  activeHole: HoleRow | null;
  holesLength: number;
  /** Shows a quiet "Wrong info?" link (signed-in rounds only). */
  onSuggestFix?: () => void;
};

export function ActiveHoleStatus({ activeHole, holesLength, onSuggestFix }: Props) {
  if (!activeHole) {
    return null;
  }

  return (
    <div className="space-y-2 pt-4 sm:pt-6">
      <p className="text-center text-lg font-medium tabular-nums text-foreground">
        <span className="text-muted-foreground">Hole </span>
        <span className="font-mono text-xl font-semibold">{activeHole.hole_number}</span>
        <span className="text-muted-foreground"> / {holesLength}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="text-muted-foreground">Par </span>
        <span className="font-mono text-lg font-semibold">{activeHole.par}</span>
        <span className="mx-2 text-muted-foreground">·</span>
        <span className="font-mono text-lg font-semibold">{activeHole.distance_m}</span>
        <span className="text-muted-foreground"> m</span>
      </p>
      {activeHole.notes ? (
        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {activeHole.notes}
        </p>
      ) : null}
      {onSuggestFix ? (
        <p className="text-center">
          <button
            type="button"
            onClick={onSuggestFix}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Wrong info?
          </button>
        </p>
      ) : null}
    </div>
  );
}
