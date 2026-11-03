"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
  /** Signed-in user from the server page; null starts a trial. */
  userId: string | null;
};

function formatHoleCount(count: number): string {
  return count === 1 ? "1 hole" : `${count} holes`;
}

function formatLayoutMeta(layout: CourseLayoutOption): string {
  return [
    layout.holeCount > 0 ? formatHoleCount(layout.holeCount) : null,
    `par ${layout.totalPar}`,
    layout.totalDistanceM > 0 ? `${layout.totalDistanceM.toLocaleString()} m` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The whole framed row starts a draft; the forest square is its visual cue. */
function LayoutStartCard({ layout, userId }: { layout: CourseLayoutOption; userId: string | null }) {
  const { startDraftRound, isSubmitting } = useStartDraftRound(layout.id, userId);

  return (
    <li className="overflow-hidden rounded-md border bg-card">
      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => void startDraftRound()}
        className={cn(
          "flex w-full items-center gap-3 py-3 pr-3 pl-4 text-left transition-colors",
          "hover:bg-accent/60 disabled:pointer-events-none disabled:opacity-60"
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold">
            {isSubmitting ? "Creating…" : layout.name}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[13px] text-muted-foreground">
            {formatLayoutMeta(layout)}
          </span>
        </span>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ArrowRight className="size-5" aria-hidden />
        </span>
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

export function CourseLayoutPicker({ layouts, userId }: Props) {
  if (layouts.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {layouts.map((layout) => (
        <LayoutStartCard key={layout.id} layout={layout} userId={userId} />
      ))}
    </ul>
  );
}
