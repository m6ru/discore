import { cn } from "@/lib/utils";
import { formatVsPar } from "@/lib/scoring/stats";
import type { LeaderboardRow, ParticipantRow } from "../round-types";

type Props = {
  scoringParticipants: ParticipantRow[];
  leaderboardByParticipantId: Map<string, LeaderboardRow>;
  getParticipantLabel: (participant: ParticipantRow) => string;
  /** The viewer's own row when this round is their new best on the layout. */
  newBestParticipantId?: string | null;
  /** "totals": the smaller list under the card on the review step. */
  variant?: "results" | "totals";
};

/**
 * Everyone's totals as equal rows in play order: no places, no winner.
 * Casual rounds are about playing against yourself.
 */
export function RoundResults({
  scoringParticipants,
  leaderboardByParticipantId,
  getParticipantLabel,
  newBestParticipantId = null,
  variant = "results",
}: Props) {
  const hasScores = [...leaderboardByParticipantId.values()].some((row) => row.thru > 0);
  if (!hasScores) {
    return null;
  }

  const isTotals = variant === "totals";

  return (
    <section aria-label={isTotals ? "Totals" : undefined}>
      <div
        className={cn(
          "flex items-end gap-3 pb-1 text-xs font-semibold text-muted-foreground",
          isTotals && "border-b border-foreground"
        )}
      >
        {isTotals ? (
          <span className="flex-1">Totals</span>
        ) : (
          <h2 className="flex-1 font-display text-lg font-semibold text-foreground">Results</h2>
        )}
        <span className="w-10 text-right">Tot</span>
        <span className="w-11 text-right">±</span>
      </div>
      <ul>
        {scoringParticipants.map((participant) => {
          const row = leaderboardByParticipantId.get(participant.id);
          const played = row !== undefined && row.thru > 0;

          return (
            <li
              key={participant.id}
              className={cn("flex items-center gap-3 border-b", isTotals ? "min-h-11" : "min-h-13")}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className={cn("truncate font-semibold", isTotals ? "text-base" : "text-[17px]")}>{getParticipantLabel(participant)}</span>
                {participant.id === newBestParticipantId ? (
                  <span className="shrink-0 rounded-md bg-good px-[7px] py-0.5 text-xs font-bold text-good-foreground">
                    New best
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "w-10 text-right font-mono tabular-nums text-muted-foreground",
                  isTotals ? "text-sm" : "text-[15px]"
                )}
              >
                {played ? row.totalStrokes : "—"}
              </span>
              <span
                className={cn(
                  "w-11 text-right font-display font-semibold tabular-nums",
                  isTotals ? "text-xl" : "text-[22px]"
                )}
              >
                {played ? formatVsPar(row.vsPar) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
