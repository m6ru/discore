"use client";

import { ArrowRight } from "lucide-react";
import type { RoundStatus } from "@/lib/rounds/round-status";
import { Button } from "@/components/ui/button";

/** Scroll padding so the players list clears the fixed Start round deck. */
export const DRAFT_SETUP_BOTTOM_INSET = "calc(9rem + env(safe-area-inset-bottom, 0px))";

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
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background px-5 pt-3.5"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto w-full max-w-3xl space-y-2">
        <Button
          type="button"
          className="min-h-14 w-full justify-between px-[18px] text-base font-semibold disabled:bg-border disabled:text-muted-foreground disabled:opacity-100"
          onClick={onStartRound}
          disabled={isTransitioning || hasPendingInvite}
        >
          {isTransitioning ? "Working…" : "Start round"}
          {!hasPendingInvite ? <ArrowRight className="size-5" aria-hidden /> : null}
        </Button>
        {hasPendingInvite ? (
          <p className="text-center text-[13px] text-muted-foreground">
            {formatPendingMessage(pendingInviteLabels)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
