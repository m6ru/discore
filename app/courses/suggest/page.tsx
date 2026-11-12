import { notFound, redirect } from "next/navigation";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { createServerClient } from "@/lib/supabase/server";
import { SuggestionForm, type NearbyCandidate } from "./suggestion-form";

type PageProps = {
  searchParams: Promise<{ course?: string; name?: string }>;
};

/** `/courses/suggest?course=<slug>` reports a problem; without `course` suggests a new course. */
export default async function SuggestPage({ searchParams }: PageProps) {
  const { course: slug, name } = await searchParams;
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  if (!claims) {
    redirect("/auth?message=Please+sign+in+to+suggest+a+change");
  }

  let course: { id: string; name: string; slug: string } | null = null;
  let layouts: { id: string; name: string }[] = [];
  let knownCourses: NearbyCandidate[] = [];

  if (slug) {
    const { data: courseRow } = await supabase
      .from("courses")
      .select("id, name, slug, layouts(id, name)")
      .eq("slug", slug)
      .eq("layouts.is_active", true)
      .order("name", { referencedTable: "layouts", ascending: true })
      .maybeSingle();
    if (!courseRow) {
      notFound();
    }
    course = { id: courseRow.id, name: courseRow.name, slug: courseRow.slug };
    layouts = courseRow.layouts;
  } else {
    // For "Is it one of these?" once the phone's position is known.
    const { courses } = await loadCourseSummaries(supabase);
    knownCourses = (courses ?? []).flatMap((c) =>
      c.lat !== null && c.lng !== null
        ? [{ name: c.name, slug: c.slug, location: c.location, lat: c.lat, lng: c.lng }]
        : []
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-2 pb-4 sm:p-8">
      <SuggestionForm
        userId={claims.sub}
        course={course}
        layouts={layouts}
        knownCourses={knownCourses}
        backHref={course ? `/courses/${course.slug}` : "/courses"}
        initialCourseName={name?.slice(0, 200) ?? ""}
      />
    </main>
  );
}
