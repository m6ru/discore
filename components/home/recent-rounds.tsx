import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import type { HomeRecentRound } from "@/lib/home/types";
import {
  homeRowLinkClassName,
  homeRowMetaClassName,
  homeRowTitleClassName,
} from "@/lib/ui/page-chrome";
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
        <ul>
          {rounds.map((round) => {
            const dateLabel =
              formatRoundDisplayDate(round.completedAt, round.startedAt) ?? "—";

            return (
              <li key={round.id}>
                <Link href={`/rounds/${round.id}`} className={homeRowLinkClassName}>
                  <div className="min-w-0">
                    <p className={`truncate ${homeRowTitleClassName}`}>{round.courseName}</p>
                    <p className={`truncate ${homeRowMetaClassName}`}>
                      {round.layoutName} · {dateLabel}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
