"use client";

import { getTotalStrokes } from "@/lib/scoring/stats";
import type { HoleScoreRow, ParticipantRow } from "../round-types";

type Props = {
  showFrontNineSummary: boolean;
  scoringParticipants: ParticipantRow[];
  holeScores: HoleScoreRow[];
  firstNineHoleIds: string[];
  getParticipantLabel: (participant: ParticipantRow) => string;
};

export function RoundSummaries({
  showFrontNineSummary,
  scoringParticipants,
  holeScores,
  firstNineHoleIds,
  getParticipantLabel,
}: Props) {
  if (!showFrontNineSummary) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Front 9 summary</h3>
      <ul className="space-y-2 text-sm">
        {scoringParticipants.map((participant) => (
          <li
            key={`front9-${participant.id}`}
            className="flex items-center justify-between text-foreground"
          >
            <span>{getParticipantLabel(participant)}</span>
            <span className="font-mono font-medium tabular-nums">
              {getTotalStrokes(holeScores, participant.id, firstNineHoleIds)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
