import type { PlayerStatsV1 } from "@/lib/rounds/load-player-stats";
import { formatVsPar } from "@/lib/scoring/stats";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

type Props = {
  stats: PlayerStatsV1;
};

function formatAvgVsPar(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return "E";
  }
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function formatAvgOb(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

type DistributionRow = {
  key: string;
  label: string;
  count: number;
};

export function HistoryStatsSection({ stats }: Props) {
  if (stats.roundsPlayed === 0) {
    return null;
  }

  const distribution: DistributionRow[] = [
    ...(stats.distribution.ace > 0
      ? [{ key: "ace", label: "Ace", count: stats.distribution.ace }]
      : []),
    ...(stats.distribution.eagle > 0
      ? [{ key: "eagle", label: "Eagle", count: stats.distribution.eagle }]
      : []),
    { key: "birdie", label: "Birdie", count: stats.distribution.birdie },
    { key: "par", label: "Par", count: stats.distribution.par },
    { key: "bogey", label: "Bogey", count: stats.distribution.bogey },
    { key: "double", label: "Double+", count: stats.distribution.doublePlus },
  ];

  return (
    <section className="space-y-3 rounded-lg border px-4 py-3">
      <h2 className={sectionHeadingClassName}>Your stats</h2>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className={homeRowMetaClassName}>Rounds</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">{stats.roundsPlayed}</dd>
        </div>
        <div>
          <dt className={homeRowMetaClassName}>Best</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">
            {stats.bestVsPar !== null ? formatVsPar(stats.bestVsPar) : "—"}
          </dd>
        </div>
        <div>
          <dt className={homeRowMetaClassName}>Average</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">
            {stats.avgVsPar !== null ? formatAvgVsPar(stats.avgVsPar) : "—"}
          </dd>
        </div>
        <div>
          <dt className={homeRowMetaClassName}>OB / round</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">
            {stats.avgObPerRound !== null ? formatAvgOb(stats.avgObPerRound) : "—"}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-3 gap-2 border-t pt-3 sm:grid-cols-6">
        {distribution.map((row) => (
          <div key={row.key} className="min-w-0 text-center">
            <p className="truncate text-xs text-muted-foreground">{row.label}</p>
            <p className="font-mono text-sm font-semibold tabular-nums">{row.count}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
