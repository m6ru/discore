import { pickOne } from "@/lib/supabase/select-helpers";
import type { HomeActiveRound } from "./types";

/** Cap rows pulled for home round parsing (see load-home-data). */
export const HOME_PARTICIPATION_ROW_LIMIT = 40;

type RoundEmbed = {
  id: string;
  scorer_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  layout_id: string;
  layouts: unknown;
};

type ParticipationRow = {
  rounds: RoundEmbed | RoundEmbed[] | null;
};

function namesFromRound(round: RoundEmbed) {
  const layout = pickOne(round.layouts as { name: string; courses: unknown } | { name: string; courses: unknown }[] | null);
  const course = pickOne(layout?.courses as { name: string } | { name: string }[] | null);
  return {
    courseName: course?.name ?? "Unknown course",
    layoutName: layout?.name ?? "Unknown layout",
  };
}

export function parseHomeParticipantRounds(rows: ParticipationRow[]): {
  activeRounds: HomeActiveRound[];
  hasJoinedRound: boolean;
} {
  const hasJoinedRound = rows.length > 0;
  const activeRounds: HomeActiveRound[] = [];

  for (const row of rows) {
    const round = pickOne(row.rounds);
    if (!round) {
      continue;
    }

    const { courseName, layoutName } = namesFromRound(round);

    if (round.status === "active") {
      activeRounds.push({
        id: round.id,
        scorer_id: round.scorer_id,
        started_at: round.started_at,
        course_name: courseName,
        layout_name: layoutName,
      });
    }
  }

  return {
    activeRounds,
    hasJoinedRound,
  };
}
