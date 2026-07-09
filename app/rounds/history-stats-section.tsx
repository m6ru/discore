import Link from "next/link";
import type { PlayerGlobalStats } from "@/lib/rounds/load-player-stats";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { formatVsPar } from "@/lib/scoring/stats";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

type Props = {
  stats: PlayerGlobalStats;
};

export function HistoryStatsSection({ stats }: Props) {
  if (stats.roundsPlayed === 0) {
    return null;
  }

  const bestDateLabel = stats.bestRound
    ? formatRoundDisplayDate(stats.bestRound.completedAt, null)
    : null;

  return (
    <section className="space-y-3 rounded-lg border px-4 py-3">
      <h2 className={sectionHeadingClassName}>Your stats</h2>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className={homeRowMetaClassName}>Rounds</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">{stats.roundsPlayed}</dd>
        </div>

        <div>
          <dt className={homeRowMetaClassName}>Best</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">
            {stats.bestVsPar !== null ? formatVsPar(stats.bestVsPar) : "—"}
          </dd>
          {stats.bestRound ? (
            <dd className="mt-0.5">
              <Link
                href={`/rounds/${stats.bestRound.id}`}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                <span className="text-muted-foreground">
                  {stats.bestRound.layoutName}
                  {bestDateLabel ? ` · ${bestDateLabel}` : null}
                </span>
              </Link>
            </dd>
          ) : null}
        </div>

        <div>
          <dt className={homeRowMetaClassName}>Aces</dt>
          <dd>
            <Link
              href="/rounds/aces"
              className="font-mono text-base font-semibold tabular-nums text-primary underline-offset-4 hover:underline"
            >
              {stats.aceCount}
            </Link>
          </dd>
        </div>
      </dl>
    </section>
  );
}
