import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import {
  formatStatusLabel,
} from "@/lib/rounds/format-round-status";
import { INVITE_SELECT, normalizeInviteRows } from "@/lib/rounds/invite-rows";
import { normalizeParticipantRows, PARTICIPANT_SELECT } from "@/lib/rounds/round-rows";
import { formatRoundDisplayName } from "@/lib/rounds/round-display-name";
import {
  isFinishedRoundStatus,
  isRoundStatus,
  type RoundStatus,
} from "@/lib/rounds/round-status";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { ROUND_HEADER_ACTIONS_ID, ROUND_HEADER_TITLE_ID } from "./components/round-header-actions-slot";
import { RoundSession } from "./round-session";
import type { HoleRow, HoleScoreRow } from "./round-types";

type RoundPageProps = {
  params: Promise<{ roundId: string }>;
};

export default async function RoundPage({ params }: RoundPageProps) {
  const { roundId } = await params;

  const supabase = await createServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    redirect("/auth?message=Please+sign+in+to+continue");
  }

  // One request: the round with everything the screen needs. RLS applies to
  // each embedded table, so observers get the same rows as separate queries.
  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select(
      `id, name, status, started_at, completed_at, scorer_id, layout_id, starting_hole,
      layouts(name, slug, total_par, total_distance_m, courses(name, slug), holes(id, hole_number, par, distance_m, notes)),
      scorer:profiles!rounds_scorer_id_fkey(display_name),
      round_participants!round_participants_round_id_fkey(${PARTICIPANT_SELECT}),
      round_invitations(${INVITE_SELECT}),
      hole_scores!hole_scores_round_id_fkey(id, participant_id, hole_id, strokes, ob, fairway_hit, par)`
    )
    .eq("id", roundId)
    .order("joined_at", { referencedTable: "round_participants", ascending: true })
    .order("created_at", { referencedTable: "round_invitations", ascending: true })
    .order("hole_number", { referencedTable: "layouts.holes", ascending: true })
    .maybeSingle();

  if (roundError) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-2 pb-4 sm:p-8">
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load round: {roundError.message}
        </p>
      </main>
    );
  }

  if (!round) {
    notFound();
  }

  const roundStatus: RoundStatus = isRoundStatus(round.status) ? round.status : "draft";
  const participants = normalizeParticipantRows(round.round_participants);
  const invites = round.round_invitations;
  const existingScores = round.hole_scores;
  const scorerProfile = pickOne(round.scorer);

  const layoutRow = pickOne(round.layouts);
  const courseRow = pickOne(layoutRow?.courses);
  const holes = layoutRow?.holes ?? [];
  const finishedDateLabel = isFinishedRoundStatus(roundStatus)
    ? formatRoundDisplayDate(round.completed_at, round.started_at)
    : null;
  // Scores keep the par they were played at; a later par correction in the
  // course data must not change how a finished scorecard reads.
  const playedPar = new Map(existingScores.map((score) => [score.hole_id, score.par]));
  const displayHoles = holes.map((hole) => ({
    ...hole,
    par: playedPar.get(hole.id) ?? hole.par,
  }));
  const isScorer = round.scorer_id === userId;
  const isRoundParticipant = participants.some(
    (participant) => participant.user_id === userId,
  );

  if (!isScorer && !isRoundParticipant) {
    redirect("/?message=You+must+be+a+round+participant+to+view+this+round");
  }

  // Scoring screen: a slim "Course · Layout" line with ⋯; no back arrow, so
  // leaving a round always goes through the round sheet.
  const isScoringHeader = roundStatus === "active" && isScorer;
  // Draft setup: the same slim line (with ✕), then the editable round name.
  const isDraftSetupHeader = roundStatus === "draft" && isScorer;
  const isFinished = isFinishedRoundStatus(roundStatus);
  const courseLine = (
    <>
      {courseRow?.name ?? "Unknown course"}{" "}
      <span className="font-medium text-muted-foreground">· {layoutRow?.name ?? "Unknown layout"}</span>
    </>
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-2 pb-4 sm:p-8">
      {isScoringHeader || isDraftSetupHeader ? (
        <header className={isScoringHeader ? "-mr-2 -mb-3" : "-mr-2 space-y-1"}>
          <div className="flex items-center gap-2">
            {/* Course on one line, layout under it: long names never squeeze each other. */}
            <p className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{courseRow?.name ?? "Unknown course"}</span>
              <span className="truncate text-[13px] text-muted-foreground">{layoutRow?.name ?? "Unknown layout"}</span>
            </p>
            <div id={ROUND_HEADER_ACTIONS_ID} />
          </div>
          {isDraftSetupHeader ? <div id={ROUND_HEADER_TITLE_ID} className="min-w-0 pr-2" /> : null}
        </header>
      ) : isFinished ? (
        <header className="space-y-1">
          <p className="truncate text-sm font-semibold">{courseLine}</p>
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight">
            {formatRoundDisplayName(round.name)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[
              finishedDateLabel,
              formatStatusLabel(round.status),
              `${participants.length} ${participants.length === 1 ? "player" : "players"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>
      ) : (
        <header className="space-y-1">
          <p className="truncate text-sm font-semibold">{courseLine}</p>
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight">
            {formatRoundDisplayName(round.name)}
          </h1>
        </header>
      )}

      <RoundSession
        key={round.id}
        roundId={round.id}
        roundName={round.name}
        startingHole={round.starting_hole}
        roundStatus={roundStatus}
        scorerUserId={round.scorer_id}
        isScorer={isScorer}
        currentUserId={userId}
        scorerDisplayName={scorerProfile?.display_name ?? "Scorer"}
        courseName={courseRow?.name ?? "Unknown course"}
        courseSlug={courseRow?.slug ?? null}
        layoutId={round.layout_id}
        layoutName={layoutRow?.name ?? "Unknown layout"}
        layoutSlug={layoutRow?.slug ?? null}
        layoutTotalPar={layoutRow?.total_par ?? 0}
        initialParticipants={participants}
        initialInvites={normalizeInviteRows(invites)}
        holes={displayHoles as HoleRow[]}
        initialHoleScores={existingScores as HoleScoreRow[]}
      />
    </main>
  );
}
