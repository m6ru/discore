"use client";

import { getTotalStrokes } from "@/lib/scoring/stats";
import type { RoundStatus } from "@/lib/rounds/round-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HoleScoreRow, ParticipantRow } from "../round-types";
import { ConfirmActionDialog } from "./confirm-action-dialog";

type Props = {
  showFrontNineSummary: boolean;
  showFinalSummary: boolean;
  roundStatus: RoundStatus;
  isScorer: boolean;
  isSubmitting: boolean;
  isTransitioning: boolean;
  scoringParticipants: ParticipantRow[];
  holeScores: HoleScoreRow[];
  firstNineHoleIds: string[];
  holeIds: string[];
  getParticipantLabel: (participant: ParticipantRow) => string;
  onCompleteRound: () => void;
};

export function RoundSummaries({
  showFrontNineSummary,
  showFinalSummary,
  roundStatus,
  isScorer,
  isSubmitting,
  isTransitioning,
  scoringParticipants,
  holeScores,
  firstNineHoleIds,
  holeIds,
  getParticipantLabel,
  onCompleteRound,
}: Props) {
  return (
    <>
      {showFrontNineSummary ? (
        <Card className="gap-3 py-4 shadow-none">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm">Front 9 summary</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
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
          </CardContent>
        </Card>
      ) : null}

      {showFinalSummary ? (
        <Card className="gap-4 py-4 shadow-none">
          <CardHeader className="px-4 pb-0">
            <CardTitle className="text-sm">Round summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4">
            <ul className="space-y-2 text-sm">
              {scoringParticipants.map((participant) => (
                <li
                  key={`final-${participant.id}`}
                  className="flex items-center justify-between text-foreground"
                >
                  <span>{getParticipantLabel(participant)}</span>
                  <span className="font-mono font-medium tabular-nums">
                    {getTotalStrokes(holeScores, participant.id, holeIds)}
                  </span>
                </li>
              ))}
            </ul>
            {roundStatus === "active" && isScorer ? (
              <ConfirmActionDialog
                title="End this round?"
                description="Final scores will be saved for everyone. You'll find this round in your history."
                confirmLabel="Complete round"
                confirmVariant="default"
                onConfirm={onCompleteRound}
                disabled={isSubmitting || isTransitioning}
                trigger={
                  <Button
                    type="button"
                    size="lg"
                    className="min-h-11 w-full"
                    disabled={isSubmitting || isTransitioning}
                  >
                    {isTransitioning ? "Working..." : "Confirm and end round"}
                  </Button>
                }
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Round is completed. Scores are now read-only.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
