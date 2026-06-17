import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { loadHomeData } from "@/lib/home/load-home-data";
import {
  homeRowMetaClassName,
  homeRowTitleClassName,
} from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { HomeInvites } from "./home-invites";
import { HomeRecentRounds } from "./home-recent-rounds";
import { HomeGetStarted } from "./home-get-started";
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
  const data = await loadHomeData(supabase, userId);

  return (
    <>
      {data.activeRounds.length > 0 ? (
        <section className="space-y-2">
          <h2 className={sectionHeadingClassName}>Continue round</h2>
          <ul>
            {data.activeRounds.map((round) => {
              const isScorer = round.scorer_id === userId;

              return (
                <li key={round.id} className="space-y-3 py-2">
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
                  <Button asChild size="lg" className="min-h-11 w-full">
                    <Link href={`/rounds/${round.id}`}>Continue round</Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <HomeInvites currentUserId={userId} invites={data.invites} />

      <HomeGetStarted
        hasJoinedRound={data.hasJoinedRound}
        profileOnboardingComplete={data.profileOnboardingComplete}
      />

      <HomeRecentRounds rounds={data.recentRounds} />
    </>
  );
}
