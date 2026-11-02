import type { PlayerGlobalStats } from "@/lib/rounds/load-player-stats";

type Props = {
  stats: PlayerGlobalStats;
  /** Courses in the catalog, for "12 of 80 parks". */
  courseCount: number;
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** One short line of fun numbers (BLUEPRINT §8a, I + J); no grid on Home. */
export function HomeStatsTeaser({ stats, courseCount }: Props) {
  if (stats.roundsPlayed === 0) {
    return null;
  }

  const parts = [
    plural(stats.roundsPlayed, "round", "rounds"),
    courseCount > 0
      ? `${stats.coursesPlayed} of ${courseCount} parks`
      : plural(stats.coursesPlayed, "park", "parks"),
    stats.aceTotal > 0 ? plural(stats.aceTotal, "ace", "aces") : null,
  ].filter(Boolean);

  return (
    <p className="border-y py-3 font-mono text-[13px] text-muted-foreground">{parts.join(" · ")}</p>
  );
}
