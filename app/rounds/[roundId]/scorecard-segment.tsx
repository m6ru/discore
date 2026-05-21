import { formatVsPar, segmentPlayerStats } from "@/lib/scoring/stats";
import { makeScoreLookupKey } from "@/lib/scoring/types";
import type { HoleRow, ParticipantRow } from "./round-types";

function segmentHoleTitle(segmentHoles: HoleRow[]): string {
  if (segmentHoles.length === 0) {
    return "";
  }
  const start = segmentHoles[0].hole_number;
  const end = segmentHoles[segmentHoles.length - 1].hole_number;
  return `Holes ${start}–${end}`;
}

export type ScorecardSegmentProps = {
  segmentHoles: HoleRow[];
  allHoles: HoleRow[];
  scoreLookup: Map<string, number>;
  scoringParticipants: ParticipantRow[];
  getParticipantLabel: (participant: ParticipantRow) => string;
  activeHole: HoleRow | null;
  roundStatus: string;
};

export function ScorecardSegment({
  segmentHoles,
  allHoles,
  scoreLookup,
  scoringParticipants,
  getParticipantLabel,
  activeHole,
  roundStatus,
}: ScorecardSegmentProps) {
  const segmentLayoutPar = segmentHoles.reduce((sum, h) => sum + h.par, 0);
  const tableColSpan = segmentHoles.length + 5;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight text-zinc-900">{segmentHoleTitle(segmentHoles)}</h3>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="w-max min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 min-w-[7.5rem] border-b border-r border-zinc-200 bg-zinc-50 px-2.5 py-2.5 align-bottom text-left text-xs font-semibold uppercase tracking-wide text-zinc-600"
              >
                Player
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-zinc-200 bg-zinc-100 px-2 py-2.5 text-center text-xs font-semibold text-zinc-800"
                title="Total strokes on all holes with a saved score"
              >
                Strokes
              </th>
              <th
                rowSpan={2}
                className="border-b border-r border-zinc-200 bg-zinc-100 px-2 py-2.5 text-center text-xs font-semibold text-zinc-800"
                title="Versus par for the full round (holes with scores only)"
              >
                +/−
              </th>
              {segmentHoles.map((h) => {
                const isCurrent = roundStatus === "active" && activeHole?.id === h.id;
                return (
                  <th
                    key={h.id}
                    className={`min-w-[2.75rem] border-b border-zinc-200 px-0.5 py-1.5 text-center text-xs font-semibold tabular-nums ${
                      isCurrent ? "bg-amber-100 text-amber-950" : "bg-zinc-50 text-zinc-800"
                    }`}
                  >
                    {h.hole_number}
                  </th>
                );
              })}
              <th
                rowSpan={2}
                className="border-b border-l border-r border-zinc-200 bg-emerald-50/80 px-2 py-2.5 text-center text-xs font-semibold text-emerald-950"
                title="Strokes on the holes in this block only"
              >
                Block
              </th>
              <th
                rowSpan={2}
                className="border-b border-zinc-200 bg-emerald-50/80 px-2 py-2.5 text-center text-xs font-semibold text-emerald-950"
                title="Versus par for this block only"
              >
                +/−
              </th>
            </tr>
            <tr>
              {segmentHoles.map((h) => {
                const isCurrent = roundStatus === "active" && activeHole?.id === h.id;
                return (
                  <th
                    key={`par-${h.id}`}
                    className={`border-b border-zinc-200 px-0.5 py-1 text-center text-[10px] font-medium tabular-nums ${
                      isCurrent ? "bg-amber-100 text-amber-900" : "bg-zinc-50 text-zinc-500"
                    }`}
                  >
                    P{h.par}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scoringParticipants.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} className="px-3 py-4 text-center text-sm text-zinc-500">
                  No scoring players yet.
                </td>
              </tr>
            ) : (
              scoringParticipants.map((participant) => {
                const full = segmentPlayerStats(participant.id, allHoles, scoreLookup);
                const { totalStrokes, vsPar, thru } = segmentPlayerStats(
                  participant.id,
                  segmentHoles,
                  scoreLookup
                );
                return (
                  <tr key={participant.id} className="border-b border-zinc-100 last:border-b-0">
                    <td className="sticky left-0 z-10 whitespace-nowrap border-r border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-900">
                      {getParticipantLabel(participant)}
                    </td>
                    <td className="border-r border-zinc-100 bg-zinc-50/50 px-2 py-2 text-center text-xs font-semibold tabular-nums text-zinc-900">
                      {full.thru > 0 ? full.totalStrokes : "—"}
                    </td>
                    <td className="border-r border-zinc-100 bg-zinc-50/50 px-2 py-2 text-center text-xs font-semibold tabular-nums text-zinc-800">
                      {full.thru > 0 ? formatVsPar(full.vsPar) : "—"}
                    </td>
                    {segmentHoles.map((h) => {
                      const strokes = scoreLookup.get(makeScoreLookupKey(participant.id, h.id));
                      const isCurrent = roundStatus === "active" && activeHole?.id === h.id;
                      return (
                        <td
                          key={h.id}
                          className={`px-0.5 py-2 text-center text-xs tabular-nums ${
                            isCurrent ? "bg-amber-50/90 font-medium text-amber-950" : "text-zinc-800"
                          }`}
                        >
                          {strokes !== undefined ? strokes : "—"}
                        </td>
                      );
                    })}
                    <td className="border-l border-r border-emerald-100/80 bg-emerald-50/40 px-2 py-2 text-center text-xs font-semibold tabular-nums text-emerald-950">
                      {thru > 0 ? totalStrokes : "—"}
                    </td>
                    <td className="bg-emerald-50/40 px-2 py-2 text-center text-xs font-semibold tabular-nums text-emerald-950">
                      {thru > 0 ? formatVsPar(vsPar) : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200">
              <td className="sticky left-0 z-10 border-r border-zinc-200 bg-zinc-100 px-2.5 py-2 text-xs font-semibold text-zinc-700">
                Par
              </td>
              <td className="border-r border-zinc-100 bg-zinc-100 px-2 py-2 text-center text-xs text-zinc-400">
                —
              </td>
              <td className="border-r border-zinc-100 bg-zinc-100 px-2 py-2 text-center text-xs text-zinc-400">
                —
              </td>
              {segmentHoles.map((h) => (
                <td
                  key={`foot-par-${h.id}`}
                  className="bg-zinc-100 px-0.5 py-2 text-center text-xs tabular-nums text-zinc-600"
                >
                  {h.par}
                </td>
              ))}
              <td className="border-l border-r border-emerald-100 bg-emerald-50/60 px-2 py-2 text-center text-xs font-semibold tabular-nums text-emerald-900">
                {segmentLayoutPar}
              </td>
              <td className="bg-emerald-50/60 px-2 py-2 text-center text-xs text-emerald-800/70">
                —
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
