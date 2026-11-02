"use client";

import { formatVsPar } from "@/lib/scoring/stats";
import { cn } from "@/lib/utils";
import type { LeaderboardRow, ParticipantRow } from "../round-types";

type Props = {
  scoringParticipants: ParticipantRow[];
  leaderboardRows: LeaderboardRow[];
  selectedParticipantId: string;
  teePositionByParticipantId: ReadonlyMap<string, number>;
  getParticipantLabel: (participant: ParticipantRow) => string;
  getStrokeInputValue: (participantId: string) => string;
  isObChecked: (participantId: string) => boolean;
  onSelectParticipant: (participantId: string) => void;
  disabled?: boolean;
  hideRunningScores?: boolean;
};

const numberCell = "shrink-0 text-right font-mono tabular-nums";

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
    <div>
      <div className="flex items-center gap-2.5 pb-1 text-xs font-semibold text-muted-foreground" aria-hidden>
        <span className="flex-1">Player</span>
        <span className="w-9 text-center">Hole</span>
        {!hideRunningScores ? (
          <>
            <span className="w-9 text-right">Tot</span>
            <span className="w-9 text-right">±</span>
          </>
        ) : null}
      </div>
      <ul>
        {scoringParticipants.map((participant) => {
          const label = getParticipantLabel(participant);
          const stats = statsById.get(participant.id);
          const holeRaw = getStrokeInputValue(participant.id).trim();
          const hasHoleScore = holeRaw.length > 0;
          const obOnHole = isObChecked(participant.id);
          const isSelected = participant.id === selectedParticipantId;
          const played = stats !== undefined && stats.thru > 0;
          const teePosition = teePositionByParticipantId.get(participant.id) ?? 0;

          return (
            <li key={participant.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectParticipant(participant.id)}
                className={cn(
                  "-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-2.5 border-b px-2 text-left text-[15px] transition-colors",
                  isSelected ? "bg-good/25" : "hover:bg-accent/60",
                  disabled && "pointer-events-none opacity-60"
                )}
                aria-pressed={isSelected}
              >
                <span className={cn("min-w-0 flex-1 truncate", isSelected ? "font-bold" : "font-semibold")}>
                  <span className="font-mono text-xs font-medium text-muted-foreground">{teePosition}.</span>{" "}
                  {label}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-9 shrink-0 items-center justify-center rounded-[3px] font-mono font-semibold tabular-nums",
                    obOnHole && "shadow-[inset_0_2px_0_0_var(--destructive)]",
                    !hasHoleScore && "font-normal text-muted-foreground"
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
                    <span className={cn(numberCell, "w-9 text-sm text-muted-foreground")}>
                      {played ? stats.totalStrokes : "—"}
                    </span>
                    <span
                      className={cn(
                        numberCell,
                        "w-9 text-sm font-semibold",
                        played && stats.vsPar === 0 && "text-muted-foreground"
                      )}
                    >
                      {played ? formatVsPar(stats.vsPar) : "—"}
                    </span>
                  </>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
