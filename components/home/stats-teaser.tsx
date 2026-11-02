import type { PlayerGlobalStats } from "@/lib/rounds/load-player-stats";
import { formatVsPar } from "@/lib/scoring/stats";

type Props = {
  stats: PlayerGlobalStats;
};

/** One thin strip of figures; the details live on History and course stats. */
export function HomeStatsTeaser({ stats }: Props) {
  if (stats.roundsPlayed === 0) {
    return null;
  }

  const figures = [
    { label: "Rounds", value: String(stats.roundsPlayed) },
    { label: "Best round", value: stats.bestVsPar !== null ? formatVsPar(stats.bestVsPar) : "—" },
    { label: "Throws", value: String(stats.totalThrows) },
  ];

  return (
    <section aria-label="Your stats">
      <dl className="grid grid-cols-3 border-y">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={index === 0 ? "flex flex-col-reverse gap-0.5 py-3.5" : "flex flex-col-reverse gap-0.5 border-l py-3.5 pl-3.5"}
          >
            <dt className="text-[13px] text-muted-foreground">{figure.label}</dt>
            <dd className="font-display text-[28px] font-semibold leading-none tabular-nums">{figure.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
