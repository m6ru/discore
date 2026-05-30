import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { CoursesList, type CourseListItem } from "./courses-list";

export default async function CoursesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+continue");
  }

  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id, name, slug, location, layouts(id, is_active)")
    .order("name", { ascending: true });

  const listItems: CourseListItem[] = (courses ?? []).map((course) => ({
    id: course.id,
    name: course.name,
    slug: course.slug,
    location: course.location,
    layoutCount: (course.layouts ?? []).filter((layout) => layout.is_active).length,
  }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
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
        <CoursesList courses={listItems} />
      )}

      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
        Back home
      </Link>
    </main>
  );
}
