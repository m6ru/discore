import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import {
  formatStatusLabel,
  statusBadgeVariant,
} from "@/lib/rounds/format-round-status";
import { normalizeInviteRows } from "@/lib/rounds/invite-rows";
import { isRoundStatus, type RoundStatus } from "@/lib/rounds/round-status";
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
      "id, status, started_at, scorer_id, layout_id, layouts(name, total_par, total_distance_m, courses(name))"
    )
    .eq("id", roundId)
    .maybeSingle();

  if (roundError) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
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

  // All five reads below are independent given `round.id` / `round.layout_id` /
  // `round.scorer_id`, so they fan out in parallel.
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
      .select("id, hole_number, par")
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
  ]);

  const layoutRow = pickOne(round.layouts);
  const courseRow = pickOne(layoutRow?.courses);
  const safeParticipants = participants ?? [];
  const isScorer = round.scorer_id === user.id;
  const isRoundParticipant = safeParticipants.some(
    (participant) => participant.user_id === user.id,
  );

  if (!isScorer && !isRoundParticipant) {
    redirect("/?message=You+must+be+a+round+participant+to+view+this+round");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {courseRow?.name ?? "Unknown course"}
            <span className="font-normal text-muted-foreground"> · </span>
            {layoutRow?.name ?? "Unknown layout"}
          </h1>
          <Badge variant={statusBadgeVariant(round.status)} className="shrink-0">
            {formatStatusLabel(round.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {holes?.length ?? "?"} holes · Par {layoutRow?.total_par ?? "?"}
        </p>
      </header>

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
          roundStatus={roundStatus}
          scorerUserId={round.scorer_id}
          isScorer={isScorer}
          currentUserId={user.id}
          scorerDisplayName={scorerProfile?.display_name ?? "Scorer"}
          initialParticipants={safeParticipants}
          initialInvites={normalizeInviteRows(invites ?? [])}
          holes={(holes ?? []) as HoleRow[]}
          initialHoleScores={(existingScores ?? []) as HoleScoreRow[]}
        />
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/" className="text-muted-foreground underline underline-offset-4">
          Back home
        </Link>
        <Link href="/courses" className="text-muted-foreground underline underline-offset-4">
          Browse courses
        </Link>
      </div>
    </main>
  );
}
