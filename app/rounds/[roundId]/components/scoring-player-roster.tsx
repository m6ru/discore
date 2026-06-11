import { Check } from "lucide-react";
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
}: Props) {
  const statsById = new Map(leaderboardRows.map((row) => [row.participantId, row]));

  return (
    <ul className="space-y-2">
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
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-background hover:bg-muted/50",
                disabled && "pointer-events-none opacity-60"
              )}
              aria-pressed={isSelected}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                {hasHoleScore ? (
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <span className="size-4 shrink-0" aria-hidden />
                )}
                <span className="truncate font-medium">
                  <span className="text-muted-foreground tabular-nums">{teePosition}.</span>{" "}
                  {label}
                </span>
              </span>
              <span
                className={cn(
                  "relative inline-flex min-h-8 min-w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 px-2 font-mono text-sm font-semibold tabular-nums",
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
              <span className="w-14 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">
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
            </button>
          </li>
        );
      })}
    </ul>
  );
}
