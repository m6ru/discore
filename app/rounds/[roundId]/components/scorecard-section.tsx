"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
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
  showBorder?: boolean;
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

const holeColWidth = "w-[1.25rem] min-w-[1.25rem] max-w-[1.25rem]";
const stickySummaryColWidth = "w-[1.3125rem] min-w-[1.3125rem] max-w-[1.3125rem]";

function stickyCol(
  column: "player" | "vsPar" | "thr",
  variant: "header" | "body",
  playerColumnExpanded: boolean
): string {
  const playerWidth = playerColumnExpanded ? "w-[12rem]" : "w-[7rem]";
  const vsParLeft = playerColumnExpanded ? "left-[12rem]" : "left-[7rem]";
  const thrLeft = playerColumnExpanded ? "left-[13.3125rem]" : "left-[8.3125rem]";

  const width =
    column === "player" ? playerWidth : stickySummaryColWidth;
  const left =
    column === "player" ? "left-0" : column === "vsPar" ? vsParLeft : thrLeft;

  return cn(
    "sticky border-r border-b",
    left,
    width,
    variant === "header" ? "z-30 bg-muted" : "z-20 bg-background",
    column === "thr" && stickyShadow
  );
}

function playerColSize(playerColumnExpanded: boolean): string {
  return playerColumnExpanded
    ? "min-w-[12rem] max-w-[12rem]"
    : "min-w-[7rem] max-w-[7rem]";
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
  `relative z-0 ${holeColWidth} border-b px-0 py-0.5 text-center font-mono text-[12px] tabular-nums`;

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
  showBorder = true,
}: Props) {
  const [playerColumnExpanded, setPlayerColumnExpanded] = useState(false);
  const [hasTruncatedNames, setHasTruncatedNames] = useState(false);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useLayoutEffect(() => {
    if (playerColumnExpanded) {
      return;
    }

    const measure = () => {
      const cells = tbodyRef.current?.querySelectorAll("[data-scorecard-player-name]");
      if (!cells?.length) {
        setHasTruncatedNames(false);
        return;
      }
      let truncated = false;
      for (const cell of cells) {
        if (cell.scrollWidth > cell.clientWidth + 1) {
          truncated = true;
          break;
        }
      }
      setHasTruncatedNames(truncated);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [playerColumnExpanded, leaderboardRows]);

  useEffect(() => {
    if (!playerColumnExpanded) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest("[data-scorecard-player-column]")) {
        return;
      }
      setPlayerColumnExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [playerColumnExpanded]);

  if (sortedHoles.length === 0) {
    return <p className="text-sm text-muted-foreground">No holes loaded for this layout.</p>;
  }

  const holeCount = sortedHoles.length;
  const summaryHeaderClass =
    "px-0 py-1 text-center text-[11px] font-medium text-muted-foreground";

  return (
    <div className="space-y-3">
      {showTitle ? (
        <h3 className={sectionHeadingClassName}>Scorecard</h3>
      ) : null}
      <div className={cn("overflow-x-auto", showBorder && "rounded-lg border")}>
        <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th
                rowSpan={2}
                data-scorecard-player-column
                className={cn(
                  stickyCol("player", "header", playerColumnExpanded),
                  playerColSize(playerColumnExpanded),
                  "px-1.5 py-1.5 text-left text-[11px] font-medium text-muted-foreground"
                )}
              >
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center justify-between gap-2 text-left"
                  aria-expanded={playerColumnExpanded}
                  aria-label={
                    playerColumnExpanded ? "Collapse player names" : "Expand player names"
                  }
                  onClick={() => setPlayerColumnExpanded((expanded) => !expanded)}
                >
                  <span>Player</span>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 transition-transform",
                      playerColumnExpanded && "rotate-90",
                      hasTruncatedNames && !playerColumnExpanded
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                </button>
              </th>
              <th
                rowSpan={2}
                className={cn(
                  stickyCol("vsPar", "header", playerColumnExpanded),
                  summaryHeaderClass
                )}
                title="Versus par"
              >
                Par
              </th>
              <th
                rowSpan={2}
                className={cn(
                  stickyCol("thr", "header", playerColumnExpanded),
                  summaryHeaderClass
                )}
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
                      "relative z-0",
                      holeColWidth,
                      "border-b px-0 py-0 text-center text-[12px] font-medium tabular-nums text-muted-foreground",
                      isCurrent ? "bg-primary/10" : "bg-muted/30"
                    )}
                  >
                    {hole.par}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
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
                      data-scorecard-player-column
                      data-scorecard-player-name
                      className={cn(
                        stickyCol("player", "body", playerColumnExpanded),
                        playerColSize(playerColumnExpanded),
                        "px-1.5 py-1 text-[11px] font-medium text-foreground",
                        playerColumnExpanded ? "whitespace-nowrap" : "truncate"
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
                        stickyCol("vsPar", "body", playerColumnExpanded),
                        summaryColClass
                      )}
                    >
                      {vsParLabel}
                    </td>
                    <td
                      className={cn(
                        stickyCol("thr", "body", playerColumnExpanded),
                        summaryColClass
                      )}
                    >
                      {thrLabel}
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
