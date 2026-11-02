import { formatVsPar } from "@/lib/scoring/stats";
import type { LeaderboardRow, ParticipantRow } from "../round-types";

type Props = {
  scoringParticipants: ParticipantRow[];
  leaderboardByParticipantId: Map<string, LeaderboardRow>;
  getParticipantLabel: (participant: ParticipantRow) => string;
  /** The viewer's own row when this round is their new best on the layout. */
  newBestParticipantId?: string | null;
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
}: Props) {
  const hasScores = [...leaderboardByParticipantId.values()].some((row) => row.thru > 0);
  if (!hasScores) {
    return null;
  }

  return (
    <section>
      <div className="flex items-end gap-3 pb-1 text-xs font-semibold text-muted-foreground">
        <h2 className="flex-1 font-display text-lg font-semibold text-foreground">Results</h2>
        <span className="w-10 text-right">Tot</span>
        <span className="w-11 text-right">±</span>
      </div>
      <ul>
        {scoringParticipants.map((participant) => {
          const row = leaderboardByParticipantId.get(participant.id);
          const played = row !== undefined && row.thru > 0;

          return (
            <li key={participant.id} className="flex min-h-13 items-center gap-3 border-b">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="truncate text-[17px] font-semibold">{getParticipantLabel(participant)}</span>
                {participant.id === newBestParticipantId ? (
                  <span className="shrink-0 rounded-md bg-good px-[7px] py-0.5 text-xs font-bold text-good-foreground">
                    New best
                  </span>
                ) : null}
              </span>
              <span className="w-10 text-right font-mono text-[15px] tabular-nums text-muted-foreground">
                {played ? row.totalStrokes : "—"}
              </span>
              <span className="w-11 text-right font-display text-[22px] font-semibold tabular-nums">
                {played ? formatVsPar(row.vsPar) : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
