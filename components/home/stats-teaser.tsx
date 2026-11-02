import type { PlayerGlobalStats } from "@/lib/rounds/load-player-stats";

type Props = {
  stats: PlayerGlobalStats;
};

/** The C2 strip: three plain figures between two rules. */
export function HomeStatsTeaser({ stats }: Props) {
  if (stats.roundsPlayed === 0) {
    return null;
  }

  const figures = [
    { label: "Rounds played", value: stats.roundsPlayed },
    { label: "Total throws", value: stats.totalThrows },
    { label: "Courses visited", value: stats.coursesPlayed },
  ];

  return (
    <section aria-label="Your stats">
      <dl className="grid grid-cols-3 border-y">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={
              index === 0
                ? "flex flex-col-reverse gap-0.5 py-3.5"
                : "flex flex-col-reverse gap-0.5 border-l py-3.5 pl-3.5"
            }
          >
            <dt className="text-[13px] text-muted-foreground">{figure.label}</dt>
            <dd className="font-display text-[28px] font-semibold leading-none tabular-nums">
              {figure.value.toLocaleString("et-EE")}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
