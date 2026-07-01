"use client";

import type { RoundStatus } from "@/lib/rounds/round-status";
import { pagePrimaryButtonClassName } from "@/lib/ui/page-chrome";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-2 pt-2">
      <Button
        type="button"
        size="lg"
        className={pagePrimaryButtonClassName}
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
  );
}
