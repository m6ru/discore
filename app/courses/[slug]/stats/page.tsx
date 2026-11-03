import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { formatRoundDate } from "@/lib/format/round-date";
import {
  loadPlayerCourseStats,
  loadPlayerLayoutHoleStats,
  loadPlayerLayoutRounds,
  loadPlayerLayoutStatsForCourse,
  type PlayerLayoutHoleStats,
  type PlayerLayoutRound,
  type PlayerLayoutStats,
  type ScoreBucketKey,
} from "@/lib/rounds/load-player-stats";
import {
  formatAverageVsPar,
  formatHolePattern,
  formatTrend,
  holeLossTone,
  rankHolesByLoss,
  type HoleLossInput,
} from "@/lib/scoring/layout-stats";
import { formatVsPar } from "@/lib/scoring/stats";
import { createServerClient } from "@/lib/supabase/server";
import { homeRowMetaClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ layout?: string }>;
};

type LayoutOption = {
  id: string;
  slug: string;
  name: string;
};

type HoleRow = HoleLossInput & { holeId: string };

/** Holes shown under "Where you lose strokes" before "All N holes". */
const TOP_LOSS_HOLES = 3;

function usualStrokes(bucket: ScoreBucketKey, par: number): number | null {
  switch (bucket) {
    case "ace":
      return 1;
    case "eagle":
      return par - 2;
    case "birdie":
      return par - 1;
    case "par":
      return par;
    case "bogey":
      return par + 1;
    case "doublePlus":
      return null;
  }
}

function toHoleRow(hole: PlayerLayoutHoleStats): HoleRow {
  return {
    holeId: hole.holeId,
    holeNumber: hole.holeNumber,
    par: hole.par,
    timesPlayed: hole.timesPlayed,
    avgVsPar: hole.avgVsPar,
    obCount: hole.obCount,
    doublePlusCount: hole.distribution.doublePlus,
    usualStrokes: usualStrokes(hole.usualBucket, hole.par),
  };
}

/** "12.10" */
function formatShortDate(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function percent(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function LayoutTabs({
  layouts,
  courseSlug,
  selectedLayoutId,
}: {
  layouts: LayoutOption[];
  courseSlug: string;
  selectedLayoutId: string | undefined;
}) {
  return (
    <nav aria-label="Layout" className="flex rounded-md border bg-secondary p-[3px]">
      {layouts.map((layout) => {
        const isSelected = layout.id === selectedLayoutId;
        return (
          <Link
            key={layout.id}
            href={`/courses/${courseSlug}/stats?layout=${layout.slug}`}
            aria-current={isSelected ? "page" : undefined}
            className={cn(
              "flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-sm px-2 text-sm transition-colors",
              isSelected
                ? "bg-card font-bold text-foreground shadow-xs"
                : "font-medium text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="truncate">{layout.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function pickSelectedLayout(
  layouts: LayoutOption[],
  layoutSlug: string | undefined,
  statsByLayoutId: Map<string, PlayerLayoutStats>
): LayoutOption | null {
  if (layouts.length === 0) {
    return null;
  }

  if (layoutSlug) {
    const match = layouts.find((layout) => layout.slug === layoutSlug);
    if (match) {
      return match;
    }
  }

  const withRounds = layouts.find((layout) => statsByLayoutId.has(layout.id));
  return withRounds ?? layouts[0]!;
}

/** Score vs par per round, oldest left; the dashed line is par, the lime dot your best. */
function TrendChart({ rounds }: { rounds: PlayerLayoutRound[] }) {
  const width = 350;
  const height = 120;
  const values = rounds.map((round) => round.vsPar);
  const top = Math.max(0, ...values);
  const bottom = Math.min(0, ...values);
  const span = top - bottom || 1;
  const x = (index: number) =>
    rounds.length === 1 ? width / 2 : 20 + (index * (width - 40)) / (rounds.length - 1);
  const y = (value: number) => 18 + ((top - value) / span) * (height - 40);
  const best = Math.min(...values);
  const bestIndex = values.lastIndexOf(best);
  const last = values.length - 1;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label={`Score versus par over ${rounds.length} rounds: ${values.map(formatVsPar).join(", ")}`}
    >
      <line x1="0" x2={width} y1={y(0)} y2={y(0)} className="stroke-input" strokeDasharray="4 4" />
      <text x={width} y={y(0) - 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
        par
      </text>
      <polyline
        points={values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
        fill="none"
        className="stroke-primary"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {values.map((value, index) => (
        <circle
          key={rounds[index]!.roundId}
          cx={x(index)}
          cy={y(value)}
          r={index === bestIndex ? 6 : 4}
          className={cn("stroke-primary", index === bestIndex ? "fill-good" : "fill-background")}
          strokeWidth="2"
        />
      ))}
      <text x={x(0)} y={y(values[0]!) - 9} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
        {formatVsPar(values[0]!)}
      </text>
      {last > 0 ? (
        <text
          x={x(last)}
          y={y(values[last]!) + 19}
          textAnchor="middle"
          className="fill-foreground font-mono text-[11px] font-semibold"
        >
          {formatVsPar(values[last]!)}
        </text>
      ) : null}
    </svg>
  );
}

const toneClassName = {
  good: "bg-good text-good-foreground",
  over: "bg-over",
  overStrong: "bg-over-strong",
} as const;

function HoleLossRow({ hole }: { hole: HoleRow }) {
  const tone = holeLossTone(hole.avgVsPar);
  return (
    <li className="flex items-center gap-3 border-b py-[11px]">
      <span
        className={cn(
          "flex size-[34px] shrink-0 items-center justify-center rounded-sm font-display text-base font-semibold",
          tone ? toneClassName[tone] : "border"
        )}
      >
        {hole.holeNumber}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">
          Hole {hole.holeNumber} · par {hole.par}
        </span>
        <span className="block truncate text-[13px] text-muted-foreground">{formatHolePattern(hole)}</span>
      </span>
      <span className="shrink-0 font-mono text-base font-semibold tabular-nums">
        {hole.avgVsPar !== null ? formatAverageVsPar(hole.avgVsPar) : "—"}
      </span>
    </li>
  );
}

function LayoutStatsBody({
  stats,
  holeStats,
  rounds,
}: {
  stats: PlayerLayoutStats;
  holeStats: PlayerLayoutHoleStats[];
  rounds: PlayerLayoutRound[];
}) {
  const { distribution, holesPlayed } = stats;
  const holes = holeStats.map(toHoleRow);
  const losing = rankHolesByLoss(holes).slice(0, TOP_LOSS_HOLES);
  const trend = formatTrend(rounds.map((round) => round.vsPar));
  const bestRound = stats.bestRoundId ? rounds.find((round) => round.roundId === stats.bestRoundId) : null;
  const bestDate = formatShortDate(bestRound?.completedAt ?? null);

  const mix = [
    { key: "birdie", label: "Birdie+", className: "bg-good", count: distribution.ace + distribution.eagle + distribution.birdie },
    { key: "par", label: "Par", className: "bg-card", count: distribution.par },
    { key: "bogey", label: "Bogey", className: "bg-over", count: distribution.bogey },
    { key: "double", label: "Double+", className: "bg-over-strong", count: distribution.doublePlus },
  ].map((part) => ({ ...part, pct: percent(part.count, holesPlayed) }));

  return (
    <>
      <section aria-label="Best, average, rounds">
        <dl className="grid grid-cols-3 border-y">
          <div className="flex flex-col-reverse gap-0.5 py-3.5">
            <dt className="text-[13px] text-muted-foreground">
              {stats.bestRoundId ? (
                <Link href={`/rounds/${stats.bestRoundId}`} className="inline-flex items-center hover:text-foreground">
                  Best{bestDate ? ` · ${bestDate}` : ""}
                  <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              ) : (
                "Best"
              )}
            </dt>
            <dd className="font-display text-[28px] font-semibold leading-none tabular-nums">
              {stats.bestVsPar !== null ? formatVsPar(stats.bestVsPar) : "—"}
            </dd>
          </div>
          <div className="flex flex-col-reverse gap-0.5 border-l py-3.5 pl-3.5">
            <dt className="text-[13px] text-muted-foreground">Average</dt>
            <dd className="font-display text-[28px] font-semibold leading-none tabular-nums">
              {stats.avgVsPar !== null ? formatAverageVsPar(stats.avgVsPar) : "—"}
            </dd>
          </div>
          <div className="flex flex-col-reverse gap-0.5 border-l py-3.5 pl-3.5">
            <dt className="text-[13px] text-muted-foreground">Rounds</dt>
            <dd className="font-display text-[28px] font-semibold leading-none tabular-nums">
              {stats.roundsPlayed}
            </dd>
          </div>
        </dl>
      </section>

      {rounds.length >= 2 ? (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={sectionHeadingClassName}>Your rounds here</h2>
            <span className="text-[13px] text-muted-foreground">oldest → newest</span>
          </div>
          <TrendChart rounds={rounds} />
          {trend ? <p className="text-sm text-foreground/85">{trend}</p> : null}
        </section>
      ) : null}

      {holes.length > 0 ? (
        <section>
          <div className="flex items-baseline justify-between gap-3 border-b border-foreground pb-1.5">
            <h2 className={sectionHeadingClassName}>Where you lose strokes</h2>
            <span className="text-[13px] text-muted-foreground">avg vs par</span>
          </div>
          {losing.length > 0 ? (
            <ul>
              {losing.map((hole) => (
                <HoleLossRow key={hole.holeId} hole={hole} />
              ))}
            </ul>
          ) : (
            <p className={cn(homeRowMetaClassName, "border-b py-3")}>No hole costs you strokes on average. Nice.</p>
          )}
          <details className="group">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[15px] font-semibold text-primary [&::-webkit-details-marker]:hidden">
              All {holes.length} holes
              <ChevronDown className="size-[18px] transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <ul className="border-t">
              {holes.map((hole) => (
                <HoleLossRow key={hole.holeId} hole={hole} />
              ))}
            </ul>
          </details>
        </section>
      ) : null}

      {holesPlayed > 0 ? (
        <section className="space-y-2">
          <h2 className={sectionHeadingClassName}>Score mix</h2>
          <div
            role="img"
            aria-label={mix.map((part) => `${part.label} ${part.pct}%`).join(", ")}
            className="flex h-3.5 overflow-hidden rounded-sm border"
          >
            {mix.map((part) =>
              part.pct > 0 ? (
                <span key={part.key} className={part.className} style={{ width: `${part.pct}%` }} />
              ) : null
            )}
          </div>
          <div className="flex justify-between text-[13px] text-muted-foreground">
            {mix.map((part) => (
              <span key={part.key}>
                {part.label} <b className="font-mono text-foreground">{part.pct}%</b>
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

export default async function CourseStatsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { layout: layoutSlug } = await searchParams;
  const supabase = await createServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/auth?message=Please+sign+in+to+view+your+stats");
  }

  // The stats views are keyed by slug, so they load together with the course.
  const [{ data: course, error: courseError }, courseStatsResult, layoutStatsResult] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, name, slug, layouts(id, name, slug)")
        .eq("slug", slug)
        .eq("layouts.is_active", true)
        .order("name", { referencedTable: "layouts", ascending: true })
        .maybeSingle(),
      loadPlayerCourseStats(supabase, slug),
      loadPlayerLayoutStatsForCourse(supabase, slug),
    ]);

  if (courseError || !course) {
    notFound();
  }

  const layoutOptions: LayoutOption[] = course.layouts.map((layout) => ({
    id: layout.id,
    slug: layout.slug,
    name: layout.name,
  }));

  const selectedLayout = pickSelectedLayout(
    layoutOptions,
    layoutSlug,
    layoutStatsResult.byLayoutId
  );

  const [holeStatsResult, roundsResult] = selectedLayout
    ? await Promise.all([
        loadPlayerLayoutHoleStats(supabase, selectedLayout.id),
        loadPlayerLayoutRounds(supabase, selectedLayout.id),
      ])
    : [
        { holes: [], error: null },
        { rounds: [], error: null },
      ];

  const loadError =
    courseStatsResult.error ??
    layoutStatsResult.error ??
    holeStatsResult.error ??
    roundsResult.error ??
    null;

  const selectedStats = selectedLayout
    ? (layoutStatsResult.byLayoutId.get(selectedLayout.id) ?? null)
    : null;
  const lastPlayed = courseStatsResult.stats
    ? formatRoundDate(courseStatsResult.stats.lastPlayedAt)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-4 sm:p-8">
      <header className="space-y-1.5">
        <Link
          href={`/courses/${slug}`}
          aria-label="Back to course"
          className="-ml-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <p className="text-[13px] font-semibold text-muted-foreground">Your stats</p>
        <h1 className={pageTitleClassName}>{course.name}</h1>
        <p className="text-sm text-muted-foreground">
          {courseStatsResult.stats
            ? `${lastPlayed ? `Last played ${lastPlayed} · ` : ""}Total rounds ${courseStatsResult.stats.roundsPlayed}`
            : "No completed rounds at this course yet."}
        </p>
      </header>

      {loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load stats: {loadError}
        </p>
      ) : null}

      {!loadError && layoutOptions.length === 0 ? (
        <p className={homeRowMetaClassName}>No active layouts for this course.</p>
      ) : null}

      {!loadError && layoutOptions.length > 1 ? (
        <LayoutTabs layouts={layoutOptions} courseSlug={slug} selectedLayoutId={selectedLayout?.id} />
      ) : null}

      {!loadError && selectedLayout ? (
        selectedStats ? (
          <LayoutStatsBody
            stats={selectedStats}
            holeStats={holeStatsResult.holes}
            rounds={roundsResult.rounds}
          />
        ) : (
          <p className={homeRowMetaClassName}>
            No completed rounds on this layout yet. Start a round from the course page.
          </p>
        )
      ) : null}
    </main>
  );
}
