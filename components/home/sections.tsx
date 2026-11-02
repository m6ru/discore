import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { loadHomeData } from "@/lib/home/load-home-data";
import { loadPlayerStats } from "@/lib/rounds/load-player-stats";
import { HomeStatsTeaser } from "@/components/home/stats-teaser";
import {
  homeFrameClassName,
  homeFrameLabelClassName,
  homeFrameTitleClassName,
  homeRowMetaClassName,
  pagePrimaryButtonClassName,
} from "@/lib/ui/page-chrome";
import { HomeInvites } from "@/components/home/invites";
import { SuggestionThanks } from "@/components/home/suggestion-thanks";
import { HomeRecentRounds } from "@/components/home/recent-rounds";
import { HomeGetStarted } from "@/components/home/get-started";
import { NearYouStart } from "@/components/home/near-you-start";
import { Button } from "@/components/ui/button";

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
  const [data, coursesResult, statsResult] = await Promise.all([
    loadHomeData(supabase, userId),
    loadCourseSummaries(supabase),
    loadPlayerStats(supabase),
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
      {data.activeRounds.length > 0 ? (
        <section className="space-y-2">
          <h2 className="sr-only">Continue round</h2>
          <ul className="space-y-2">
            {data.activeRounds.map((round) => {
              const isScorer = round.scorer_id === userId;

              return (
                <li key={round.id} className={homeFrameClassName}>
                  <p className={homeFrameLabelClassName}>
                    Round in progress
                    <span>{isScorer ? "you're scoring" : "watching"}</span>
                  </p>
                  <p className={homeFrameTitleClassName}>{round.course_name}</p>
                  <p className={homeRowMetaClassName}>
                    {round.layout_name} · started {formatDateTime(round.started_at)}
                  </p>
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

      <SuggestionThanks items={data.suggestionThanks} />

      {data.activeRounds.length === 0 ? (
        <NearYouStart courses={nearYouCourses} />
      ) : null}

      {!statsResult.error ? <HomeStatsTeaser stats={statsResult.stats} courseCount={coursesResult.courses?.length ?? 0} /> : null}

      <HomeGetStarted
        hasJoinedRound={data.hasJoinedRound}
        profileOnboardingComplete={data.profileOnboardingComplete}
      />

      <HomeRecentRounds rounds={data.recentRounds} />
    </>
  );
}
