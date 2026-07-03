"use client";

import Link from "next/link";
import { useStartDraftRound } from "@/components/rounds/use-start-draft-round";
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

function formatLayoutMeta(layout: CourseLayoutOption): string {
  const parts = [
    layout.holeCount > 0 ? formatHoleCount(layout.holeCount) : null,
    `Par ${layout.totalPar}`,
  ].filter(Boolean);
  return parts.join(" · ");
}

function LayoutStartCard({ layout }: { layout: CourseLayoutOption }) {
  const { startDraftRound, isSubmitting } = useStartDraftRound(layout.id);

  return (
    <li className="overflow-hidden rounded-lg border">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void startDraftRound()}
        className={cn(
          "block w-full px-4 py-3 text-left transition-colors",
          "hover:bg-muted/50 disabled:pointer-events-none disabled:opacity-60"
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-medium">
            {isSubmitting ? "Creating..." : layout.name}
          </p>
          <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
            {layout.totalDistanceM.toLocaleString()} m
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {formatLayoutMeta(layout)}
        </p>
      </button>
      {layout.mapUrl ? (
        <div className="border-t px-4 py-2">
          <Link
            href={layout.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Layout map
          </Link>
        </div>
      ) : null}
    </li>
  );
}

export function CourseLayoutPicker({ layouts }: Props) {
  if (layouts.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {layouts.map((layout) => (
        <LayoutStartCard key={layout.id} layout={layout} />
      ))}
    </ul>
  );
}
