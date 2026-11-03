"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Ellipsis, Flag, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ROUND_HEADER_ACTIONS_ID } from "./round-header-actions-slot";
import { RoundSheet, roundSheetRowClassName } from "./round-sheet";

function getHeaderActionsTarget(): HTMLElement | null {
  return document.getElementById(ROUND_HEADER_ACTIONS_ID);
}

type Props = {
  show: boolean;
  isSubmitting: boolean;
  isTransitioning: boolean;
  courseName: string;
  layoutName: string;
  layoutTotalPar: number;
  holeCount: number;
  startingHole: number;
  /** The hole on screen; offers "Wrong info on hole N?" when set. */
  currentHoleNumber: number | null;
  scoresHidden: boolean;
  onToggleScoresHidden: () => void;
  onAbandonRound: () => void;
  onViewScorecard: () => void;
  onSuggestFix: () => void;
  scorecardDialog: ReactNode;
};

/** ⋯ in the scoring header opens the round sheet. */
export function RoundHeaderMenuPortal({
  show,
  isSubmitting,
  isTransitioning,
  courseName,
  layoutName,
  layoutTotalPar,
  holeCount,
  startingHole,
  currentHoleNumber,
  scoresHidden,
  onToggleScoresHidden,
  onAbandonRound,
  onViewScorecard,
  onSuggestFix,
  scorecardDialog,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const target = useSyncExternalStore(
    () => () => {},
    getHeaderActionsTarget,
    () => null
  );

  if (!show || !target) {
    return null;
  }

  const disabled = isSubmitting || isTransitioning;
  const closeThen = (action: () => void) => () => {
    setSheetOpen(false);
    action();
  };

  return createPortal(
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 text-foreground"
        aria-label="Round menu"
        disabled={disabled}
        onClick={() => setSheetOpen(true)}
      >
        <Ellipsis className="size-6" strokeWidth={2.25} aria-hidden />
      </Button>

      <RoundSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        courseName={courseName}
        details={
          <>
            {layoutName} · {holeCount} holes · par{" "}
            <span className="font-mono font-semibold text-foreground">{layoutTotalPar}</span>
            {startingHole > 1 ? (
              <>
                {" "}
                · started on hole{" "}
                <span className="font-mono font-semibold text-foreground">{startingHole}</span>
              </>
            ) : null}
          </>
        }
        destructive={{
          label: "Abandon round",
          confirmTitle: "Abandon this round?",
          confirmDescription: "Scores won't be saved to history. You can always start a new round later.",
          onConfirm: onAbandonRound,
        }}
        disabled={disabled}
      >
        <button type="button" className={roundSheetRowClassName} onClick={closeThen(onViewScorecard)}>
          <Table2 className="size-[22px] shrink-0" aria-hidden />
          <span className="flex-1">Scorecard</span>
          <ChevronRight className="size-[18px] text-muted-foreground" aria-hidden />
        </button>
        <label className={roundSheetRowClassName}>
          <span className="flex-1">
            <span className="block">Clean card</span>
            <span className="block text-[13px] font-normal text-muted-foreground">
              Hide running totals and your hole history
            </span>
          </span>
          <Switch checked={scoresHidden} onCheckedChange={onToggleScoresHidden} aria-label="Clean card" />
        </label>
        {currentHoleNumber !== null ? (
          <button type="button" className={roundSheetRowClassName} onClick={closeThen(onSuggestFix)}>
            <Flag className="size-[22px] shrink-0" aria-hidden />
            <span className="flex-1">
              <span className="block">Wrong info on hole {currentHoleNumber}?</span>
              <span className="block text-[13px] font-normal text-muted-foreground">
                Fix par, length or the note
              </span>
            </span>
            <ChevronRight className="size-[18px] text-muted-foreground" aria-hidden />
          </button>
        ) : null}
      </RoundSheet>

      {scorecardDialog}
    </>,
    target
  );
}
