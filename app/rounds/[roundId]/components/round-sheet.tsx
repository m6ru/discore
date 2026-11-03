"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
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

export const roundSheetRowClassName =
  "flex min-h-14 w-full items-center gap-3.5 border-b text-left text-base font-semibold";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  /** Layout, holes, par, … under the course name. */
  details: ReactNode;
  /** The round's actions, as rows. */
  children?: ReactNode;
  /**
   * Set apart at the bottom in red. With `confirm` it asks first (something
   * is lost for good); without, the tap does it.
   */
  destructive: {
    label: string;
    hint?: string;
    confirm?: { title: string; description: string };
    onConfirm: () => void;
  };
  disabled?: boolean;
};

/**
 * Bottom sheet for a round (draft or active): round info on top, actions as
 * rows, and the one destructive action set apart. Within thumb reach.
 */
export function RoundSheet({
  open,
  onOpenChange,
  courseName,
  details,
  children,
  destructive,
  disabled = false,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
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
              <DialogDescription className="text-sm text-muted-foreground">{details}</DialogDescription>
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

          {children}

          <Button
            type="button"
            variant="outline"
            className="mt-5 min-h-13 border-destructive/30 text-base font-semibold text-destructive shadow-none hover:bg-destructive/5 hover:text-destructive"
            disabled={disabled}
            onClick={() => {
              onOpenChange(false);
              if (destructive.confirm) {
                setConfirmOpen(true);
              } else {
                destructive.onConfirm();
              }
            }}
          >
            {destructive.label}
          </Button>
          {destructive.hint ? (
            <p className="mt-2 text-center text-[13px] text-muted-foreground">{destructive.hint}</p>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{destructive.confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{destructive.confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                destructive.onConfirm();
              }}
            >
              {destructive.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
