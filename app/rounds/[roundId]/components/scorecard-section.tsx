"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
  /** One row per player, in play order (casual rounds are never ranked). */
  rows: LeaderboardRow[];
  activeHole: HoleRow | null;
  showTitle?: boolean;
  /** Makes each hole column a tap target (the review step uses it to edit a hole). */
  onHoleSelect?: (hole: HoleRow) => void;
};

function cellToneClass(tone: ReturnType<typeof holeScoreTone>): string {
  switch (tone) {
    case "ace":
      return "bg-ace";
    case "eagle":
      return "bg-eagle";
    case "birdie":
      return "bg-good";
    case "bogey":
      return "bg-over";
    case "doubleBogey":
      return "bg-over-strong";
    default:
      return "";
  }
}

/** Only the name column is pinned, and it stays narrow so more holes fit. */
const pinnedClass =
  "sticky left-0 z-10 border-r bg-background pr-2 text-left shadow-[4px_0_6px_-4px_rgba(20,24,20,0.15)]";

/** The ± beside each name in the pinned column. */
const vsParCellClass = "ml-auto w-8 shrink-0 pl-1 text-right font-semibold";

/** First names keep the pinned column narrow; players who share one keep their full name. */
function firstNamesUnlessShared(labels: string[]): string[] {
  const firstNames = labels.map((label) => label.trim().split(/\s+/)[0] || label);
  return firstNames.map((name, index) =>
    firstNames.filter((other) => other === name).length > 1 ? labels[index] : name
  );
}

function scrollActiveHoleIntoView(container: HTMLElement, activeCell: HTMLElement): void {
  const containerRect = container.getBoundingClientRect();
  const cellLeft =
    activeCell.getBoundingClientRect().left - containerRect.left + container.scrollLeft;
  const cellRight = cellLeft + activeCell.offsetWidth;
  container.scrollLeft = Math.max(0, cellRight - container.clientWidth + 48);
}

export function ScorecardSection({
  roundStatus,
  sortedHoles,
  scoreLookup,
  obLookup,
  rows,
  activeHole,
  showTitle = true,
  onHoleSelect,
}: Props) {
  const [namesExpanded, setNamesExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeHoleHeaderRef = useRef<HTMLTableCellElement>(null);
  const activeHoleId = roundStatus === "active" ? activeHole?.id : undefined;

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const cell = activeHoleHeaderRef.current;
    if (!activeHoleId || !container || !cell) {
      return;
    }
    scrollActiveHoleIntoView(container, cell);
  }, [activeHoleId, namesExpanded, sortedHoles.length]);

  if (sortedHoles.length === 0) {
    return <p className="text-sm text-muted-foreground">No holes loaded for this layout.</p>;
  }

  const totalPar = sortedHoles.reduce((sum, hole) => sum + hole.par, 0);
  const nameWidth = namesExpanded ? "max-w-none" : "w-[64px] max-w-[64px]";
  const shortNames = firstNamesUnlessShared(rows.map((row) => row.label));

  return (
    <div className="space-y-2.5">
      {showTitle ? (
        <h3 className="font-display text-lg font-semibold">Scorecard</h3>
      ) : null}
      <div ref={scrollContainerRef} className="overflow-x-auto overscroll-x-contain">
        <table className="w-max border-separate border-spacing-0 font-mono text-[13px] tabular-nums">
          <thead>
            <tr>
              <th scope="col" className={cn(pinnedClass, "pb-1.5 font-sans text-xs font-semibold text-muted-foreground")}>
                {/* The pinned column holds the name and ±, so the score vs par is visible at any hole. */}
                <span className="flex items-center">
                  <button
                    type="button"
                    className="min-h-6 text-left"
                    aria-expanded={namesExpanded}
                    aria-label={namesExpanded ? "Show first names" : "Show full player names"}
                    onClick={() => setNamesExpanded((expanded) => !expanded)}
                  >
                    Hole
                  </button>
                  <span className={vsParCellClass}>±</span>
                </span>
              </th>
              {sortedHoles.map((hole) => {
                const isCurrent = hole.id === activeHoleId;
                return (
                  <th
                    key={hole.id}
                    scope="col"
                    ref={isCurrent ? activeHoleHeaderRef : undefined}
                    className="w-[22px] min-w-[22px] px-px pb-1.5 text-center text-xs font-semibold text-muted-foreground"
                  >
                    {onHoleSelect ? (
                      <button
                        type="button"
                        className="mx-auto flex h-6 w-5 items-center justify-center rounded-[3px] hover:bg-secondary hover:text-foreground"
                        aria-label={`Edit hole ${hole.hole_number}`}
                        onClick={() => onHoleSelect(hole)}
                      >
                        {hole.hole_number}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "mx-auto flex h-5 w-5 items-center justify-center rounded-[3px]",
                          isCurrent && "text-foreground ring-[1.5px] ring-foreground"
                        )}
                        aria-current={isCurrent ? "step" : undefined}
                      >
                        {hole.hole_number}
                      </span>
                    )}
                  </th>
                );
              })}
              <th scope="col" className="pb-1.5 pl-2.5 pr-1 text-right font-sans text-xs font-semibold text-muted-foreground">
                Tot
              </th>
            </tr>
            <tr>
              <th scope="row" className={cn(pinnedClass, "border-b pb-1.5 pt-0.5 font-sans text-xs font-medium text-muted-foreground")}>
                Par
              </th>
              {sortedHoles.map((hole) => (
                <td key={hole.id} className="border-b pb-1.5 pt-0.5 text-center text-xs text-muted-foreground">
                  {hole.par}
                </td>
              ))}
              <td className="border-b pb-1.5 pl-2.5 pr-1 pt-0.5 text-right text-xs text-muted-foreground">{totalPar}</td>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={sortedHoles.length + 2} className="py-4 font-sans text-sm text-muted-foreground">
                  No scoring players yet.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const stats = segmentPlayerStats(row.participantId, sortedHoles, scoreLookup);
                const played = stats.thru > 0;

                return (
                  <tr key={row.participantId}>
                    <th
                      scope="row"
                      className={cn(pinnedClass, "h-9 border-b font-sans text-sm font-semibold")}
                      title={row.label}
                    >
                      <span className="flex items-center">
                        <span className={cn("block shrink-0 truncate", nameWidth)}>
                          {namesExpanded ? row.label : shortNames[rowIndex]}
                        </span>
                        <span className={cn(vsParCellClass, "font-mono text-[13px] text-foreground")}>
                          {played ? formatVsPar(stats.vsPar) : "—"}
                        </span>
                      </span>
                    </th>
                    {sortedHoles.map((hole) => {
                      const key = makeScoreLookupKey(row.participantId, hole.id);
                      const strokes = scoreLookup.get(key);
                      const ob = obLookup.get(key) ?? false;
                      const tone = holeScoreTone(strokes, hole.par);

                      return (
                        <td
                          key={hole.id}
                          className={cn("border-b px-px py-[3px]", onHoleSelect && "cursor-pointer")}
                          // Mouse/touch shortcut; the hole number above is the keyboard target.
                          onClick={onHoleSelect ? () => onHoleSelect(hole) : undefined}
                        >
                          <span
                            className={cn(
                              "mx-auto flex h-[30px] w-5 items-center justify-center rounded-[3px] font-semibold",
                              cellToneClass(tone),
                              ob && "shadow-[inset_0_2px_0_0_var(--destructive)]",
                              strokes === undefined && "font-normal text-muted-foreground/60"
                            )}
                            aria-label={
                              strokes === undefined
                                ? `Hole ${hole.hole_number}: not played`
                                : `Hole ${hole.hole_number}: ${strokes}${ob ? ", OB" : ""}`
                            }
                          >
                            {strokes ?? "·"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="border-b pl-2.5 pr-1 text-right text-muted-foreground">
                      {played ? stats.totalStrokes : "—"}
                    </td>
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
