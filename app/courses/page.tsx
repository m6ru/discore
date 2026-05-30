import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { CoursesList } from "./courses-list";

export default async function CoursesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+continue");
  }

  const { courses, error: coursesError } = await loadCourseSummaries(supabase);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="text-sm text-muted-foreground">
          Pick a course, then choose a layout to start a round.
        </p>
      </header>

      {coursesError ? (
        <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
          Failed to load courses: {coursesError.message}
        </p>
      ) : (
        <CoursesList courses={courses ?? []} />
      )}
    </main>
  );
}
