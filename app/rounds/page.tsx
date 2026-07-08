import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { loadPlayerStats } from "@/lib/rounds/load-player-stats";
import { PAST_ROUND_STATUSES, type RoundStatus } from "@/lib/rounds/round-status";
import { formatVsPar } from "@/lib/scoring/stats";
import { createServerClient } from "@/lib/supabase/server";
import { homeRowMetaClassName, pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { HistoryStatsSection } from "./history-stats-section";
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

  const [{ rounds, error }, { stats, error: statsError }] = await Promise.all([
    loadHistoryRounds(supabase),
    loadPlayerStats(supabase),
  ]);

  const loadError = error ?? statsError;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <HistoryViewedMarker />
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>History</h1>
        <p className={pageSubtitleClassName}>Your rounds and personal stats.</p>
      </header>

      {loadError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load history: {loadError}
        </p>
      ) : null}

      {!loadError ? <HistoryStatsSection stats={stats} /> : null}

      {!loadError && rounds.length === 0 ? (
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

async function loadHistoryRounds(
  supabase: Client
): Promise<{ rounds: HistoryRound[]; error: string | null }> {
  const { data, error } = await supabase
    .from("player_round_stats")
    .select(
      "round_id, status, started_at, completed_at, course_name, layout_name, layout_hole_count, total_strokes, vs_par, holes_scored"
    )
    .in("status", [...PAST_ROUND_STATUSES])
    .order("completed_at", { ascending: false, nullsFirst: false });

  if (error) {
    return { rounds: [], error: error.message };
  }

  const rounds: HistoryRound[] = (data ?? []).map((row) => ({
    id: row.round_id!,
    status: (row.status ?? "completed") as RoundStatus,
    courseName: row.course_name ?? "Unknown course",
    layoutName: row.layout_name ?? "Unknown layout",
    dateLabel: formatRoundDisplayDate(row.completed_at, row.started_at) ?? "—",
    totalStrokes: row.total_strokes,
    vsPar: row.vs_par,
    thru: row.holes_scored ?? 0,
    layoutHoleCount: row.layout_hole_count ?? 0,
  }));

  return { rounds, error: null };
}
