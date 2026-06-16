import { formatVsPar } from "@/lib/scoring/stats";
import { cn } from "@/lib/utils";
import type { LeaderboardRow, ParticipantRow } from "../round-types";

type Props = {
  scoringParticipants: ParticipantRow[];
  leaderboardRows: LeaderboardRow[];
  selectedParticipantId: string | null;
  teePositionByParticipantId: ReadonlyMap<string, number>;
  getParticipantLabel: (participant: ParticipantRow) => string;
  getStrokeInputValue: (participantId: string) => string;
  isObChecked: (participantId: string) => boolean;
  onSelectParticipant: (participantId: string) => void;
  disabled?: boolean;
  hideRunningScores?: boolean;
};

export function ScoringPlayerRoster({
  scoringParticipants,
  leaderboardRows,
  selectedParticipantId,
  teePositionByParticipantId,
  getParticipantLabel,
  getStrokeInputValue,
  isObChecked,
  onSelectParticipant,
  disabled = false,
  hideRunningScores = false,
}: Props) {
  const statsById = new Map(leaderboardRows.map((row) => [row.participantId, row]));

  return (
    <ul className="space-y-1.5">
      {scoringParticipants.map((participant) => {
        const label = getParticipantLabel(participant);
        const stats = statsById.get(participant.id);
        const holeRaw = getStrokeInputValue(participant.id).trim();
        const hasHoleScore = holeRaw.length > 0;
        const obOnHole = isObChecked(participant.id);
        const isSelected = participant.id === selectedParticipantId;
        const vsParLabel = stats && stats.thru > 0 ? formatVsPar(stats.vsPar) : "—";
        const teePosition = teePositionByParticipantId.get(participant.id) ?? 0;

        return (
          <li key={participant.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectParticipant(participant.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg border py-2 pl-3 pr-4 text-left text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:bg-muted/50",
                disabled && "pointer-events-none opacity-60"
              )}
              aria-pressed={isSelected}
            >
              <span className="min-w-0 flex-1 truncate font-medium">
                <span className="text-muted-foreground tabular-nums">{teePosition}.</span> {label}
              </span>
              <span
                className={cn(
                  "relative inline-flex min-h-7 min-w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 px-1.5 font-mono text-sm font-semibold tabular-nums",
                  obOnHole && "shadow-[inset_0_2px_0_0_var(--destructive)]",
                  hasHoleScore
                    ? "border-border text-foreground"
                    : "border-transparent text-muted-foreground"
                )}
                aria-label={
                  obOnHole
                    ? `Hole score ${hasHoleScore ? holeRaw : "not set"}, OB`
                    : hasHoleScore
                      ? `Hole score ${holeRaw}`
                      : "Hole score not set"
                }
              >
                {hasHoleScore ? holeRaw : "—"}
              </span>
              {!hideRunningScores ? (
                <>
                  <span className="w-10 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
                    {stats && stats.thru > 0 ? stats.totalStrokes : "—"}
                  </span>
                  <span
                    className={cn(
                      "w-10 shrink-0 text-right font-mono text-sm font-semibold tabular-nums",
                      stats && stats.thru > 0 && stats.vsPar < 0 && "text-primary",
                      stats && stats.thru > 0 && stats.vsPar > 0 && "text-destructive",
                      stats && stats.thru > 0 && stats.vsPar === 0 && "text-muted-foreground"
                    )}
                  >
                    {vsParLabel}
                  </span>
                </>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
