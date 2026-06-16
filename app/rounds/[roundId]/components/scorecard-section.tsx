import { formatVsPar, segmentPlayerStats } from "@/lib/scoring/stats";
import { holeScoreTone } from "@/lib/scoring/scorecard-display";
import { makeScoreLookupKey } from "@/lib/scoring/types";
import { cn } from "@/lib/utils";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import type { RoundStatus } from "@/lib/rounds/round-status";
import type { HoleRow, LeaderboardRow } from "../round-types";

type Props = {
  roundStatus: RoundStatus;
  sortedHoles: HoleRow[];
  scoreLookup: Map<string, number>;
  obLookup: Map<string, boolean>;
  leaderboardRows: LeaderboardRow[];
  activeHole: HoleRow | null;
  showTitle?: boolean;
  /** Drop outer card chrome — for full-width scorecard overlay. */
  embedded?: boolean;
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
    case "doubleBogey":
      return "bg-destructive/35";
    default:
      return "";
  }
}

const stickyShadow = "shadow-[4px_0_6px_-4px_rgba(0,0,0,0.12)]";

/** Fixed column widths — `left` offsets must match these exactly. */
const STICKY_COL = {
  player: { width: "w-[5.25rem]", left: "left-0" },
  vsPar: { width: "w-7", left: "left-[5.25rem]" },
  thr: { width: "w-6", left: "left-[7rem]" },
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
    column === "thr" && stickyShadow
  );
}

function formatThru(thru: number, holeCount: number): string {
  if (thru === 0) {
    return "—";
  }
  if (thru >= holeCount) {
    return "F";
  }
  return String(thru);
}

const holeColClass =
  "relative z-0 w-[1.375rem] min-w-[1.375rem] max-w-[1.375rem] border-b px-0 py-0.5 text-center font-mono text-[11px] tabular-nums";

const summaryColClass =
  "border-b px-0 py-1 text-center font-mono text-[11px] font-semibold tabular-nums text-foreground";

/** Trailing Par / Total — fixed width with vertical borders like other summary columns. */
const endParHeaderClass =
  "w-7 min-w-[1.75rem] border-b border-l border-r bg-muted px-0 py-1 text-center text-[11px] font-medium text-muted-foreground";
const endTotalHeaderClass =
  "w-7 min-w-[1.75rem] border-b border-r bg-muted px-0 py-1 text-center text-[11px] font-medium text-muted-foreground";
const endParCellClass =
  "w-7 min-w-[1.75rem] border-b border-l border-r bg-background px-0 py-1 text-center font-mono text-[11px] font-semibold tabular-nums text-foreground";
const endTotalCellClass =
  "w-7 min-w-[1.75rem] border-b border-r bg-background px-0 py-1 text-center font-mono text-[11px] font-semibold tabular-nums text-foreground";

export function ScorecardSection({
  roundStatus,
  sortedHoles,
  scoreLookup,
  obLookup,
  leaderboardRows,
  activeHole,
  showTitle = true,
  embedded = false,
}: Props) {
  if (sortedHoles.length === 0) {
    return <p className="text-sm text-muted-foreground">No holes loaded for this layout.</p>;
  }

  const holeCount = sortedHoles.length;
  const summaryHeaderClass =
    "px-0 py-1 text-center text-[11px] font-medium text-muted-foreground";

  return (
    <div className={embedded ? "min-h-0" : "space-y-3"}>
      {showTitle && !embedded ? (
        <h3 className={sectionHeadingClassName}>Scorecard</h3>
      ) : null}
      <div className={cn("overflow-x-auto", !embedded && "rounded-lg border")}>
        <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th
                rowSpan={2}
                className={cn(
                  stickyCol("player", "header"),
                  "max-w-[5.25rem] px-1.5 py-1.5 text-left text-[11px] font-medium text-muted-foreground"
                )}
              >
                Player
              </th>
              <th
                rowSpan={2}
                className={cn(stickyCol("vsPar", "header"), summaryHeaderClass)}
                title="Versus par"
              >
                Par
              </th>
              <th
                rowSpan={2}
                className={cn(stickyCol("thr", "header"), summaryHeaderClass)}
                title="Holes completed"
              >
                Thr
              </th>
              {sortedHoles.map((hole) => {
                const isCurrent = roundStatus === "active" && activeHole?.id === hole.id;
                return (
                  <th
                    key={hole.id}
                    className={cn(
                      holeColClass,
                      "font-semibold",
                      isCurrent ? "bg-primary/15 text-foreground" : "bg-muted/40 text-foreground"
                    )}
                  >
                    {hole.hole_number}
                  </th>
                );
              })}
              <th rowSpan={2} className={endParHeaderClass} title="Versus par">
                Par
              </th>
              <th rowSpan={2} className={endTotalHeaderClass} title="Total strokes">
                Total
              </th>
            </tr>
            <tr className="bg-muted/30">
              {sortedHoles.map((hole) => {
                const isCurrent = roundStatus === "active" && activeHole?.id === hole.id;
                return (
                  <th
                    key={`par-${hole.id}`}
                    className={cn(
                      "relative z-0 w-[1.375rem] min-w-[1.375rem] max-w-[1.375rem] border-b px-0 py-0 text-center text-[10px] font-medium tabular-nums text-muted-foreground",
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
                  colSpan={sortedHoles.length + 5}
                  className="px-3 py-4 text-center text-sm text-muted-foreground"
                >
                  No scoring players yet.
                </td>
              </tr>
            ) : (
              leaderboardRows.map((row, index) => {
                const full = segmentPlayerStats(row.participantId, sortedHoles, scoreLookup);
                const rank = full.thru > 0 ? index + 1 : null;
                const vsParLabel = full.thru > 0 ? formatVsPar(full.vsPar) : "—";
                const thrLabel = formatThru(full.thru, holeCount);
                const totalLabel = full.thru > 0 ? full.totalStrokes : "—";

                return (
                  <tr
                    key={`${row.participantId}-${full.thru}-${full.vsPar}-${full.totalStrokes}`}
                  >
                    <td
                      className={cn(
                        stickyCol("player", "body"),
                        "max-w-[5.25rem] truncate px-1.5 py-1 text-[11px] font-medium text-foreground"
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
                    <td className={cn(stickyCol("vsPar", "body"), summaryColClass)}>
                      {vsParLabel}
                    </td>
                    <td className={cn(stickyCol("thr", "body"), summaryColClass)}>{thrLabel}</td>
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
                            holeColClass,
                            "overflow-hidden text-foreground",
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
                    <td className={endParCellClass}>{vsParLabel}</td>
                    <td className={endTotalCellClass}>{totalLabel}</td>
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
