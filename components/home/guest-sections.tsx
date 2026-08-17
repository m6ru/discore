import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { NearYouStart } from "@/components/home/near-you-start";
import { ContinueTrialCard } from "@/components/home/continue-trial-card";

export async function GuestHomeSections() {
  const supabase = await createServerClient();
  const { courses, error } = await loadCourseSummaries(supabase);

  const nearYouCourses = (courses ?? [])
    .filter((course) => course.lat !== null && course.lng !== null)
    .map((course) => ({
      name: course.name,
      slug: course.slug,
      lat: course.lat!,
      lng: course.lng!,
      layoutCount: course.layoutCount,
    }));

  return (
    <>
      <ContinueTrialCard />
      {error ? (
        <p className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
          Failed to load courses: {error.message}
        </p>
      ) : (
        <NearYouStart courses={nearYouCourses} />
      )}
      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/auth"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>{" "}
        to save rounds and play with friends.
      </p>
    </>
  );
}
