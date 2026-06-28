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

const selectedLayoutClassName =
  "border-primary bg-primary/10 font-medium text-foreground";
const layoutRowClassName =
  "block w-full rounded-md border border-transparent px-4 py-3 text-left text-sm transition-colors";

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

function SelectedLayoutName({ name }: { name: string }) {
  return (
    <p className={cn(layoutRowClassName, selectedLayoutClassName, "cursor-default")}>
      {name}
    </p>
  );
}

export function CourseLayoutPicker({ layouts }: Props) {
  const [selectedId, setSelectedId] = useState(layouts[0]?.id ?? "");
  const selected =
    layouts.find((layout) => layout.id === selectedId) ?? layouts[0] ?? null;
  const singleLayout = layouts.length === 1;

  if (!selected) {
    return null;
  }

  return (
    <div className="rounded-lg border">
      <div
        className="space-y-2 p-2"
        role={singleLayout ? undefined : "tablist"}
        aria-label={singleLayout ? undefined : "Course layouts"}
      >
        {singleLayout ? (
          <SelectedLayoutName name={layouts[0].name} />
        ) : (
          layouts.map((layout) => {
            const active = layout.id === selected.id;
            return (
              <button
                key={layout.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  layoutRowClassName,
                  active
                    ? selectedLayoutClassName
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => setSelectedId(layout.id)}
              >
                {layout.name}
              </button>
            );
          })
        )}
      </div>
      <div className="border-t border-border" role={singleLayout ? undefined : "tabpanel"}>
        <LayoutDetailPanel layout={selected} />
      </div>
    </div>
  );
}
