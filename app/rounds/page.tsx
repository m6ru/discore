import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import { Badge } from "@/components/ui/badge";
import {
  formatStatusLabel,
  statusBadgeVariant,
} from "@/lib/rounds/format-round-status";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { PAST_ROUND_STATUSES } from "@/lib/rounds/round-status";
import {
  homeRowLinkClassName,
  homeRowMetaClassName,
  homeRowTitleClassName,
  pageSubtitleClassName,
  pageTitleClassName,
} from "@/lib/ui/page-chrome";
import { HistoryViewedMarker } from "./history-viewed-marker";

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
    .in("status", [...PAST_ROUND_STATUSES])
    .order("completed_at", { ascending: false, nullsFirst: false });

  const rounds = data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <HistoryViewedMarker />
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>History</h1>
        <p className={pageSubtitleClassName}>Your completed and abandoned rounds.</p>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load rounds: {error.message}
        </p>
      ) : null}

      {!error && rounds.length === 0 ? (
        <p className={homeRowMetaClassName}>
          No rounds yet. Use the Play tab to pick a course and start your first round.
        </p>
      ) : null}

      {rounds.length > 0 ? (
        <ul>
          {rounds.map((round) => {
            const layout = pickOne(round.layouts);
            const course = pickOne(layout?.courses);
            const dateLabel =
              formatRoundDisplayDate(round.completed_at, round.started_at) ?? "—";

            return (
              <li key={round.id}>
                <Link href={`/rounds/${round.id}`} className={homeRowLinkClassName}>
                  <div className="min-w-0">
                    <p className={`truncate ${homeRowTitleClassName}`}>
                      {course?.name ?? "Unknown course"}
                    </p>
                    <p className={`truncate ${homeRowMetaClassName}`}>
                      {layout?.name ?? "Unknown layout"} · {dateLabel}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(round.status)} className="shrink-0">
                    {formatStatusLabel(round.status)}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
