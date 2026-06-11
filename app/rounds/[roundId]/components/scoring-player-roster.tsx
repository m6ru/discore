import { Check } from "lucide-react";
import { formatVsPar } from "@/lib/scoring/stats";
import { cn } from "@/lib/utils";
import type { LeaderboardRow, ParticipantRow } from "../round-types";

type Props = {
  scoringParticipants: ParticipantRow[];
  leaderboardRows: LeaderboardRow[];
  selectedParticipantId: string | null;
  getParticipantLabel: (participant: ParticipantRow) => string;
  getStrokeInputValue: (participantId: string) => string;
  onSelectParticipant: (participantId: string) => void;
  disabled?: boolean;
};

export function ScoringPlayerRoster({
  scoringParticipants,
  leaderboardRows,
  selectedParticipantId,
  getParticipantLabel,
  getStrokeInputValue,
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
        const isSelected = participant.id === selectedParticipantId;
        const vsParLabel = stats && stats.thru > 0 ? formatVsPar(stats.vsPar) : "—";

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
                <span className="truncate font-medium">{label}</span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
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
