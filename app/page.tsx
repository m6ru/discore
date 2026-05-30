import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { HomeInvites, type InviteWithContext } from "./home-invites";
import { HomeCourseSearch } from "./home-course-search";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [activeRoundsResult, invitesResult, coursesResult] = user
    ? await Promise.all([
        supabase
          .from("rounds")
          .select(
            "id, scorer_id, started_at, layouts(name, courses(name)), round_participants!inner(user_id)"
          )
          .eq("round_participants.user_id", user.id)
          .eq("status", "active")
          .order("started_at", { ascending: false, nullsFirst: false }),
        supabase
          .from("round_invitations")
          .select(
            "id, round_id, created_at, rounds!inner(id, started_at, scorer_id, layouts(name, courses(name)), scorer:profiles!rounds_scorer_id_fkey(display_name))"
          )
          .eq("invited_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        loadCourseSummaries(supabase),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
        { courses: [], error: null },
      ];

  const activeRounds = activeRoundsResult.data ?? [];
  const rawInvites = invitesResult.data ?? [];
  const hubCourses = coursesResult.courses ?? [];

  const invites: InviteWithContext[] = rawInvites.map((row) => {
    const round = pickOne(row.rounds);
    const layout = pickOne(round?.layouts);
    const course = pickOne(layout?.courses);
    const scorer = pickOne(round?.scorer);
    return {
      id: row.id,
      round_id: row.round_id,
      created_at: row.created_at,
      course_name: course?.name ?? null,
      layout_name: layout?.name ?? null,
      inviter_display_name: scorer?.display_name ?? null,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Discore</h1>
          <p className="text-sm text-muted-foreground">
            {user
              ? "Start a round or continue where you left off."
              : "Sign in to save rounds and play with friends."}
          </p>
        </div>
        {user ? (
          <Button asChild size="lg" className="min-h-11 w-full">
            <Link href="/courses">Start round</Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="min-h-11 w-full">
            <Link href="/auth">Sign in</Link>
          </Button>
        )}
      </header>

      {!user ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Create an account to track rounds, accept invites, and see your history.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {user && hubCourses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Find a course</CardTitle>
            <CardDescription>Search by course name or location.</CardDescription>
          </CardHeader>
          <CardContent>
            <HomeCourseSearch courses={hubCourses} hideLabel />
          </CardContent>
        </Card>
      ) : null}

      {user && activeRounds.length > 0
        ? activeRounds.map((round) => {
            const layout = pickOne(round.layouts);
            const course = pickOne(layout?.courses);
            const isScorer = round.scorer_id === user.id;
            return (
              <Card key={round.id} className="border-primary/30 bg-primary/5 py-4 shadow-none">
                <CardHeader className="gap-1">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">Resume your round</CardTitle>
                    <Badge variant={isScorer ? "default" : "secondary"}>
                      {isScorer ? "Scorer" : "Observer"}
                    </Badge>
                  </div>
                  <CardDescription>
                    {course?.name ?? "Unknown course"} · {layout?.name ?? "Unknown layout"}
                    {" · "}started {formatDateTime(round.started_at)}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-0">
                  <Button asChild size="lg" className="min-h-11 w-full">
                    <Link href={`/rounds/${round.id}`}>Continue round</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })
        : null}

      {user ? <HomeInvites currentUserId={user.id} invites={invites} /> : null}
    </main>
  );
}
