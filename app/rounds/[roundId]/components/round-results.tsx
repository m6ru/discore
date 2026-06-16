import { formatVsPar } from "@/lib/scoring/stats";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import type { LeaderboardRow, ParticipantRow } from "../round-types";

type Props = {
  scoringParticipants: ParticipantRow[];
  leaderboardByParticipantId: Map<string, LeaderboardRow>;
  getParticipantLabel: (participant: ParticipantRow) => string;
};

export function RoundResults({
  scoringParticipants,
  leaderboardByParticipantId,
  getParticipantLabel,
}: Props) {
  const hasScores = [...leaderboardByParticipantId.values()].some((row) => row.thru > 0);
  if (!hasScores) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className={sectionHeadingClassName}>Results of the pool</h3>
      <ol className="divide-y divide-border rounded-lg border">
        {scoringParticipants.map((participant) => {
          const row = leaderboardByParticipantId.get(participant.id);
          const label = getParticipantLabel(participant);
          const vsParLabel = row && row.thru > 0 ? formatVsPar(row.vsPar) : "—";

          return (
            <li key={participant.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
              <span className="w-12 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                {vsParLabel}
              </span>
              <span className="w-10 shrink-0 text-right font-mono tabular-nums text-foreground">
                {row && row.thru > 0 ? row.totalStrokes : "—"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
