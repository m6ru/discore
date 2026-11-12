import Link from "next/link";
import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { loadCourseSummaries } from "@/lib/courses/load-course-summaries";
import { holeScoreTone, type HoleScoreTone } from "@/lib/scoring/scorecard-display";
import { formatVsPar } from "@/lib/scoring/stats";
import { pagePrimaryButtonClassName } from "@/lib/ui/page-chrome";
import { cn } from "@/lib/utils";
import { NearYouStart } from "@/components/home/near-you-start";
import { ContinueTrialCard } from "@/components/home/continue-trial-card";
import { Button } from "@/components/ui/button";

/** A made-up round: the card is a picture of the app, not data. */
const EXAMPLE_PAR = [3, 4, 3, 3, 5, 3, 4, 3, 4];
const EXAMPLE_PLAYERS = [
  { name: "You", scores: [3, 3, 3, 3, 3, 1, 4, 4, 4] },
  { name: "Bob", scores: [4, 4, 2, 3, 5, 3, 6, 3, 3] },
];

const STEPS = [
  { title: "Pick a course", text: "Choose a layout and add the players." },
  { title: "Score your round", text: "One person keeps the score. Everyone else can observe live." },
  { title: "See your progress", text: "All your rounds in one place, with stats on how you play." },
];

function exampleToneClass(tone: HoleScoreTone): string {
  switch (tone) {
    case "ace":
      return "bg-ace";
    case "eagle":
      return "bg-eagle";
    case "birdie":
      return "bg-good";
    case "bogey":
      return "bg-over";
    case "doubleBogey":
      return "bg-over-strong";
    default:
      return "";
  }
}

const exampleGridClassName =
  "grid grid-cols-[2.5rem_repeat(9,minmax(0,1.5rem))_1fr] items-center gap-[3px]";

function ExampleRound() {
  return (
    <section
      aria-label="Example round"
      className="space-y-3 rounded-md border bg-background p-4"
    >
      <h2 className="text-[13px] font-bold">Example round</h2>
      <p className="sr-only">
        You score an ace on hole 6 and finish 4 under par. Bob finishes 1 over.
      </p>
      <div className="space-y-1 font-mono text-xs tabular-nums" aria-hidden>
        <div className={exampleGridClassName}>
          <span />
          {EXAMPLE_PAR.map((_, index) => (
            <span key={index} className="text-center text-[11px] text-muted-foreground">
              {index + 1}
            </span>
          ))}
        </div>
        {EXAMPLE_PLAYERS.map((player) => {
          const vsPar = player.scores.reduce((sum, strokes, i) => sum + strokes - EXAMPLE_PAR[i], 0);
          return (
            <div key={player.name} className={exampleGridClassName}>
              <span className="font-sans text-[13px] font-bold">{player.name}</span>
              {player.scores.map((strokes, index) => (
                <span
                  key={index}
                  className={cn(
                    "flex h-[26px] items-center justify-center rounded-sm",
                    exampleToneClass(holeScoreTone(strokes, EXAMPLE_PAR[index]))
                  )}
                >
                  {strokes}
                </span>
              ))}
              <span className="text-right">{formatVsPar(vsPar)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

async function LandingStart() {
  const supabase = await createServerClient();
  // On a failed load the start button still leads to the course list, which shows the error.
  const { courses } = await loadCourseSummaries(supabase);

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
    <ContinueTrialCard
      fallback={
        <div className="space-y-2.5">
          <NearYouStart courses={nearYouCourses} fallback="button" />
          <p className="text-center text-sm text-muted-foreground">No account needed.</p>
        </div>
      }
    />
  );
}

/** Signed-out `/`: what discore is, an example card, and a way to start without an account. */
export function LandingPage() {
  return (
    <>
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-3xl px-4 pb-[92px] sm:px-8">
          <header className="flex min-h-11 items-center justify-between gap-3">
            <p className="font-display text-xl font-bold tracking-tight">discore</p>
            <Link href="/auth" className="flex min-h-11 items-center text-[15px] font-bold">
              Sign in
            </Link>
          </header>
          <div className="space-y-4 pt-2">
            <h1 className="font-display text-[44px] font-bold leading-[1.04] tracking-tight">
              Score your round. Sign up later.
            </h1>
            <p className="text-[17px] leading-normal text-primary-foreground/80">
              A disc golf scorecard for you and your friends, 180+ courses.
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto -mt-[68px] flex w-full max-w-3xl flex-1 flex-col px-4 pb-8 sm:px-8">
        <ExampleRound />

        <div className="pt-5 pb-9">
          <Suspense fallback={<div className="h-12 animate-pulse rounded-md bg-muted" />}>
            <LandingStart />
          </Suspense>
        </div>

        <section className="space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight">How it works</h2>
          <ol>
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-2 border-b py-4 last:border-b-0">
                <span className="w-6 shrink-0 pt-0.5 font-mono text-[13px] text-muted-foreground">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-bold">{step.title}</h3>
                  <p className="text-[15px] leading-normal text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Button
          asChild
          variant="outline"
          size="lg"
          className={cn(pagePrimaryButtonClassName, "mt-8 border-[1.5px] border-primary text-primary")}
        >
          <Link href="/courses">Browse courses</Link>
        </Button>
      </main>
    </>
  );
}
