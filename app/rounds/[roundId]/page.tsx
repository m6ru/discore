import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { RoundSession } from "./round-session";

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
      "id, join_code, status, started_at, scorer_id, layout_id, layouts(name, total_par, total_distance_m, courses(name))"
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

  if (round.scorer_id !== user.id) {
    redirect("/?message=Only+the+scorer+can+manage+this+round");
  }

  const { data: participants, error: participantsError } = await supabase
    .from("round_participants")
    .select("id, user_id, guest_name, joined_at")
    .eq("round_id", round.id)
    .order("joined_at", { ascending: true });

  const layoutRow = Array.isArray(round.layouts) ? round.layouts[0] : round.layouts;
  const courseRow = Array.isArray(layoutRow?.courses) ? layoutRow?.courses[0] : layoutRow?.courses;
  const { count: holesCount } = await supabase
    .from("holes")
    .select("*", { count: "exact", head: true })
    .eq("layout_id", round.layout_id);
  const safeParticipants = participants ?? [];
  const hasScorerParticipant = safeParticipants.some((participant) => participant.user_id === user.id);
  const participantsForUi = hasScorerParticipant
    ? safeParticipants
    : [
        {
          id: "scorer-self",
          user_id: user.id,
          guest_name: null,
          joined_at: round.started_at,
        },
        ...safeParticipants,
      ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">
          {round.status === "draft" ? "Round setup" : "Active round"}
        </h1>
        <p className="text-sm text-zinc-700">{courseRow?.name ?? "Unknown course"}</p>
        <p className="text-sm text-zinc-700">{layoutRow?.name ?? "Unknown layout"}</p>
        <p className="text-sm text-zinc-600">
          Holes <span className="font-medium">{holesCount ?? "?"}</span> - Par{" "}
          <span className="font-medium">{layoutRow?.total_par ?? "?"}</span>
        </p>
        <p className="text-sm text-zinc-600">
          Join code <span className="font-medium">{round.join_code}</span> - Status{" "}
          <span className="font-medium">{round.status}</span>
        </p>
      </header>

      {participantsError ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load participants: {participantsError.message}
        </p>
      ) : (
        <RoundSession
          roundId={round.id}
          roundStatus={round.status}
          joinCode={round.join_code}
          currentUserId={user.id}
          scorerDisplayName={user.email ?? user.id}
          initialParticipants={participantsForUi}
        />
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/" className="underline text-zinc-600">
          Back home
        </Link>
        <Link href="/rounds/new" className="underline text-zinc-600">
          New round
        </Link>
      </div>
    </main>
  );
}
