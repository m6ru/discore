import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { formatRoundDate } from "@/lib/format/round-date";
import {
  loadPlayerCourseStats,
  loadPlayerLayoutStatsForCourse,
  type PlayerLayoutStats,
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

function courseSummaryLine(roundsPlayed: number, lastPlayedAt: string | null): string {
  const roundLabel = roundsPlayed === 1 ? "1 round here" : `${roundsPlayed} rounds here`;
  const lastPlayed = formatRoundDate(lastPlayedAt);
  return lastPlayed ? `${roundLabel} · last played ${lastPlayed}` : roundLabel;
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

function LayoutStatsBody({ stats }: { stats: PlayerLayoutStats }) {
  const { distribution, holesPlayed } = stats;
  const distributionRows = [
    ...(distribution.ace > 0 ? [{ key: "ace", label: "Ace", count: distribution.ace }] : []),
    ...(distribution.eagle > 0
      ? [{ key: "eagle", label: "Eagle", count: distribution.eagle }]
      : []),
    { key: "birdie", label: "Birdie", count: distribution.birdie },
    { key: "par", label: "Par", count: distribution.par },
    { key: "bogey", label: "Bogey", count: distribution.bogey },
    { key: "double", label: "Double+", count: distribution.doublePlus },
  ];

  return (
    <section className="space-y-3 rounded-lg border px-4 py-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className={homeRowMetaClassName}>Times played</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">{stats.roundsPlayed}</dd>
        </div>
        <div>
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
        <div>
          <dt className={homeRowMetaClassName}>Average</dt>
          <dd className="font-mono text-base font-semibold tabular-nums">
            {stats.avgVsPar !== null ? formatAvgVsPar(stats.avgVsPar) : "—"}
          </dd>
        </div>
      </dl>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 sm:grid-cols-5">
        <div>
          <dt className={homeRowMetaClassName}>Birdie</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">
            {formatRate(distribution.birdie, holesPlayed)}
          </dd>
        </div>
        <div>
          <dt className={homeRowMetaClassName}>Par</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">
            {formatRate(distribution.par, holesPlayed)}
          </dd>
        </div>
        <div>
          <dt className={homeRowMetaClassName}>Bogey</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">
            {formatRate(distribution.bogey, holesPlayed)}
          </dd>
        </div>
        <div>
          <dt className={homeRowMetaClassName}>Double+</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">
            {formatRate(distribution.doublePlus, holesPlayed)}
          </dd>
        </div>
        <div>
          <dt className={homeRowMetaClassName}>OB</dt>
          <dd className="font-mono text-sm font-semibold tabular-nums">
            {formatRate(stats.obHolesTotal, holesPlayed)}
          </dd>
        </div>
      </dl>

      <div className="grid grid-cols-3 gap-2 border-t pt-3 sm:grid-cols-6">
        {distributionRows.map((row) => (
          <div key={row.key} className="min-w-0 text-center">
            <p className="truncate text-xs text-muted-foreground">{row.label}</p>
            <p className="font-mono text-sm font-semibold tabular-nums">{row.count}</p>
          </div>
        ))}
      </div>
    </section>
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

  const loadError =
    layoutsError?.message ?? courseStatsResult.error ?? layoutStatsResult.error ?? null;

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
            className="-mr-2 inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Course
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
        <section className="space-y-2">
          <h2 className={sectionHeadingClassName}>Layout</h2>
          {layoutOptions.length === 0 ? (
            <p className={homeRowMetaClassName}>No active layouts for this course.</p>
          ) : (
            <ul className="space-y-2">
              {layoutOptions.map((layout) => {
                const layoutStats = layoutStatsResult.byLayoutId.get(layout.id);
                const isSelected = selectedLayout?.id === layout.id;
                const metaParts = [
                  layoutStats
                    ? layoutStats.roundsPlayed === 1
                      ? "1 round"
                      : `${layoutStats.roundsPlayed} rounds`
                    : "No rounds",
                ];

                return (
                  <li key={layout.id}>
                    <Link
                      href={`/courses/${slug}/stats?layout=${layout.slug}`}
                      className={cn(
                        "block rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50",
                        isSelected && "border-primary bg-muted/30"
                      )}
                    >
                      <p className="font-medium">{layout.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {!loadError && selectedLayout ? (
        <section className="space-y-2">
          <h2 className={sectionHeadingClassName}>{selectedLayout.name}</h2>
          {selectedStats ? (
            <LayoutStatsBody stats={selectedStats} />
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
