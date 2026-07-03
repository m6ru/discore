import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { loadHomeData } from "@/lib/home/load-home-data";
import {
  homeRowMetaClassName,
  homeRowTitleClassName,
  pagePrimaryButtonClassName,
} from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { HomeInvites } from "@/components/home/invites";
import { HomeRecentRounds } from "@/components/home/recent-rounds";
import { HomeGetStarted } from "@/components/home/get-started";
import { NearYouStart } from "@/components/home/near-you-start";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  userId: string;
};

export async function HomeSections({ userId }: Props) {
  const supabase = await createServerClient();
  const [data, coursesResult] = await Promise.all([
    loadHomeData(supabase, userId),
    loadCourseSummaries(supabase),
  ]);

  const nearYouCourses = (coursesResult.courses ?? [])
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
      {/* Phase 5 stats teaser: one-line snapshot (rounds played · best · avg) goes here. */}

      {data.activeRounds.length > 0 ? (
        <section className="space-y-2">
          <h2 className={sectionHeadingClassName}>Continue round</h2>
          <ul className="space-y-2">
            {data.activeRounds.map((round) => {
              const isScorer = round.scorer_id === userId;

              return (
                <li
                  key={round.id}
                  className="space-y-3 rounded-lg bg-muted/60 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0 space-y-0.5">
                      <p className={homeRowTitleClassName}>{round.course_name}</p>
                      <p className={homeRowMetaClassName}>
                        {round.layout_name} · started {formatDateTime(round.started_at)}
                      </p>
                    </div>
                    <Badge variant={isScorer ? "default" : "secondary"} className="shrink-0">
                      {isScorer ? "Scorer" : "Observer"}
                    </Badge>
                  </div>
                  <Button asChild size="lg" className={pagePrimaryButtonClassName}>
                    <Link href={`/rounds/${round.id}`}>Continue round</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <HomeInvites currentUserId={userId} invites={data.invites} />

      {data.activeRounds.length === 0 ? (
        <NearYouStart courses={nearYouCourses} />
      ) : null}

      <HomeGetStarted
        hasJoinedRound={data.hasJoinedRound}
        profileOnboardingComplete={data.profileOnboardingComplete}
      />

      <HomeRecentRounds rounds={data.recentRounds} />
    </>
  );
}
