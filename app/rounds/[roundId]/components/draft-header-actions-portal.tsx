"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUND_HEADER_ACTIONS_ID } from "./round-header-actions-slot";
import { RoundSheet } from "./round-sheet";

function getActionsTarget(): HTMLElement | null {
  return document.getElementById(ROUND_HEADER_ACTIONS_ID);
}

type Props = {
  show: boolean;
  isTransitioning: boolean;
  courseName: string;
  layoutName: string;
  layoutTotalPar: number;
  holeCount: number;
  onDeleteDraft: () => void;
};

/** ✕ in the draft header: the same round sheet, with Delete draft. */
export function DraftHeaderActionsPortal({
  show,
  isTransitioning,
  courseName,
  layoutName,
  layoutTotalPar,
  holeCount,
  onDeleteDraft,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const target = useSyncExternalStore(
    () => () => {},
    getActionsTarget,
    () => null
  );

  if (!show || !target) {
    return null;
  }

  return createPortal(
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-foreground"
        disabled={isTransitioning}
        aria-label="Close or delete this draft"
        onClick={() => setSheetOpen(true)}
      >
        <X className="size-[22px]" strokeWidth={2} aria-hidden />
      </Button>
      <RoundSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        courseName={courseName}
        details={
          <>
            {layoutName} · {holeCount} holes · par{" "}
            <span className="font-mono font-semibold text-foreground">{layoutTotalPar}</span>
          </>
        }
        destructive={{
          // No scores yet, so nothing to lose: the sheet is the one confirm step.
          label: "Delete draft",
          onConfirm: onDeleteDraft,
        }}
        disabled={isTransitioning}
      />
    </>,
    target
  );
}
