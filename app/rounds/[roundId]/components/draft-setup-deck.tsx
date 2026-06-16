"use client";

import type { RoundStatus } from "@/lib/rounds/round-status";
import { Button } from "@/components/ui/button";

/** Scroll padding so content clears the fixed draft setup deck. */
export const DRAFT_SETUP_BOTTOM_INSET =
  "calc(5.5rem + env(safe-area-inset-bottom, 0px))";

type Props = {
  roundStatus: RoundStatus;
  isScorer: boolean;
  isTransitioning: boolean;
  hasPendingInvite: boolean;
  pendingInviteLabels: string[];
  onStartRound: () => void;
};

function formatPendingMessage(labels: string[]): string {
  if (labels.length === 0) {
    return "Resolve pending invitations before starting.";
  }
  if (labels.length === 1) {
    return `Waiting for ${labels[0]} to accept.`;
  }
  if (labels.length === 2) {
    return `Waiting for ${labels[0]} and ${labels[1]} to accept.`;
  }
  return `Waiting for ${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)} to accept.`;
}

export function DraftSetupDeck({
  roundStatus,
  isScorer,
  isTransitioning,
  hasPendingInvite,
  pendingInviteLabels,
  onStartRound,
}: Props) {
  if (roundStatus !== "draft" || !isScorer) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
        <Button
          type="button"
          size="lg"
          className="min-h-11 w-full rounded-xl"
          onClick={onStartRound}
          disabled={isTransitioning || hasPendingInvite}
        >
          {isTransitioning ? "Working..." : "Start round"}
        </Button>
        {hasPendingInvite ? (
          <p className="text-center text-xs text-muted-foreground">
            {formatPendingMessage(pendingInviteLabels)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
