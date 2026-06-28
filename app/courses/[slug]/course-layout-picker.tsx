"use client";

import { useState } from "react";
import Link from "next/link";
import { StartRoundButton } from "@/components/rounds/start-round-button";
import { cn } from "@/lib/utils";

export type CourseLayoutOption = {
  id: string;
  name: string;
  holeCount: number;
  totalPar: number;
  totalDistanceM: number;
  mapUrl: string | null;
};

type Props = {
  layouts: CourseLayoutOption[];
};

/** Long Estonian layout names need a stacked list instead of a tab row. */
const STACKED_NAME_LENGTH = 22;

const tabBaseClassName =
  "border-b-2 text-sm font-medium transition-colors";

const tabActiveClassName = "border-primary text-foreground";
const tabInactiveClassName =
  "border-transparent text-muted-foreground hover:text-foreground";

function formatHoleCount(count: number): string {
  return count === 1 ? "1 hole" : `${count} holes`;
}

function formatLayoutStats(layout: CourseLayoutOption): string {
  const parts = [
    layout.holeCount > 0 ? formatHoleCount(layout.holeCount) : null,
    `Par ${layout.totalPar}`,
    `${layout.totalDistanceM.toLocaleString()} m`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function useStackedLayoutNames(layouts: CourseLayoutOption[]): boolean {
  return layouts.some((layout) => layout.name.length > STACKED_NAME_LENGTH);
}

function LayoutDetailPanel({ layout }: { layout: CourseLayoutOption }) {
  return (
    <div className="space-y-4 p-4 pt-3">
      <p className="font-mono text-sm tabular-nums text-muted-foreground">
        {formatLayoutStats(layout)}
      </p>
      {layout.mapUrl ? (
        <Link
          href={layout.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-primary underline underline-offset-4"
        >
          Layout map
        </Link>
      ) : null}
      <StartRoundButton
        layoutId={layout.id}
        className="w-full sm:w-auto [&>button]:w-full sm:[&>button]:w-auto"
      />
    </div>
  );
}

function LayoutNameTab({
  layout,
  active,
  stacked,
  onSelect,
}: {
  layout: CourseLayoutOption;
  active: boolean;
  stacked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "text-sm font-medium transition-colors",
        stacked
          ? cn(
              "block w-full border-l-2 px-4 py-3 text-left",
              active
                ? "border-l-primary bg-muted/30 text-foreground"
                : "border-l-transparent text-muted-foreground hover:text-foreground"
            )
          : cn(
              tabBaseClassName,
              active ? tabActiveClassName : tabInactiveClassName,
              "shrink-0 px-3 py-2.5"
            )
      )}
      onClick={onSelect}
    >
      {layout.name}
    </button>
  );
}

export function CourseLayoutPicker({ layouts }: Props) {
  const [selectedId, setSelectedId] = useState(layouts[0]?.id ?? "");
  const selected =
    layouts.find((layout) => layout.id === selectedId) ?? layouts[0] ?? null;
  const stacked = useStackedLayoutNames(layouts);
  const singleLayout = layouts.length === 1;

  if (!selected) {
    return null;
  }

  return (
    <div className="rounded-lg border">
      <div
        className={cn(
          "border-b border-border",
          singleLayout && "px-4",
          !singleLayout && stacked && "flex flex-col",
          !singleLayout && !stacked && "flex flex-wrap gap-x-1 px-1"
        )}
        role={singleLayout ? undefined : "tablist"}
        aria-label={singleLayout ? undefined : "Course layouts"}
      >
        {singleLayout ? (
          <p
            className={cn(
              tabBaseClassName,
              tabActiveClassName,
              "cursor-default py-2.5"
            )}
          >
            {layouts[0].name}
          </p>
        ) : (
          layouts.map((layout) => (
            <LayoutNameTab
              key={layout.id}
              layout={layout}
              active={layout.id === selected.id}
              stacked={stacked}
              onSelect={() => setSelectedId(layout.id)}
            />
          ))
        )}
      </div>
      <div role={singleLayout ? undefined : "tabpanel"}>
        <LayoutDetailPanel layout={selected} />
      </div>
    </div>
  );
}
