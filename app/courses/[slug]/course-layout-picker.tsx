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

function LayoutActionPanel({ layout }: { layout: CourseLayoutOption }) {
  return (
    <div className="space-y-4">
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
      <StartRoundButton layoutId={layout.id} />
    </div>
  );
}

export function CourseLayoutPicker({ layouts }: Props) {
  const [selectedId, setSelectedId] = useState(layouts[0]?.id ?? "");
  const selected =
    layouts.find((layout) => layout.id === selectedId) ?? layouts[0] ?? null;

  if (!selected) {
    return null;
  }

  if (layouts.length === 1) {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <p className="font-medium">{layouts[0].name}</p>
        <LayoutActionPanel layout={selected} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <div role="tablist" aria-label="Course layouts" className="divide-y divide-border">
        {layouts.map((layout) => {
          const active = layout.id === selected.id;
          return (
            <button
              key={layout.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "block w-full border-l-4 px-4 py-3 text-left text-sm transition-colors",
                active
                  ? "border-l-primary bg-primary/5 font-medium text-foreground"
                  : "border-l-transparent text-muted-foreground"
              )}
              onClick={() => setSelectedId(layout.id)}
            >
              {layout.name}
            </button>
          );
        })}
      </div>
      <div className="space-y-4 border-t border-border p-4" role="tabpanel">
        <LayoutActionPanel layout={selected} />
      </div>
    </div>
  );
}
