import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { pageTitleClassName } from "@/lib/ui/page-chrome";
import { CoursesList } from "./courses-list";

export default async function CoursesPage() {
  const supabase = await createServerClient();
  const { courses, error: coursesError } = await loadCourseSummaries(supabase);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-2 pb-4 sm:p-8">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className={pageTitleClassName}>Courses</h1>
        <Link href="/courses/suggest" className="shrink-0 text-sm font-semibold text-primary">
          Missing one?
        </Link>
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
