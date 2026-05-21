import { getTotalStrokes } from "@/lib/scoring/stats";
import type { HoleScoreRow, ParticipantRow } from "../round-types";

type Props = {
  showFrontNineSummary: boolean;
  showFinalSummary: boolean;
  roundStatus: string;
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
        <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <h3 className="text-sm font-semibold text-zinc-800">Front 9 summary</h3>
          <ul className="space-y-1 text-sm text-zinc-700">
            {scoringParticipants.map((participant) => (
              <li key={`front9-${participant.id}`} className="flex items-center justify-between">
                <span>{getParticipantLabel(participant)}</span>
                <span className="font-medium">
                  {getTotalStrokes(holeScores, participant.id, firstNineHoleIds)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showFinalSummary ? (
        <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <h3 className="text-sm font-semibold text-zinc-800">Round summary</h3>
          <ul className="space-y-1 text-sm text-zinc-700">
            {scoringParticipants.map((participant) => (
              <li key={`final-${participant.id}`} className="flex items-center justify-between">
                <span>{getParticipantLabel(participant)}</span>
                <span className="font-medium">
                  {getTotalStrokes(holeScores, participant.id, holeIds)}
                </span>
              </li>
            ))}
          </ul>
          {roundStatus === "active" && isScorer ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onCompleteRound()}
                disabled={isSubmitting || isTransitioning}
                className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isTransitioning ? "Working..." : "Confirm and end round"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Round is completed. Scores are now read-only.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
