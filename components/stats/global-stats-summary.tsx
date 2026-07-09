import Link from "next/link";
import type { PlayerGlobalStats } from "@/lib/rounds/load-player-stats";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { formatVsPar } from "@/lib/scoring/stats";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { cn } from "@/lib/utils";

type Props = {
  stats: PlayerGlobalStats;
  /** Home teaser includes most-played layout; History omits it. */
  showMostPlayed?: boolean;
};

const highlightClassName =
  "flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2.5 transition-colors hover:bg-background/90";

type StatFigureProps = {
  label: string;
  value: string;
  href?: string;
};

function StatFigure({ label, value, href }: StatFigureProps) {
  const body = (
    <>
      <p className="font-mono text-2xl font-semibold leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{label}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block min-w-0 rounded-md px-1 py-0.5 text-center transition-colors hover:bg-background/70"
      >
        {body}
      </Link>
    );
  }

  return <div className="min-w-0 px-1 py-0.5 text-center">{body}</div>;
}

type HighlightCalloutProps = {
  href: string;
  label: string;
  title: string;
  meta: string;
  value: string;
  valueSuffix?: string;
};

function HighlightCallout({ href, label, title, meta, value, valueSuffix }: HighlightCalloutProps) {
  return (
    <Link href={href} className={highlightClassName}>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate font-medium">{title}</p>
        <p className={cn(homeRowMetaClassName, "mt-0.5 truncate")}>{meta}</p>
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
        <div className="grid grid-cols-2 gap-4">
          <StatFigure label="Total rounds" value={String(stats.roundsPlayed)} />
          <StatFigure label="Aces" value={String(stats.aceCount)} href="/rounds/aces" />
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

        {showMostPlayed && stats.mostPlayedLayout ? (
          <HighlightCallout
            href={`/courses/${stats.mostPlayedLayout.courseSlug}`}
            label="Most played"
            title={stats.mostPlayedLayout.courseName}
            meta={stats.mostPlayedLayout.layoutName}
            value={String(stats.mostPlayedLayout.roundCount)}
            valueSuffix={stats.mostPlayedLayout.roundCount === 1 ? "round" : "rounds"}
          />
        ) : null}
      </div>
    </section>
  );
}
