"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function RoundScorecardDialog({ open, onOpenChange, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-0 right-0 left-0 mx-auto flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 pt-[env(safe-area-inset-top,0px)] shadow-xl data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-3xl sm:rounded-b-xl sm:border-x sm:border-b"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-2 pr-12 text-left">
          <DialogTitle className="text-base">Scorecard</DialogTitle>
          <DialogDescription className="sr-only">Full round scorecard</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
