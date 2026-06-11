import { formatVsPar, segmentPlayerStats } from "@/lib/scoring/stats";
import { holeScoreTone } from "@/lib/scoring/scorecard-display";
import { makeScoreLookupKey } from "@/lib/scoring/types";
import { cn } from "@/lib/utils";
import type { RoundStatus } from "@/lib/rounds/round-status";
import type { HoleRow, LeaderboardRow } from "../round-types";

type Props = {
  roundStatus: RoundStatus;
  sortedHoles: HoleRow[];
  scoreLookup: Map<string, number>;
  obLookup: Map<string, boolean>;
  leaderboardRows: LeaderboardRow[];
  activeHole: HoleRow | null;
};

function cellToneClass(tone: ReturnType<typeof holeScoreTone>): string {
  switch (tone) {
    case "ace":
      return "bg-amber-300/70";
    case "eagle":
      return "bg-blue-500/35";
    case "birdie":
      return "bg-primary/20";
    case "bogey":
      return "bg-destructive/15";
    default:
      return "";
  }
}

const stickyShadow = "shadow-[4px_0_6px_-4px_rgba(0,0,0,0.12)]";

/** Fixed column widths — `left` offsets must match these exactly. */
const STICKY_COL = {
  player: { width: "w-[5rem]", left: "left-0" },
  par: { width: "w-8", left: "left-[5rem]" },
  total: { width: "w-9", left: "left-[7rem]" },
} as const;

function stickyCol(
  column: keyof typeof STICKY_COL,
  variant: "header" | "body"
): string {
  const { width, left } = STICKY_COL[column];
  return cn(
    "sticky border-r border-b",
    left,
    width,
    variant === "header" ? "z-30 bg-muted" : "z-20 bg-background",
    column === "total" && stickyShadow
  );
}

export function ScorecardSection({
  roundStatus,
  sortedHoles,
  scoreLookup,
  obLookup,
  leaderboardRows,
  activeHole,
}: Props) {
  if (sortedHoles.length === 0) {
    return <p className="text-sm text-muted-foreground">No holes loaded for this layout.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight">Scorecard</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th
                rowSpan={2}
                className={cn(
                  stickyCol("player", "header"),
                  "px-1 py-1 text-left text-[11px] font-medium text-muted-foreground"
                )}
              >
                Player
              </th>
              <th
                rowSpan={2}
                className={cn(
                  stickyCol("par", "header"),
                  "px-0.5 py-1 text-center text-[11px] font-medium text-muted-foreground"
                )}
                title="Versus par"
              >
                Par
              </th>
              <th
                rowSpan={2}
                className={cn(
                  stickyCol("total", "header"),
                  "px-0.5 py-1 text-center text-[11px] font-medium text-muted-foreground"
                )}
                title="Total strokes"
              >
                Total
              </th>
              {sortedHoles.map((hole) => {
                const isCurrent = roundStatus === "active" && activeHole?.id === hole.id;
                return (
                  <th
                    key={hole.id}
                    className={cn(
                      "relative z-0 min-w-[1.75rem] border-b px-0 py-1 text-center text-[11px] font-semibold tabular-nums",
                      isCurrent ? "bg-primary/15 text-foreground" : "bg-muted/40 text-foreground"
                    )}
                  >
                    {hole.hole_number}
                  </th>
                );
              })}
            </tr>
            <tr className="bg-muted/30">
              {sortedHoles.map((hole) => {
                const isCurrent = roundStatus === "active" && activeHole?.id === hole.id;
                return (
                  <th
                    key={`par-${hole.id}`}
                    className={cn(
                      "relative z-0 border-b px-0 py-0 text-center text-[10px] font-medium tabular-nums text-muted-foreground",
                      isCurrent ? "bg-primary/10" : "bg-muted/30"
                    )}
                  >
                    {hole.par}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {leaderboardRows.length === 0 ? (
              <tr>
                <td
                  colSpan={sortedHoles.length + 3}
                  className="px-3 py-4 text-center text-sm text-muted-foreground"
                >
                  No scoring players yet.
                </td>
              </tr>
            ) : (
              leaderboardRows.map((row, index) => {
                const full = segmentPlayerStats(row.participantId, sortedHoles, scoreLookup);
                const rank = row.thru > 0 ? index + 1 : null;

                return (
                  <tr key={row.participantId}>
                    <td
                      className={cn(
                        stickyCol("player", "body"),
                        "max-w-[5rem] truncate px-1 py-1 text-[11px] font-medium text-foreground"
                      )}
                    >
                      {rank !== null ? (
                        <>
                          <span className="text-muted-foreground tabular-nums">{rank}.</span>{" "}
                          {row.label}
                        </>
                      ) : (
                        row.label
                      )}
                    </td>
                    <td
                      className={cn(
                        stickyCol("par", "body"),
                        "px-0.5 py-1 text-center font-mono text-[11px] font-semibold tabular-nums text-foreground"
                      )}
                    >
                      {full.thru > 0 ? formatVsPar(full.vsPar) : "—"}
                    </td>
                    <td
                      className={cn(
                        stickyCol("total", "body"),
                        "px-0.5 py-1 text-center font-mono text-[11px] font-semibold tabular-nums text-foreground"
                      )}
                    >
                      {full.thru > 0 ? full.totalStrokes : "—"}
                    </td>
                    {sortedHoles.map((hole) => {
                      const key = makeScoreLookupKey(row.participantId, hole.id);
                      const strokes = scoreLookup.get(key);
                      const ob = obLookup.get(key) ?? false;
                      const isCurrent = roundStatus === "active" && activeHole?.id === hole.id;
                      const tone = holeScoreTone(strokes, hole.par);
                      const isEmpty = strokes === undefined;

                      return (
                        <td
                          key={hole.id}
                          className={cn(
                            "relative z-0 overflow-hidden border-b px-0 py-1 text-center font-mono text-[11px] tabular-nums text-foreground",
                            isCurrent && !cellToneClass(tone) && "bg-primary/5",
                            cellToneClass(tone),
                            ob && "shadow-[inset_0_2px_0_0_var(--destructive)]",
                            isEmpty && "text-muted-foreground"
                          )}
                        >
                          {strokes !== undefined ? strokes : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
