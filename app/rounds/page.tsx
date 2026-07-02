import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { loadRoundScoreSummaries } from "@/lib/rounds/round-score-summary";
import { PAST_ROUND_STATUSES, type RoundStatus } from "@/lib/rounds/round-status";
import { formatVsPar } from "@/lib/scoring/stats";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import { homeRowMetaClassName, pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { HistoryViewedMarker } from "./history-viewed-marker";

type HistoryRound = {
  id: string;
  status: RoundStatus;
  courseName: string;
  layoutName: string;
  dateLabel: string;
  totalStrokes: number | null;
  vsPar: number | null;
  thru: number;
  layoutHoleCount: number;
};

export default async function RoundsHistoryPage() {
  const supabase = await createServerClient();
  // getClaims() verifies the JWT locally when possible; middleware handles refresh.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/auth?message=Please+sign+in+to+view+round+history");
  }

  const { rounds, error } = await loadHistoryRounds(supabase, data.claims.sub);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <HistoryViewedMarker />
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>History</h1>
        <p className={pageSubtitleClassName}>Your rounds — stats coming later.</p>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load rounds: {error}
        </p>
      ) : null}

      {!error && rounds.length === 0 ? (
        <p className={homeRowMetaClassName}>
          No rounds yet. Use the Play tab to pick a course and start your first round.
        </p>
      ) : null}

      {rounds.length > 0 ? (
        <ul className="space-y-2">
          {rounds.map((round) => {
            const metaParts = [round.layoutName, round.dateLabel];
            const hasScore =
              round.status === "completed" &&
              round.totalStrokes !== null &&
              round.vsPar !== null;

            return (
              <li key={round.id}>
                <Link
                  href={`/rounds/${round.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{round.courseName}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {metaParts.join(" · ")}
                    </p>
                  </div>
                  {round.status === "abandoned" ? (
                    <span className="shrink-0 text-sm text-muted-foreground">Abandoned</span>
                  ) : hasScore ? (
                    <span className="shrink-0 font-mono text-base font-semibold tabular-nums text-foreground">
                      {formatVsPar(round.vsPar!)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}

type Client = SupabaseClient<Database>;

function holeCountFromRelation(holes: { count: number }[] | null | undefined): number {
  return holes?.[0]?.count ?? 0;
}

async function loadHistoryRounds(
  supabase: Client,
  userId: string
): Promise<{ rounds: HistoryRound[]; error: string | null }> {
  const { data: roundRows, error: roundsError } = await supabase
    .from("rounds")
    .select(
      "id, status, started_at, completed_at, layout_id, layouts(name, courses(name), holes(count)), round_participants!inner(user_id)"
    )
    .eq("round_participants.user_id", userId)
    .in("status", [...PAST_ROUND_STATUSES])
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (roundsError) {
    return { rounds: [], error: roundsError.message };
  }

  const rows = roundRows ?? [];
  if (rows.length === 0) {
    return { rounds: [], error: null };
  }

  const { summaries, error: summaryError } = await loadRoundScoreSummaries(
    supabase,
    userId,
    rows.map((row) => ({ id: row.id, layoutId: row.layout_id }))
  );
  if (summaryError) {
    return { rounds: [], error: summaryError };
  }

  const rounds: HistoryRound[] = rows.map((row) => {
    const layout = pickOne(row.layouts);
    const course = pickOne(layout?.courses);
    const stats = summaries.get(row.id);
    const thru = stats?.thru ?? 0;
    const hasScore = thru > 0;

    return {
      id: row.id,
      status: row.status as RoundStatus,
      courseName: course?.name ?? "Unknown course",
      layoutName: layout?.name ?? "Unknown layout",
      dateLabel: formatRoundDisplayDate(row.completed_at, row.started_at) ?? "—",
      totalStrokes: hasScore ? stats!.totalStrokes : null,
      vsPar: hasScore ? stats!.vsPar : null,
      thru,
      layoutHoleCount: holeCountFromRelation(layout?.holes),
    };
  });

  return { rounds, error: null };
}
