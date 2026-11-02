import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import {
  formatStatusLabel,
} from "@/lib/rounds/format-round-status";
import { normalizeInviteRows } from "@/lib/rounds/invite-rows";
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

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select(
      "id, name, status, started_at, completed_at, scorer_id, layout_id, starting_hole, layouts(name, slug, total_par, total_distance_m, courses(name, slug))"
    )
    .eq("id", roundId)
    .maybeSingle();

  if (roundError) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
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

  // Independent reads given `round.id` / `round.layout_id` / `round.scorer_id`.
  const [
    { data: participants, error: participantsError },
    { data: invites, error: invitesError },
    { data: holes, error: holesError },
    { data: existingScores, error: existingScoresError },
    { data: scorerProfile },
  ] = await Promise.all([
    supabase
      .from("round_participants")
      .select("id, user_id, guest_name, joined_at")
      .eq("round_id", round.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("round_invitations")
      .select(
        "id, invited_user_id, status, created_at, profiles!round_invitations_invited_user_id_fkey(display_name)"
      )
      .eq("round_id", round.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("holes")
      .select("id, hole_number, par, distance_m, notes")
      .eq("layout_id", round.layout_id)
      .order("hole_number", { ascending: true }),
    supabase
      .from("hole_scores")
      .select("id, participant_id, hole_id, strokes, ob, fairway_hit, par")
      .eq("round_id", round.id),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", round.scorer_id)
      .maybeSingle(),
  ]);

  const layoutRow = pickOne(round.layouts);
  const courseRow = pickOne(layoutRow?.courses);
  const finishedDateLabel = isFinishedRoundStatus(roundStatus)
    ? formatRoundDisplayDate(round.completed_at, round.started_at)
    : null;
  const safeParticipants = participants ?? [];
  // Scores keep the par they were played at; a later par correction in the
  // course data must not change how a finished scorecard reads.
  const playedPar = new Map((existingScores ?? []).map((score) => [score.hole_id, score.par]));
  const displayHoles = (holes ?? []).map((hole) => ({
    ...hole,
    par: playedPar.get(hole.id) ?? hole.par,
  }));
  const isScorer = round.scorer_id === userId;
  const isRoundParticipant = safeParticipants.some(
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      {isScoringHeader || isDraftSetupHeader ? (
        <header className={isScoringHeader ? "-mr-2 -mb-3" : "-mr-2 space-y-1"}>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {courseLine}
              {isDraftSetupHeader ? (
                <span className="font-medium text-muted-foreground"> · setting up</span>
              ) : null}
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
              `${safeParticipants.length} ${safeParticipants.length === 1 ? "player" : "players"}`,
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

      {participantsError ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load participants: {participantsError.message}
        </p>
      ) : invitesError ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load invitations: {invitesError.message}
        </p>
      ) : holesError ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load holes: {holesError.message}
        </p>
      ) : existingScoresError ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load scores: {existingScoresError.message}
        </p>
      ) : (
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
          initialParticipants={safeParticipants}
          initialInvites={normalizeInviteRows(invites ?? [])}
          holes={displayHoles as HoleRow[]}
          initialHoleScores={(existingScores ?? []) as HoleScoreRow[]}
        />
      )}
    </main>
  );
}
