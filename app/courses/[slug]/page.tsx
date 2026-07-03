import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import fs from "node:fs";
import path from "node:path";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { cn } from "@/lib/utils";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+continue");
  }

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

  const showAbout =
    course.location.trim().length > 0 ||
    Boolean(course.details?.trim()) ||
    mapsUrl !== null ||
    mapImageSrc !== null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className={cn(pageTitleClassName, "min-w-0 flex-1")}>{course.name}</h1>
          <Link
            href="/courses"
            aria-label="Back to courses"
            className="-mr-2 inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Courses
          </Link>
        </div>
        {headerMeta ? <p className={pageSubtitleClassName}>{headerMeta}</p> : null}
      </header>

      <section className="space-y-3">
        <h2 className={sectionHeadingClassName}>Layouts</h2>

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
          <h2 className={sectionHeadingClassName}>About</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            {course.location.trim().length > 0 || mapsUrl ? (
              <div className="space-y-1">
                {course.location.trim().length > 0 ? <p>{course.location}</p> : null}
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block underline underline-offset-4 hover:text-foreground"
                  >
                    Open in Maps
                  </a>
                ) : null}
              </div>
            ) : null}
            {course.details?.trim() ? (
              <p className="whitespace-pre-line">{course.details}</p>
            ) : null}
            {mapImageSrc ? (
              <>
                <a href="#course-map" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- public course map asset */}
                  <img
                    src={mapImageSrc}
                    alt={`${course.name} course map`}
                    className="h-auto w-full rounded-lg border"
                  />
                </a>
                <div
                  id="course-map"
                  className="fixed inset-0 z-50 hidden scroll-mt-0 bg-background target:flex target:items-center target:justify-center target:p-4"
                >
                  <a href="#" className="absolute inset-0 z-0" aria-label="Close map" tabIndex={-1} />
                  <a
                    href="#"
                    className="absolute top-3 right-3 z-20 flex size-10 items-center justify-center rounded-full border bg-background text-2xl leading-none text-muted-foreground shadow-sm"
                    aria-label="Close map"
                  >
                    ×
                  </a>
                  {/* eslint-disable-next-line @next/next/no-img-element -- same public course map asset */}
                  <img
                    src={mapImageSrc}
                    alt={`${course.name} course map`}
                    className="relative z-10 max-h-[85dvh] max-w-full rounded-lg border object-contain shadow-sm"
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
