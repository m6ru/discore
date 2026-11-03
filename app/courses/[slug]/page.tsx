import Link from "next/link";
import { ChevronLeft, MapPin } from "lucide-react";
import Image from "next/image";
import fs from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { formatRoundDate } from "@/lib/format/round-date";
import { loadPlayerCourseStats } from "@/lib/rounds/load-player-stats";
import { createServerClient } from "@/lib/supabase/server";
import { CourseLayoutPicker } from "./course-layout-picker";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function courseHeaderMeta(course: {
  terrain_type: string | null;
  difficulty_tier: string | null;
}): string | null {
  const parts = [course.terrain_type?.trim(), course.difficulty_tier?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function holeCountFromRelation(holes: { count: number }[] | null | undefined): number {
  return holes?.[0]?.count ?? 0;
}

function courseMapSrc(slug: string): string | null {
  const filePath = path.join(process.cwd(), "public", "courses", `${slug}-map.png`);
  return fs.existsSync(filePath) ? `/courses/${slug}-map.png` : null;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, name, slug, location, lat, lng, terrain_type, difficulty_tier, details")
    .eq("slug", slug)
    .maybeSingle();

  if (courseError || !course) {
    notFound();
  }

  const { data: layouts, error: layoutsError } = await supabase
    .from("layouts")
    .select("id, name, slug, total_par, total_distance_m, map_url, holes(count)")
    .eq("course_id", course.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { stats: courseStats } = claims
    ? await loadPlayerCourseStats(supabase, slug)
    : { stats: null };

  const mapsUrl =
    course.lat !== null && course.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${course.lat},${course.lng}`
      : null;

  const headerMeta = courseHeaderMeta(course);
  const mapImageSrc = courseMapSrc(course.slug);
  const layoutOptions =
    layouts?.map((layout) => ({
      id: layout.id,
      name: layout.name,
      holeCount: holeCountFromRelation(layout.holes),
      totalPar: layout.total_par,
      totalDistanceM: layout.total_distance_m,
      mapUrl: layout.map_url,
    })) ?? [];

  const lastPlayed = courseStats ? formatRoundDate(courseStats.lastPlayedAt) : null;
  const showAbout =
    headerMeta !== null ||
    (!mapsUrl && course.location.trim().length > 0) ||
    Boolean(course.details?.trim()) ||
    mapImageSrc !== null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/courses"
            aria-label="Back to courses"
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          {claims ? (
            <Link
              href={`/courses/${slug}/stats`}
              className="flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary"
            >
              Your stats
            </Link>
          ) : null}
        </div>
        <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight">
          {course.name}
        </h1>
        {courseStats ? (
          <p className="text-sm text-muted-foreground">
            {lastPlayed ? `Last played ${lastPlayed} · ` : null}
            Total rounds {courseStats.roundsPlayed}
          </p>
        ) : null}
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 min-w-0 items-center gap-1.5 pt-1 text-sm font-medium text-foreground/85 hover:text-foreground"
          >
            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{course.location.trim() || "Open in maps"}</span>
          </a>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Pick a layout</h2>

        {layoutsError ? (
          <p className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
            Failed to load layouts: {layoutsError.message}
          </p>
        ) : null}

        {!layoutsError && layoutOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active layouts for this course.</p>
        ) : null}

        {!layoutsError && layoutOptions.length > 0 ? (
          <CourseLayoutPicker layouts={layoutOptions} />
        ) : null}
      </section>

      {showAbout ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">About</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            {headerMeta ? <p>{headerMeta}</p> : null}
            {!mapsUrl && course.location.trim().length > 0 ? (
              <p>{course.location.trim()}</p>
            ) : null}
            {course.details?.trim() ? (
              <p className="whitespace-pre-line">{course.details.trim()}</p>
            ) : null}
            {mapImageSrc ? (
              <Image
                src={mapImageSrc}
                alt={`${course.name} course map`}
                width={896}
                height={1200}
                className="h-auto w-full rounded-lg border"
                sizes="(max-width: 768px) 100vw, 48rem"
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        Something wrong or out of date?{" "}
        <Link
          href={`/courses/suggest?course=${course.slug}`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Suggest a fix
        </Link>
      </p>
    </main>
  );
}
