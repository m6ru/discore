import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>Courses</h1>
        <p className={pageSubtitleClassName}>Pick a course to play.</p>
      </header>

      {coursesError ? (
        <p className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
          Failed to load courses: {coursesError.message}
        </p>
      ) : (
        <CoursesList courses={courses ?? []} />
      )}
    </main>
  );
}
