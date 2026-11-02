import Link from "next/link";
import { formatVsPar } from "@/lib/scoring/stats";
import type { HomeRecentRound } from "@/lib/home/types";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { cn } from "@/lib/utils";

export type { HomeRecentRound };

type Props = {
  rounds: HomeRecentRound[];
};

/** "19.10": day and month only; the list is recent by definition. */
function formatShortDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function HomeRecentRounds({ rounds }: Props) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 pb-1.5">
        <h2 className={sectionHeadingClassName}>Recent rounds</h2>
        <Link href="/rounds" className="shrink-0 text-sm font-semibold text-primary">
          See all
        </Link>
      </div>
      {rounds.length === 0 ? (
        <p className={homeRowMetaClassName}>No completed rounds yet.</p>
      ) : (
        <ul>
          {rounds.map((round) => {
            const hasScore =
              round.status === "completed" &&
              round.totalStrokes !== null &&
              round.vsPar !== null;

            return (
              <li key={round.id}>
                <Link
                  href={`/rounds/${round.id}`}
                  className="flex min-h-12 items-center gap-3 border-b py-3 transition-colors hover:bg-accent/50"
                >
                  <span className="w-[42px] shrink-0 font-mono text-[13px] text-muted-foreground">
                    {formatShortDate(round.completedAt ?? round.startedAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                    {round.courseName}
                  </span>
                  {round.status === "abandoned" ? (
                    <span className="shrink-0 text-sm text-muted-foreground">Abandoned</span>
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
      )}
    </section>
  );
}
