"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HoleRow } from "../round-types";

type Props = {
  activeHole: HoleRow | null;
  holesLength: number;
  /**
   * Shows a quiet "Wrong info?" link (observers). The scorer reaches the same
   * sheet from the round menu instead.
   */
  onSuggestFix?: () => void;
};

/** Hole number with Par / Meters beside it, and the hole's note straight under. */
export function ActiveHoleStatus({ activeHole, holesLength, onSuggestFix }: Props) {
  const [noteExpanded, setNoteExpanded] = useState(false);

  if (!activeHole) {
    return null;
  }

  const note = activeHole.notes?.trim();

  return (
    <section className="space-y-3 border-b pb-3.5">
      <div className="flex items-end justify-between gap-4">
        <h2 aria-label={`Hole ${activeHole.hole_number} of ${holesLength}`} className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-muted-foreground">Hole</span>
          <span className="font-display text-[52px] font-semibold leading-none tracking-tight">
            {activeHole.hole_number}
          </span>
        </h2>
        <dl className="flex gap-5 pb-1">
          <div className="flex flex-col items-end gap-0.5">
            <dt className="text-[13px] font-semibold text-muted-foreground">Par</dt>
            <dd className="font-display text-[26px] font-semibold leading-none">{activeHole.par}</dd>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <dt className="text-[13px] font-semibold text-muted-foreground">Meters</dt>
            <dd className="font-display text-[26px] font-semibold leading-none">
              {activeHole.distance_m}
            </dd>
          </div>
        </dl>
      </div>
      {note ? (
        <button
          type="button"
          onClick={() => setNoteExpanded((expanded) => !expanded)}
          aria-expanded={noteExpanded}
          className="flex w-full items-start gap-2 text-left text-sm leading-snug text-foreground/85"
        >
          <Info className="mt-px size-[18px] shrink-0 text-muted-foreground" aria-hidden />
          <span className={cn("min-w-0 flex-1 whitespace-pre-line", !noteExpanded && "line-clamp-2")}>
            {note}
          </span>
        </button>
      ) : null}
      {onSuggestFix ? (
        <button
          type="button"
          onClick={onSuggestFix}
          className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Wrong info?
        </button>
      ) : null}
    </section>
  );
}
