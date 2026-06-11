"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { ROUND_HEADER_ACTIONS_ID } from "./round-header-actions-slot";

function getHeaderActionsTarget(): HTMLElement | null {
  return document.getElementById(ROUND_HEADER_ACTIONS_ID);
}

type Props = {
  show: boolean;
  isSubmitting: boolean;
  isTransitioning: boolean;
  onAbandonRound: () => void;
};

export function RoundHeaderAbandonPortal({
  show,
  isSubmitting,
  isTransitioning,
  onAbandonRound,
}: Props) {
  const target = useSyncExternalStore(
    () => () => {},
    getHeaderActionsTarget,
    () => null
  );

  if (!show || !target) {
    return null;
  }

  return createPortal(
    <ConfirmActionDialog
      title="Abandon this round?"
      description="Scores won't be saved to history. You can always start a new round later."
      confirmLabel="Abandon round"
      onConfirm={onAbandonRound}
      disabled={isSubmitting || isTransitioning}
      trigger={
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 text-xs text-muted-foreground"
          disabled={isSubmitting || isTransitioning}
        >
          {isTransitioning ? "Working..." : "Abandon round"}
        </Button>
      }
    />,
    target
  );
}
