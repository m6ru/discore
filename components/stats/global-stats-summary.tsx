import Link from "next/link";
import type { PlayerGlobalStats } from "@/lib/rounds/load-player-stats";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { formatVsPar } from "@/lib/scoring/stats";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { cn } from "@/lib/utils";

type Props = {
  stats: PlayerGlobalStats;
  /** Home teaser includes most-played course; History omits it. */
  showMostPlayed?: boolean;
};

const highlightClassName =
  "flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2.5 transition-colors hover:bg-background/90";

type StatFigureProps = {
  label: string;
  value: string;
};

function StatFigure({ label, value }: StatFigureProps) {
  return (
    <div className="min-w-0 px-1 py-0.5 text-center">
      <p className="font-mono text-2xl font-semibold leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

/** Layout length played (sum of hole distances), not flight path. */
function formatDistanceM(meters: number): string {
  if (meters >= 1000) {
    const km = Math.round(meters / 100) / 10;
    return `${km} km`;
  }
  return `${meters} m`;
}

type HighlightCalloutProps = {
  href: string;
  label: string;
  title: string;
  meta?: string;
  value: string;
  valueSuffix?: string;
};

function HighlightCallout({ href, label, title, meta, value, valueSuffix }: HighlightCalloutProps) {
  return (
    <Link href={href} className={highlightClassName}>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate font-medium">{title}</p>
        {meta ? <p className={cn(homeRowMetaClassName, "mt-0.5 truncate")}>{meta}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        <span className="font-mono text-xl font-semibold tabular-nums">{value}</span>
        {valueSuffix ? (
          <p className="text-xs text-muted-foreground">{valueSuffix}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function GlobalStatsSummary({ stats, showMostPlayed = false }: Props) {
  if (stats.roundsPlayed === 0) {
    return null;
  }

  const bestDateLabel = stats.bestRound
    ? formatRoundDisplayDate(stats.bestRound.completedAt, null)
    : null;

  return (
    <section className="space-y-2">
      <h2 className={sectionHeadingClassName}>Your stats</h2>

      <div className="space-y-3 rounded-lg bg-muted/60 px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          <StatFigure label="Rounds" value={String(stats.roundsPlayed)} />
          <StatFigure label="Throws" value={String(stats.totalThrows)} />
          <StatFigure label="Distance" value={formatDistanceM(stats.totalDistanceM)} />
        </div>

        {stats.bestRound && stats.bestVsPar !== null ? (
          <HighlightCallout
            href={`/rounds/${stats.bestRound.id}`}
            label="Best round"
            title={stats.bestRound.courseName}
            meta={[stats.bestRound.layoutName, bestDateLabel].filter(Boolean).join(" · ")}
            value={formatVsPar(stats.bestVsPar)}
          />
        ) : null}

        {showMostPlayed && stats.mostPlayedCourse ? (
          <HighlightCallout
            href={`/courses/${stats.mostPlayedCourse.courseSlug}`}
            label="Most played"
            title={stats.mostPlayedCourse.courseName}
            value={String(stats.mostPlayedCourse.roundCount)}
            valueSuffix={stats.mostPlayedCourse.roundCount === 1 ? "round" : "rounds"}
          />
        ) : null}
      </div>
    </section>
  );
}
