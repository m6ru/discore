"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
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
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          disabled={isTransitioning}
          aria-label="Delete draft"
        >
          <X className="size-5" strokeWidth={2} aria-hidden />
        </Button>
      }
    />,
    target
  );
}
