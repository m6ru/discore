import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { HomeInvites, type InviteWithContext } from "./home-invites";

type CourseRef = { name: string | null } | { name: string | null }[] | null;
type LayoutRef =
  | { name: string | null; courses: CourseRef }
  | { name: string | null; courses: CourseRef }[]
  | null;
type ScorerRef =
  | { display_name: string | null }
  | { display_name: string | null }[]
  | null;

type ActiveRoundRow = {
  id: string;
  scorer_id: string;
  started_at: string | null;
  layouts: LayoutRef;
};

type RawInviteRow = {
  id: string;
  round_id: string;
  created_at: string;
  rounds:
    | {
        id: string;
        started_at: string | null;
        scorer_id: string;
        layouts: LayoutRef;
        scorer: ScorerRef;
      }
    | {
        id: string;
        started_at: string | null;
        scorer_id: string;
        layouts: LayoutRef;
        scorer: ScorerRef;
      }[]
    | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

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

  const [activeRoundsResult, invitesResult] = user
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
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
      ];

  const activeRounds = (activeRoundsResult.data ?? []) as unknown as ActiveRoundRow[];
  const rawInvites = (invitesResult.data ?? []) as unknown as RawInviteRow[];

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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Discore</h1>
        <p className="text-sm text-zinc-600">Start a round or continue where you left off.</p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4">
        <p className="font-medium">{user ? "Signed in" : "Signed out"}</p>
        {user ? (
          <p className="mt-1 break-all text-sm text-zinc-600">{user.email}</p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            Sign in to save true-history rounds. Guest round flow comes next.
          </p>
        )}
      </section>

      {user && activeRounds.length > 0 ? (
        <section className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
          <h2 className="text-lg font-semibold text-emerald-900">Resume your round</h2>
          <ul className="space-y-2">
            {activeRounds.map((round) => {
              const layout = pickOne(round.layouts);
              const course = pickOne(layout?.courses);
              const isScorer = round.scorer_id === user.id;
              return (
                <li key={round.id}>
                  <Link
                    href={`/rounds/${round.id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-white p-3 transition hover:bg-emerald-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {course?.name ?? "Unknown course"}
                      </p>
                      <p className="truncate text-xs text-zinc-600">
                        {layout?.name ?? "Unknown layout"} · started{" "}
                        {formatDateTime(round.started_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                      {isScorer ? "Scorer" : "Observer"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {user ? <HomeInvites currentUserId={user.id} invites={invites} /> : null}

      <nav className="flex flex-wrap gap-3" aria-label="Primary actions">
        <Link
          href="/rounds/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Start round
        </Link>
        {user ? (
          <Link
            href="/rounds"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium"
          >
            Round history
          </Link>
        ) : null}
        <Link
          href="/auth"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          {user ? "Account" : "Sign in"}
        </Link>
      </nav>
    </main>
  );
}
