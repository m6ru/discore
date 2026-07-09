import Link from "next/link";
import type { PlayerGlobalStats } from "@/lib/rounds/load-player-stats";
import { formatVsPar } from "@/lib/scoring/stats";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

type Props = {
  stats: PlayerGlobalStats;
};

export function HomeStatsTeaser({ stats }: Props) {
  if (stats.roundsPlayed === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-lg border px-4 py-3">
      <h2 className={sectionHeadingClassName}>Your stats</h2>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className={homeRowMetaClassName}>Rounds</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">{stats.roundsPlayed}</dd>
        </div>

        <div>
          <dt className={homeRowMetaClassName}>Best ever</dt>
          {stats.bestRound && stats.bestVsPar !== null ? (
            <dd>
              <Link
                href={`/rounds/${stats.bestRound.id}`}
                className="font-mono text-base font-semibold tabular-nums text-primary underline-offset-4 hover:underline"
              >
                {formatVsPar(stats.bestVsPar)}
              </Link>
            </dd>
          ) : (
            <dd className="font-mono text-base font-semibold tabular-nums">—</dd>
          )}
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

        <div>
          <dt className={homeRowMetaClassName}>Most played</dt>
          {stats.mostPlayedLayout ? (
            <dd>
              <Link
                href={`/courses/${stats.mostPlayedLayout.courseSlug}/stats?layout=${stats.mostPlayedLayout.layoutSlug}`}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                <span className="font-medium">{stats.mostPlayedLayout.courseName}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {stats.mostPlayedLayout.layoutName}
                </span>
              </Link>
            </dd>
          ) : (
            <dd className="font-mono text-base font-semibold tabular-nums">—</dd>
          )}
        </div>
      </dl>
    </section>
  );
}
