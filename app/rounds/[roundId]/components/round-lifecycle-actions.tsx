"use client";

import type { RoundStatus } from "@/lib/rounds/round-status";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "./confirm-action-dialog";

type Props = {
  placement: "setup" | "footer";
  roundStatus: RoundStatus;
  isScorer: boolean;
  isTransitioning: boolean;
  hasPendingInvite: boolean;
  onStartRound: () => void;
  onDeleteDraft: () => void;
  onAbandonRound: () => void;
};

export function RoundLifecycleActions({
  placement,
  roundStatus,
  isScorer,
  isTransitioning,
  hasPendingInvite,
  onStartRound,
  onDeleteDraft,
  onAbandonRound,
}: Props) {
  if (placement === "setup") {
    if (roundStatus !== "draft" || !isScorer) {
      return null;
    }

    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          className="min-h-11 w-full"
          onClick={onStartRound}
          disabled={isTransitioning || hasPendingInvite}
        >
          {isTransitioning ? "Working..." : "Start round"}
        </Button>
        {hasPendingInvite ? (
          <p className="text-center text-xs text-muted-foreground">
            Resolve pending invitations before starting.
          </p>
        ) : null}
        <div className="text-center">
          <ConfirmActionDialog
            title="Delete this draft?"
            description="This removes the round and everyone you invited. You can't bring it back."
            confirmLabel="Delete draft"
            onConfirm={onDeleteDraft}
            disabled={isTransitioning}
            trigger={
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs text-muted-foreground"
                disabled={isTransitioning}
              >
                Delete draft
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (roundStatus !== "active" || !isScorer) {
    return null;
  }

  return (
    <ConfirmActionDialog
      title="Abandon this round?"
      description="Scores won't be saved to history. You can always start a new round later."
      confirmLabel="Abandon round"
      onConfirm={onAbandonRound}
      disabled={isTransitioning}
      trigger={
        <Button type="button" variant="outline" disabled={isTransitioning}>
          {isTransitioning ? "Working..." : "Abandon round"}
        </Button>
      }
    />
  );
}
