"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Ellipsis, Flag, Table2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { ROUND_HEADER_ACTIONS_ID } from "./round-header-actions-slot";

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

const rowClassName =
  "flex min-h-14 w-full items-center gap-3.5 border-b text-left text-base font-semibold";

/**
 * ⋯ in the round header opens a bottom sheet: round info on top, then the
 * round's actions, with Abandon set apart (it still asks first).
 */
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
  const [abandonOpen, setAbandonOpen] = useState(false);
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

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-xl rounded-b-none border-x-0 border-b-0 px-5 pt-2 shadow-none data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2"
          style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <span className="mx-auto h-1 w-9 rounded-full bg-input" aria-hidden />
          <div className="flex items-start gap-3 border-b pt-4 pb-3.5">
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle className="font-display text-[22px] font-semibold tracking-tight">
                {courseName}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {layoutName} · {holeCount} holes · par{" "}
                <span className="font-mono font-semibold text-foreground">{layoutTotalPar}</span>
                {startingHole > 1 ? (
                  <>
                    {" "}
                    · started on hole{" "}
                    <span className="font-mono font-semibold text-foreground">{startingHole}</span>
                  </>
                ) : null}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-mt-2 -mr-2.5 size-11 shrink-0"
                aria-label="Close"
              >
                <X className="size-[22px]" aria-hidden />
              </Button>
            </DialogClose>
          </div>

          <button type="button" className={rowClassName} onClick={closeThen(onViewScorecard)}>
            <Table2 className="size-[22px] shrink-0" aria-hidden />
            <span className="flex-1">Scorecard</span>
            <ChevronRight className="size-[18px] text-muted-foreground" aria-hidden />
          </button>
          <label className={rowClassName}>
            <span className="flex-1">
              <span className="block">Hide running totals</span>
              <span className="block text-[13px] font-normal text-muted-foreground">
                Only this hole&apos;s strokes show
              </span>
            </span>
            <Switch checked={scoresHidden} onCheckedChange={onToggleScoresHidden} />
          </label>
          {currentHoleNumber !== null ? (
            <button type="button" className={rowClassName} onClick={closeThen(onSuggestFix)}>
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

          <Button
            type="button"
            variant="outline"
            className="mt-5 min-h-13 border-destructive/30 text-base font-semibold text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
            disabled={disabled}
            onClick={closeThen(() => setAbandonOpen(true))}
          >
            Abandon round
          </Button>
          <p className="mt-2 text-center text-[13px] text-muted-foreground">
            Asks before it does anything.
          </p>
        </DialogContent>
      </Dialog>

      <AlertDialog open={abandonOpen} onOpenChange={setAbandonOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon this round?</AlertDialogTitle>
            <AlertDialogDescription>
              Scores won&apos;t be saved to history. You can always start a new round later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setAbandonOpen(false);
                onAbandonRound();
              }}
            >
              Abandon round
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {scorecardDialog}
    </>,
    target
  );
}
