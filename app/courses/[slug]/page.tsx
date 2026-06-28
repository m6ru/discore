import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { CourseLayoutPicker } from "./course-layout-picker";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function courseCity(location: string): string {
  return location.includes(",")
    ? location.slice(0, location.indexOf(",")).trim()
    : location.trim();
}

function courseHeaderMeta(course: {
  location: string;
  terrain_type: string | null;
  difficulty_tier: string | null;
}): string | null {
  const parts = [
    courseCity(course.location),
    course.terrain_type?.trim(),
    course.difficulty_tier?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
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
    .select("id, name, slug, total_par, total_distance_m, map_url")
    .eq("course_id", course.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const mapsUrl =
    course.lat !== null && course.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${course.lat},${course.lng}`
      : null;

  const headerMeta = courseHeaderMeta(course);
  const layoutOptions =
    layouts?.map((layout) => ({
      id: layout.id,
      name: layout.name,
      totalPar: layout.total_par,
      totalDistanceM: layout.total_distance_m,
      mapUrl: layout.map_url,
    })) ?? [];

  const showAbout =
    course.location.trim().length > 0 || Boolean(course.details?.trim()) || mapsUrl !== null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          <Link href="/courses" className="underline underline-offset-4">
            ← Courses
          </Link>
        </p>
        <h1 className={pageTitleClassName}>{course.name}</h1>
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
            {course.location.trim().length > 0 ? <p>{course.location}</p> : null}
            {course.details?.trim() ? <p>{course.details}</p> : null}
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-primary underline underline-offset-4"
              >
                Open in Maps
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}
