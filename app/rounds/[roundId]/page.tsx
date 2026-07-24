import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { FinishedRoundContextPanel } from "@/components/stats/finished-round-context";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import {
  formatStatusLabel,
  statusBadgeVariant,
} from "@/lib/rounds/format-round-status";
import { normalizeInviteRows } from "@/lib/rounds/invite-rows";
import { loadFinishedRoundContext } from "@/lib/rounds/load-player-stats";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
  const layoutRowEarly = pickOne(round.layouts);
  const courseRowEarly = pickOne(layoutRowEarly?.courses);
  const courseSlug = courseRowEarly?.slug ?? "";
  const layoutSlug = layoutRowEarly?.slug ?? "";

  // Independent reads given `round.id` / `round.layout_id` / `round.scorer_id`.
  const [
    { data: participants, error: participantsError },
    { data: invites, error: invitesError },
    { data: holes, error: holesError },
    { data: existingScores, error: existingScoresError },
    { data: scorerProfile },
    finishedContextResult,
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
      .select("id, participant_id, hole_id, strokes, ob, fairway_hit")
      .eq("round_id", round.id),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", round.scorer_id)
      .maybeSingle(),
    roundStatus === "completed" && courseSlug && layoutSlug
      ? loadFinishedRoundContext(supabase, {
          roundId: round.id,
          layoutId: round.layout_id,
          courseSlug,
          layoutSlug,
        })
      : Promise.resolve({ context: null, error: null }),
  ]);

  const layoutRow = layoutRowEarly;
  const courseRow = courseRowEarly;
  const finishedRoundContext = finishedContextResult.context;
  const finishedDateLabel = isFinishedRoundStatus(roundStatus)
    ? formatRoundDisplayDate(round.completed_at, round.started_at)
    : null;
  const safeParticipants = participants ?? [];
  const isScorer = round.scorer_id === user.id;
  const isRoundParticipant = safeParticipants.some(
    (participant) => participant.user_id === user.id,
  );

  if (!isScorer && !isRoundParticipant) {
    redirect("/?message=You+must+be+a+round+participant+to+view+this+round");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          {roundStatus === "draft" && isScorer ? (
            <div id={ROUND_HEADER_TITLE_ID} className="min-w-0 flex-1" />
          ) : (
            <h1 className="min-w-0 flex-1 text-xl font-bold tracking-tight sm:text-2xl">
              {formatRoundDisplayName(round.name)}
            </h1>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {isFinishedRoundStatus(roundStatus) ? (
              <Badge variant={statusBadgeVariant(round.status)}>
                {formatStatusLabel(round.status)}
              </Badge>
            ) : null}
            <div id={ROUND_HEADER_ACTIONS_ID} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {courseRow?.name ?? "Unknown course"}
          <span> · </span>
          {layoutRow?.name ?? "Unknown layout"}
        </p>
        {finishedDateLabel ? (
          <p className="text-sm text-muted-foreground">{finishedDateLabel}</p>
        ) : null}
      </header>

      {finishedRoundContext ? (
        <FinishedRoundContextPanel context={finishedRoundContext} />
      ) : null}

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
          currentUserId={user.id}
          scorerDisplayName={scorerProfile?.display_name ?? "Scorer"}
          courseName={courseRow?.name ?? "Unknown course"}
          courseSlug={courseRow?.slug ?? null}
          layoutName={layoutRow?.name ?? "Unknown layout"}
          layoutTotalPar={layoutRow?.total_par ?? 0}
          initialParticipants={safeParticipants}
          initialInvites={normalizeInviteRows(invites ?? [])}
          holes={(holes ?? []) as HoleRow[]}
          initialHoleScores={(existingScores ?? []) as HoleScoreRow[]}
        />
      )}
    </main>
  );
}
