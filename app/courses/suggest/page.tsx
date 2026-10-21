import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { cn } from "@/lib/utils";
import { SuggestionForm } from "./suggestion-form";

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

  if (slug) {
    const { data: courseRow } = await supabase
      .from("courses")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();
    if (!courseRow) {
      notFound();
    }
    course = courseRow;

    const { data: layoutRows } = await supabase
      .from("layouts")
      .select("id, name")
      .eq("course_id", courseRow.id)
      .eq("is_active", true)
      .order("name", { ascending: true });
    layouts = layoutRows ?? [];
  }

  const backHref = course ? `/courses/${course.slug}` : "/courses";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className={cn(pageTitleClassName, "min-w-0 flex-1")}>
            {course ? "Suggest a fix" : "Suggest a new course"}
          </h1>
          <Link
            href={backHref}
            aria-label="Back"
            className="-mr-2 inline-flex shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        </div>
        <p className={pageSubtitleClassName}>
          {course
            ? `${course.name} — tell us what's changed. A photo of the tee sign helps most.`
            : "A course that's missing? Tell us where it is and what you know about it."}
        </p>
      </header>

      <SuggestionForm
        userId={claims.sub}
        course={course}
        layouts={layouts}
        backHref={backHref}
        initialCourseName={name?.slice(0, 200) ?? ""}
      />
    </main>
  );
}
