"use client";

import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "./confirm-action-dialog";

/** Scroll padding so content clears the fixed bottom completion deck. */
export const ROUND_COMPLETE_BOTTOM_INSET =
  "calc(8rem + env(safe-area-inset-bottom, 0px))";

type Props = {
  isSubmitting: boolean;
  isTransitioning: boolean;
  onEditScores: () => void;
  onCompleteRound: () => void;
};

export function RoundCompleteActions({
  isSubmitting,
  isTransitioning,
  onEditScores,
  onCompleteRound,
}: Props) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-11 w-full rounded-xl"
          disabled={isSubmitting || isTransitioning}
          onClick={onEditScores}
        >
          Edit scores
        </Button>
        <ConfirmActionDialog
          title="End this round?"
          description="Final scores will be saved for everyone. You'll find this round in your history."
          confirmLabel="Complete round"
          confirmVariant="default"
          onConfirm={onCompleteRound}
          disabled={isSubmitting || isTransitioning}
          trigger={
            <Button
              type="button"
              size="lg"
              className="min-h-11 w-full rounded-xl"
              disabled={isSubmitting || isTransitioning}
            >
              {isTransitioning ? "Working..." : "Confirm and end round"}
            </Button>
          }
        />
      </div>
    </div>
  );
}
