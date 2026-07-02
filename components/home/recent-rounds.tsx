import Link from "next/link";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { formatVsPar } from "@/lib/scoring/stats";
import type { HomeRecentRound } from "@/lib/home/types";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

export type { HomeRecentRound };

type Props = {
  rounds: HomeRecentRound[];
};

export function HomeRecentRounds({ rounds }: Props) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={sectionHeadingClassName}>Recent rounds</h2>
        <Link
          href="/rounds"
          className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          See all
        </Link>
      </div>
      {rounds.length === 0 ? (
        <p className={homeRowMetaClassName}>No completed rounds yet.</p>
      ) : (
        <ul className="space-y-2">
          {rounds.map((round) => {
            const dateLabel =
              formatRoundDisplayDate(round.completedAt, round.startedAt) ?? "—";
            const metaParts = [round.layoutName, dateLabel];
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
      )}
    </section>
  );
}
