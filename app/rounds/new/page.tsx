import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import { findInProgressRoundId } from "@/lib/rounds/round-draft-actions";
import { StartRoundButton } from "@/components/rounds/start-round-button";

type PageProps = {
  searchParams: Promise<{ layoutId?: string }>;
};

export default async function NewRoundPage({ searchParams }: PageProps) {
  const { layoutId } = await searchParams;

  if (!layoutId) {
    redirect("/courses");
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+continue");
  }

  const existingId = await findInProgressRoundId(supabase, user.id);
  if (existingId) {
    redirect(`/rounds/${existingId}`);
  }

  const { data: layout, error: layoutError } = await supabase
    .from("layouts")
    .select("id, name, total_par, total_distance_m, courses(name, slug)")
    .eq("id", layoutId)
    .eq("is_active", true)
    .maybeSingle();

  if (layoutError || !layout) {
    redirect("/courses");
  }

  const course = pickOne(layout.courses);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Create round</h1>
        <p className="text-sm text-muted-foreground">
          {course?.name ?? "Course"} · {layout.name} (Par {layout.total_par},{" "}
          {layout.total_distance_m} m)
        </p>
      </header>

      <StartRoundButton layoutId={layout.id} label="Create draft round" />

      <div className="flex flex-wrap gap-4 text-sm">
        {course?.slug ? (
          <Link
            href={`/courses/${course.slug}`}
            className="text-muted-foreground underline underline-offset-4"
          >
            Back to course
          </Link>
        ) : null}
        <Link href="/courses" className="text-muted-foreground underline underline-offset-4">
          All courses
        </Link>
        <Link href="/" className="text-muted-foreground underline underline-offset-4">
          Back home
        </Link>
      </div>
    </main>
  );
}
