import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { formatRoundDate } from "@/lib/format/round-date";
import {
  loadPlayerCourseStats,
  loadPlayerLayoutHoleStats,
  loadPlayerLayoutStatsForCourse,
  type PlayerLayoutHoleStats,
  type PlayerLayoutStats,
  type ScoreBucketKey,
} from "@/lib/rounds/load-player-stats";
import { formatVsPar } from "@/lib/scoring/stats";
import { createServerClient } from "@/lib/supabase/server";
import {
  homeRowMetaClassName,
  pageSubtitleClassName,
  pageTitleClassName,
} from "@/lib/ui/page-chrome";
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

function formatAvgVsPar(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return "E";
  }
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

function formatRate(count: number, total: number): string {
  if (total === 0) {
    return "—";
  }
  const pct = Math.round((count / total) * 1000) / 10;
  return `${pct}%`;
}

function usualBucketLabel(bucket: ScoreBucketKey): string {
  switch (bucket) {
    case "ace":
      return "Ace";
    case "eagle":
      return "Eagle";
    case "birdie":
      return "Birdie";
    case "par":
      return "Par";
    case "bogey":
      return "Bogey";
    case "doublePlus":
      return "Double+";
  }
}

function courseSummaryLine(roundsPlayed: number, lastPlayedAt: string | null): string {
  const lastPlayed = formatRoundDate(lastPlayedAt);
  const roundsPart = `Total rounds: ${roundsPlayed}`;
  return lastPlayed ? `Last played ${lastPlayed} · ${roundsPart}` : roundsPart;
}

function LayoutPicker({
  layouts,
  courseSlug,
  selectedLayoutId,
}: {
  layouts: LayoutOption[];
  courseSlug: string;
  selectedLayoutId: string | undefined;
}) {
  return (
    <div className="flex w-full rounded-lg border bg-muted/40 p-1">
      {layouts.map((layout) => {
        const isSelected = layout.id === selectedLayoutId;

        return (
          <Link
            key={layout.id}
            href={`/courses/${courseSlug}/stats?layout=${layout.slug}`}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center rounded-md px-2 py-2 text-center text-sm transition-colors",
              isSelected
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="truncate">{layout.name}</span>
          </Link>
        );
      })}
    </div>
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

function LayoutStatsBody({
  stats,
  holeStats,
}: {
  stats: PlayerLayoutStats;
  holeStats: PlayerLayoutHoleStats[];
}) {
  const { distribution, holesPlayed } = stats;
  const distributionRows = [
    { key: "ace", label: "Ace", count: distribution.ace },
    ...(distribution.eagle > 0
      ? [{ key: "eagle", label: "Eagle", count: distribution.eagle }]
      : []),
    { key: "birdie", label: "Birdie", count: distribution.birdie },
    { key: "par", label: "Par", count: distribution.par },
    { key: "bogey", label: "Bogey", count: distribution.bogey },
    { key: "double", label: "Double+", count: distribution.doublePlus },
  ];

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 [&_dd]:ml-0">
          <div className="text-center">
            <dt className={homeRowMetaClassName}>Times played</dt>
            <dd className="font-mono text-base font-semibold tabular-nums">{stats.roundsPlayed}</dd>
          </div>
          <div className="text-center">
            <dt className={homeRowMetaClassName}>Best</dt>
            <dd className="font-mono text-base font-semibold tabular-nums">
              {stats.bestVsPar !== null ? formatVsPar(stats.bestVsPar) : "—"}
            </dd>
            {stats.bestRoundId ? (
              <dd className="mt-0.5">
                <Link
                  href={`/rounds/${stats.bestRoundId}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  View round
                </Link>
              </dd>
            ) : null}
          </div>
          <div className="text-center">
            <dt className={homeRowMetaClassName}>Average</dt>
            <dd className="font-mono text-base font-semibold tabular-nums">
              {stats.avgVsPar !== null ? formatAvgVsPar(stats.avgVsPar) : "—"}
            </dd>
          </div>
        </dl>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 sm:grid-cols-5 [&_dd]:ml-0">
          <div className="text-center">
            <dt className={homeRowMetaClassName}>Birdie</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums">
              {formatRate(distribution.birdie, holesPlayed)}
            </dd>
          </div>
          <div className="text-center">
            <dt className={homeRowMetaClassName}>Par</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums">
              {formatRate(distribution.par, holesPlayed)}
            </dd>
          </div>
          <div className="text-center">
            <dt className={homeRowMetaClassName}>Bogey</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums">
              {formatRate(distribution.bogey, holesPlayed)}
            </dd>
          </div>
          <div className="text-center">
            <dt className={homeRowMetaClassName}>Double+</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums">
              {formatRate(distribution.doublePlus, holesPlayed)}
            </dd>
          </div>
          <div className="text-center">
            <dt className={homeRowMetaClassName}>OB</dt>
            <dd className="font-mono text-sm font-semibold tabular-nums">
              {formatRate(stats.obHolesTotal, holesPlayed)}
            </dd>
          </div>
        </dl>

        <div
          className={cn(
            "grid gap-2 border-t pt-3 justify-items-center text-center",
            distribution.eagle > 0 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-5"
          )}
        >
          {distributionRows.map((row) => (
            <div key={row.key} className="min-w-0 w-full">
              <p className="truncate text-xs text-muted-foreground">{row.label}</p>
              <p className="font-mono text-sm font-semibold tabular-nums">{row.count}</p>
            </div>
          ))}
        </div>
      </section>

      {holeStats.length > 0 ? (
        <section className="space-y-2">
          <h2 className={sectionHeadingClassName}>Per hole</h2>
          <ul className="divide-y rounded-lg border">
            {holeStats.map((hole) => {
              const obRate = formatRate(hole.obCount, hole.timesPlayed);
              const avgLabel =
                hole.avgVsPar !== null ? formatAvgVsPar(hole.avgVsPar) : "—";

              return (
                <li key={hole.holeId} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      Hole {hole.holeNumber}
                      <span className="text-muted-foreground"> · Par {hole.par}</span>
                    </p>
                    <p className={cn(homeRowMetaClassName, "mt-0.5")}>
                      Usually {usualBucketLabel(hole.usualBucket).toLowerCase()}
                      <span> · Avg {avgLabel}</span>
                      {hole.obCount > 0 ? <span> · OB {obRate}</span> : null}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                    {hole.timesPlayed}×
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default async function CourseStatsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { layout: layoutSlug } = await searchParams;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+view+your+stats");
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (courseError || !course) {
    notFound();
  }

  const [{ data: layouts, error: layoutsError }, courseStatsResult, layoutStatsResult] =
    await Promise.all([
      supabase
        .from("layouts")
        .select("id, name, slug")
        .eq("course_id", course.id)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      loadPlayerCourseStats(supabase, slug),
      loadPlayerLayoutStatsForCourse(supabase, slug),
    ]);

  const layoutOptions: LayoutOption[] =
    layouts?.map((layout) => ({
      id: layout.id,
      slug: layout.slug,
      name: layout.name,
    })) ?? [];

  const selectedLayout = pickSelectedLayout(
    layoutOptions,
    layoutSlug,
    layoutStatsResult.byLayoutId
  );

  const holeStatsResult = selectedLayout
    ? await loadPlayerLayoutHoleStats(supabase, selectedLayout.id)
    : { holes: [], error: null };

  const loadError =
    layoutsError?.message ??
    courseStatsResult.error ??
    layoutStatsResult.error ??
    holeStatsResult.error ??
    null;

  const selectedStats = selectedLayout
    ? (layoutStatsResult.byLayoutId.get(selectedLayout.id) ?? null)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className={cn(pageTitleClassName, "min-w-0 flex-1")}>Your stats</h1>
          <Link
            href={`/courses/${slug}`}
            aria-label="Back to course"
            className="-mr-2 inline-flex shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        </div>
        <p className={pageSubtitleClassName}>{course.name}</p>
        {courseStatsResult.stats ? (
          <p className={homeRowMetaClassName}>
            {courseSummaryLine(
              courseStatsResult.stats.roundsPlayed,
              courseStatsResult.stats.lastPlayedAt
            )}
          </p>
        ) : (
          <p className={homeRowMetaClassName}>No completed rounds at this course yet.</p>
        )}
      </header>

      {loadError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load stats: {loadError}
        </p>
      ) : null}

      {!loadError ? (
        <section className="space-y-3">
          {layoutOptions.length === 0 ? (
            <p className={homeRowMetaClassName}>No active layouts for this course.</p>
          ) : (
            <>
              <h2 className={sectionHeadingClassName}>Layout</h2>
              <LayoutPicker
                layouts={layoutOptions}
                courseSlug={slug}
                selectedLayoutId={selectedLayout?.id}
              />
            </>
          )}
        </section>
      ) : null}

      {!loadError && selectedLayout ? (
        <section className="space-y-2">
          {selectedStats ? (
            <LayoutStatsBody stats={selectedStats} holeStats={holeStatsResult.holes} />
          ) : (
            <p className={homeRowMetaClassName}>
              No completed rounds on this layout yet. Start a round from the course page.
            </p>
          )}
        </section>
      ) : null}
    </main>
  );
}
