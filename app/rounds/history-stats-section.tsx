import type { PlayerGlobalStats } from "@/lib/rounds/load-player-stats";
import { GlobalStatsSummary } from "@/components/stats/global-stats-summary";

type Props = {
  stats: PlayerGlobalStats;
};

export function HistoryStatsSection({ stats }: Props) {
  return <GlobalStatsSummary stats={stats} />;
}
