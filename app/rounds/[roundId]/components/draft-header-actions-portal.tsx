"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { ROUND_HEADER_ACTIONS_ID } from "./round-header-actions-slot";

function getActionsTarget(): HTMLElement | null {
  return document.getElementById(ROUND_HEADER_ACTIONS_ID);
}

type Props = {
  show: boolean;
  isTransitioning: boolean;
  onDeleteDraft: () => void;
};

export function DraftHeaderActionsPortal({
  show,
  isTransitioning,
  onDeleteDraft,
}: Props) {
  const target = useSyncExternalStore(
    () => () => {},
    getActionsTarget,
    () => null
  );

  if (!show || !target) {
    return null;
  }

  return createPortal(
    <ConfirmActionDialog
      title="Delete this draft?"
      description="This removes the round and everyone you invited. You can't bring it back."
      confirmLabel="Delete draft"
      onConfirm={onDeleteDraft}
      disabled={isTransitioning}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          disabled={isTransitioning}
        >
          Delete draft
        </Button>
      }
    />,
    target
  );
}
