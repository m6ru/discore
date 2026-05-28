import { ScorecardSegment } from "./scorecard-segment";
import type { RoundStatus } from "@/lib/rounds/round-status";
import type { HoleRow, ParticipantRow } from "../round-types";

type Props = {
  roundStatus: RoundStatus;
  holeSegments: HoleRow[][];
  sortedHoles: HoleRow[];
  scoreLookup: Map<string, number>;
  scoringParticipants: ParticipantRow[];
  getParticipantLabel: (participant: ParticipantRow) => string;
  activeHole: HoleRow | null;
};

export function ScorecardSection({
  roundStatus,
  holeSegments,
  sortedHoles,
  scoreLookup,
  scoringParticipants,
  getParticipantLabel,
  activeHole,
}: Props) {
  if (holeSegments.length > 0) {
    return (
      <div className="space-y-10 border-t border-zinc-200 pt-8">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-zinc-900">Scorecard</h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
            Up to nine holes per table. <span className="font-medium text-zinc-600">Strokes</span> and the
            first <span className="font-medium text-zinc-600">+/−</span> are for the full round;{" "}
            <span className="font-medium text-emerald-800">Block</span> columns count only that section.
            Scroll sideways on narrow screens.
          </p>
        </div>
        {holeSegments.map((segment, idx) => (
          <ScorecardSegment
            key={`seg-${idx}-${segment[0]?.id ?? idx}`}
            segmentHoles={segment}
            allHoles={sortedHoles}
            scoreLookup={scoreLookup}
            scoringParticipants={scoringParticipants}
            getParticipantLabel={getParticipantLabel}
            activeHole={activeHole}
            roundStatus={roundStatus}
          />
        ))}
      </div>
    );
  }

  if (sortedHoles.length === 0) {
    return <p className="text-sm text-zinc-500">No holes loaded for this layout.</p>;
  }

  return null;
}
