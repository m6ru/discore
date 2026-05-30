import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { StartRoundButton } from "../start-round-button";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CourseDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, name, slug, location, terrain_type, difficulty_tier, details")
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          <Link href="/courses" className="underline underline-offset-4">
            All courses
          </Link>
        </p>
        <h1 className="text-2xl font-bold">{course.name}</h1>
        <p className="text-sm text-muted-foreground">{course.location}</p>
        {course.terrain_type || course.difficulty_tier ? (
          <p className="text-sm text-muted-foreground">
            {[course.terrain_type, course.difficulty_tier].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {course.details ? (
          <p className="text-sm text-muted-foreground">{course.details}</p>
        ) : null}
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Layouts</h2>

        {layoutsError ? (
          <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            Failed to load layouts: {layoutsError.message}
          </p>
        ) : null}

        {!layoutsError && (!layouts || layouts.length === 0) ? (
          <p className="text-sm text-muted-foreground">No active layouts for this course.</p>
        ) : null}

        {layouts && layouts.length > 0 ? (
          <ul className="space-y-3">
            {layouts.map((layout) => (
              <li
                key={layout.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{layout.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Par {layout.total_par} · {layout.total_distance_m} m
                  </p>
                  {layout.map_url ? (
                    <a
                      href={layout.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary underline underline-offset-4"
                    >
                      Course map
                    </a>
                  ) : null}
                </div>
                <StartRoundButton layoutId={layout.id} className="shrink-0" />
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
        Back home
      </Link>
    </main>
  );
}
