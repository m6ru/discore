import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_BADGE: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  completed: "border-zinc-200 bg-zinc-50 text-zinc-700",
  abandoned: "border-amber-200 bg-amber-50 text-amber-800",
};

export default async function RoundsHistoryPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+view+round+history");
  }

  const { data, error } = await supabase
    .from("rounds")
    .select(
      "id, status, started_at, completed_at, layouts(name, courses(name)), round_participants!inner(user_id)"
    )
    .eq("round_participants.user_id", user.id)
    .in("status", ["active", "completed", "abandoned"])
    .order("started_at", { ascending: false, nullsFirst: false });

  const rounds = data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Rounds</h1>
        <p className="text-sm text-zinc-600">Your past and active rounds.</p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load rounds: {error.message}
        </p>
      ) : null}

      {!error && rounds.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No rounds yet. Start one from the home page.
        </p>
      ) : null}

      {rounds.length > 0 ? (
        <ul className="space-y-2">
          {rounds.map((round) => {
            const layout = pickOne(round.layouts);
            const course = pickOne(layout?.courses);
            const dateLabel = formatDate(
              round.completed_at ?? round.started_at
            );
            const badgeClass =
              STATUS_BADGE[round.status] ??
              "border-zinc-200 bg-zinc-50 text-zinc-700";
            return (
              <li key={round.id}>
                <Link
                  href={`/rounds/${round.id}`}
                  className="block rounded-md border border-zinc-200 p-3 transition hover:bg-zinc-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {course?.name ?? "Unknown course"}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {layout?.name ?? "Unknown layout"} · {dateLabel}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
                    >
                      {round.status}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

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
