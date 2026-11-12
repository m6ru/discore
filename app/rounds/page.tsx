import Link from "next/link";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { loadPlayerStats } from "@/lib/rounds/load-player-stats";
import { PAST_ROUND_STATUSES, type RoundStatus } from "@/lib/rounds/round-status";
import { formatVsPar } from "@/lib/scoring/stats";
import { createServerClient } from "@/lib/supabase/server";
import { ChevronRight } from "lucide-react";
import { homeRowMetaClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { cn } from "@/lib/utils";
import { HistoryViewedMarker } from "./history-viewed-marker";

type HistoryRound = {
  id: string;
  status: RoundStatus;
  courseName: string;
  layoutName: string;
  playedAt: string | null;
  playerCount: number;
  totalStrokes: number | null;
  vsPar: number | null;
  thru: number;
  layoutHoleCount: number;
};

export default async function RoundsHistoryPage() {
  const supabase = await createServerClient();
  // getClaims() verifies the JWT locally when possible; proxy.ts handles refresh.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/auth?message=Please+sign+in+to+view+round+history");
  }

  const [{ rounds, error }, { stats, error: statsError }] = await Promise.all([
    loadHistoryRounds(supabase),
    loadPlayerStats(supabase),
  ]);

  const loadError = error ?? statsError;

  const months = groupByMonth(rounds);
  const bestDate = stats.bestRound ? formatShortDate(stats.bestRound.completedAt) : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pt-2 pb-4 sm:p-8">
      <HistoryViewedMarker />
      <h1 className={pageTitleClassName}>History</h1>

      {loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load history: {loadError}
        </p>
      ) : null}

      {!loadError && (stats.bestRound || stats.aceTotal > 0) ? (
        <section className="grid grid-cols-2 gap-2.5">
          {stats.bestRound && stats.bestVsPar !== null ? (
            <Link href={`/rounds/${stats.bestRound.id}`} className={boxClassName}>
              <span className={boxLabelClassName}>Best round</span>
              <span className={boxValueClassName}>{formatVsPar(stats.bestVsPar)}</span>
              <span className="truncate text-[13px] text-muted-foreground">
                {[stats.bestRound.courseName, bestDate].filter(Boolean).join(" · ")}
              </span>
            </Link>
          ) : null}
          {stats.aceTotal > 0 ? (
            <Link href="/rounds/aces" className={boxClassName}>
              <span className={boxLabelClassName}>Aces</span>
              <span className={boxValueClassName}>{stats.aceTotal}</span>
              <span className="flex items-center gap-0.5 text-[13px] font-semibold text-primary">
                Ace log
                <ChevronRight className="size-3.5" aria-hidden />
              </span>
            </Link>
          ) : null}
        </section>
      ) : null}

      {!loadError && rounds.length === 0 ? (
        <p className={homeRowMetaClassName}>
          No rounds yet. Use the Play tab to pick a course and start your first round.
        </p>
      ) : null}

      {months.map((month) => (
        <section key={month.key}>
          <div className="flex items-baseline justify-between gap-3 border-b border-foreground pb-1.5">
            <h2 className="font-display text-lg font-semibold">{month.label}</h2>
            <span className="text-[13px] text-muted-foreground">
              <span className="font-mono font-semibold text-foreground">{month.rounds.length}</span>{" "}
              {month.rounds.length === 1 ? "round" : "rounds"}
            </span>
          </div>
          <ul>
            {month.rounds.map((round) => {
              const hasScore =
                round.status === "completed" &&
                round.totalStrokes !== null &&
                round.vsPar !== null;

              return (
                <li key={round.id}>
                  <Link
                    href={`/rounds/${round.id}`}
                    className="flex items-center gap-3 border-b py-[11px] transition-colors hover:bg-accent/50"
                  >
                    <span className="w-[42px] shrink-0 font-mono text-[13px] text-muted-foreground">
                      {formatShortDate(round.playedAt)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold">{round.courseName}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        {round.layoutName} · {formatPlayers(round.playerCount)}
                      </span>
                    </span>
                    {round.status === "abandoned" ? (
                      <span className="shrink-0 text-[13px] text-muted-foreground">Abandoned</span>
                    ) : hasScore ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-sm px-1.5 py-px font-mono text-base font-semibold tabular-nums",
                          round.vsPar! < 0 && "bg-good text-good-foreground"
                        )}
                      >
                        {formatVsPar(round.vsPar!)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}

const boxClassName =
  "flex min-w-0 flex-col gap-1 rounded-md border bg-secondary px-3.5 py-3 transition-colors hover:bg-accent";
const boxLabelClassName = "text-[13px] font-semibold text-muted-foreground";
const boxValueClassName = "font-display text-[28px] font-semibold leading-none tabular-nums";

/** "19.10": the month heading already says which month. */
function formatShortDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatPlayers(count: number): string {
  return count <= 1 ? "solo" : `${count} players`;
}

/** Rounds arrive newest first; keep that order inside each month. */
function groupByMonth(rounds: HistoryRound[]) {
  const months: { key: string; label: string; rounds: HistoryRound[] }[] = [];
  for (const round of rounds) {
    const d = round.playedAt ? new Date(round.playedAt) : null;
    const key = d ? `${d.getFullYear()}-${d.getMonth()}` : "undated";
    let month = months.at(-1);
    if (!month || month.key !== key) {
      month = {
        key,
        label: d ? d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "Undated",
        rounds: [],
      };
      months.push(month);
    }
    month.rounds.push(round);
  }
  return months;
}

type Client = SupabaseClient<Database>;

async function loadHistoryRounds(
  supabase: Client
): Promise<{ rounds: HistoryRound[]; error: string | null }> {
  const { data, error } = await supabase
    .from("player_round_stats")
    .select(
      "round_id, status, started_at, completed_at, course_name, layout_name, layout_hole_count, total_strokes, vs_par, holes_scored, round_participants(count)"
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
    playedAt: row.completed_at ?? row.started_at,
    // "3 players" / "solo": members can count their rounds' participants (RLS).
    playerCount: row.round_participants[0]?.count ?? 1,
    totalStrokes: row.total_strokes,
    vsPar: row.vs_par,
    thru: row.holes_scored ?? 0,
    layoutHoleCount: row.layout_hole_count ?? 0,
  }));

  return { rounds, error: null };
}
