"use client";

import type { ReactNode } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "./confirm-action-dialog";

/** Scroll padding so content clears the fixed bottom completion deck. */
export const ROUND_COMPLETE_BOTTOM_INSET =
  "calc(6.5rem + env(safe-area-inset-bottom, 0px))";

type Props = {
  isSubmitting: boolean;
  isTransitioning: boolean;
  /** The last hole in play order, which the back button returns to. */
  lastHoleNumber: number;
  onBackToLastHole: () => void;
  onCompleteRound: () => void;
  /** Rendered just above the bottom deck. */
  syncBadge?: ReactNode;
};

export function RoundCompleteActions({
  isSubmitting,
  isTransitioning,
  lastHoleNumber,
  onBackToLastHole,
  onCompleteRound,
  syncBadge,
}: Props) {
  const disabled = isSubmitting || isTransitioning;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-5 pt-3.5 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
    >
      {syncBadge}
      <div className="mx-auto grid w-full max-w-3xl grid-cols-[96px_minmax(0,1fr)] gap-2.5">
        <Button
          type="button"
          variant="outline"
          className="min-h-14 gap-1.5 text-[15px] font-semibold"
          disabled={disabled}
          onClick={onBackToLastHole}
        >
          <ChevronLeft className="size-[18px]" aria-hidden />
          Hole {lastHoleNumber}
        </Button>
        <ConfirmActionDialog
          title="Confirm the round?"
          description="Scores can't be changed after this."
          confirmLabel="Confirm"
          cancelLabel="Back to card"
          sideBySide
          confirmVariant="default"
          onConfirm={onCompleteRound}
          disabled={disabled}
          trigger={
            <Button
              type="button"
              className="min-h-14 justify-between px-[18px] text-base font-semibold"
              disabled={disabled}
            >
              {isTransitioning ? "Working..." : "Confirm round"}
              <Check className="size-5" aria-hidden />
            </Button>
          }
        />
      </div>
    </div>
  );
}
