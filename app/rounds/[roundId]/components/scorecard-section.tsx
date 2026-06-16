"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

const COLLAPSED_PLAYER_WIDTH_PX = 7 * 16;
const SUMMARY_COL_WIDTH_PX = 1.3125 * 16;
const PLAYER_COL_HORIZONTAL_PADDING_PX = 12;
const PLAYER_COL_EXTRA_MARGIN_PX = 8;

function stickyColClasses(
  column: "player" | "vsPar" | "thr",
  variant: "header" | "body"
): string {
  return cn(
    "sticky border-r border-b",
    variant === "header" ? "z-30 bg-muted" : "z-20 bg-background",
    column === "thr" && stickyShadow
  );
}

function stickyColStyle(
  column: "player" | "vsPar" | "thr",
  playerWidthPx: number
): CSSProperties {
  if (column === "player") {
    return {
      width: playerWidthPx,
      minWidth: playerWidthPx,
      maxWidth: playerWidthPx,
      left: 0,
    };
  }

  const left =
    column === "vsPar" ? playerWidthPx : playerWidthPx + SUMMARY_COL_WIDTH_PX;

  return {
    width: SUMMARY_COL_WIDTH_PX,
    minWidth: SUMMARY_COL_WIDTH_PX,
    maxWidth: SUMMARY_COL_WIDTH_PX,
    left,
  };
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
  const [expandedPlayerWidthPx, setExpandedPlayerWidthPx] = useState(
    COLLAPSED_PLAYER_WIDTH_PX
  );
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const togglePlayerColumn = () => setPlayerColumnExpanded((expanded) => !expanded);

  const playerWidthPx = playerColumnExpanded
    ? expandedPlayerWidthPx
    : COLLAPSED_PLAYER_WIDTH_PX;

  useLayoutEffect(() => {
    if (!playerColumnExpanded) {
      const measureTruncation = () => {
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

      measureTruncation();
      window.addEventListener("resize", measureTruncation);
      return () => window.removeEventListener("resize", measureTruncation);
    }

    const measureExpandedWidth = () => {
      const spans = measureRef.current?.querySelectorAll("[data-measure-name]");
      if (!spans?.length) {
        setExpandedPlayerWidthPx(COLLAPSED_PLAYER_WIDTH_PX);
        return;
      }

      let maxContentWidth = 0;
      for (const span of spans) {
        maxContentWidth = Math.max(maxContentWidth, span.getBoundingClientRect().width);
      }

      setExpandedPlayerWidthPx(
        Math.max(
          maxContentWidth +
            PLAYER_COL_HORIZONTAL_PADDING_PX +
            PLAYER_COL_EXTRA_MARGIN_PX,
          COLLAPSED_PLAYER_WIDTH_PX
        )
      );
    };

    measureExpandedWidth();
    window.addEventListener("resize", measureExpandedWidth);
    return () => window.removeEventListener("resize", measureExpandedWidth);
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
      <div
        ref={measureRef}
        className="pointer-events-none absolute -left-[9999px] whitespace-nowrap text-[11px] font-medium"
        aria-hidden
      >
        {leaderboardRows.map((row, index) => {
          const thru = segmentPlayerStats(row.participantId, sortedHoles, scoreLookup).thru;
          const rank = thru > 0 ? index + 1 : null;
          return (
            <span key={row.participantId} data-measure-name>
              {rank !== null ? (
                <>
                  <span className="text-muted-foreground tabular-nums">{rank}.</span>{" "}
                  {row.label}
                </>
              ) : (
                row.label
              )}
            </span>
          );
        })}
      </div>
      <div className={cn("overflow-x-auto", showBorder && "rounded-lg border")}>
        <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th
                rowSpan={2}
                data-scorecard-player-column
                role="button"
                tabIndex={0}
                aria-expanded={playerColumnExpanded}
                aria-label={
                  playerColumnExpanded ? "Collapse player names" : "Expand player names"
                }
                style={stickyColStyle("player", playerWidthPx)}
                className={cn(
                  stickyColClasses("player", "header"),
                  "cursor-pointer select-none px-1.5 py-1.5 text-left text-[11px] font-medium text-muted-foreground"
                )}
                onClick={togglePlayerColumn}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePlayerColumn();
                  }
                }}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span>Player</span>
                  {playerColumnExpanded ? (
                    <ChevronLeft
                      className="size-4 shrink-0 text-foreground"
                      aria-hidden
                    />
                  ) : (
                    <ChevronRight
                      className={cn(
                        "size-4 shrink-0",
                        hasTruncatedNames ? "text-foreground" : "text-muted-foreground"
                      )}
                      aria-hidden
                    />
                  )}
                </span>
              </th>
              <th
                rowSpan={2}
                style={stickyColStyle("vsPar", playerWidthPx)}
                className={cn(
                  stickyColClasses("vsPar", "header"),
                  summaryHeaderClass
                )}
                title="Versus par"
              >
                Par
              </th>
              <th
                rowSpan={2}
                style={stickyColStyle("thr", playerWidthPx)}
                className={cn(
                  stickyColClasses("thr", "header"),
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
                      style={stickyColStyle("player", playerWidthPx)}
                      className={cn(
                        stickyColClasses("player", "body"),
                        "cursor-pointer select-none px-1.5 py-1 text-[11px] font-medium text-foreground",
                        playerColumnExpanded ? "whitespace-nowrap" : "truncate"
                      )}
                      onClick={togglePlayerColumn}
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
                      style={stickyColStyle("vsPar", playerWidthPx)}
                      className={cn(stickyColClasses("vsPar", "body"), summaryColClass)}
                    >
                      {vsParLabel}
                    </td>
                    <td
                      style={stickyColStyle("thr", playerWidthPx)}
                      className={cn(stickyColClasses("thr", "body"), summaryColClass)}
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
