"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ROUND_HEADER_ACTIONS_ID } from "./round-header-actions-slot";

function getHeaderActionsTarget(): HTMLElement | null {
  return document.getElementById(ROUND_HEADER_ACTIONS_ID);
}

type Props = {
  show: boolean;
  isSubmitting: boolean;
  isTransitioning: boolean;
  onAbandonRound: () => void;
  onViewScorecard: () => void;
  onViewInfo: () => void;
  scorecardDialog: ReactNode;
  infoDialog: ReactNode;
};

export function RoundHeaderMenuPortal({
  show,
  isSubmitting,
  isTransitioning,
  onAbandonRound,
  onViewScorecard,
  onViewInfo,
  scorecardDialog,
  infoDialog,
}: Props) {
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

  return createPortal(
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-foreground"
            aria-label="Round menu"
            disabled={disabled}
          >
            <Menu className="size-5" strokeWidth={2} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onViewScorecard}>View scorecard</DropdownMenuItem>
          <DropdownMenuItem onClick={onViewInfo}>See info</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setAbandonOpen(true)}
            disabled={disabled}
          >
            Abandon round
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
      {infoDialog}
    </>,
    target
  );
}
