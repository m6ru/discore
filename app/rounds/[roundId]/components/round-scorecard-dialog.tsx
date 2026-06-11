"use client";

import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
        showCloseButton={false}
        className="top-0 right-0 left-0 mx-auto flex h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-xl data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-3xl sm:rounded-b-xl sm:border-x sm:border-b"
      >
        <header className="shrink-0 border-b px-4 pt-4 pb-4 sm:px-8 sm:pt-8">
          <div className="flex items-start justify-between gap-3">
            <DialogHeader className="min-w-0 flex-1 gap-0 p-0 text-left">
              <DialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                Scorecard
              </DialogTitle>
              <DialogDescription className="sr-only">Full round scorecard</DialogDescription>
            </DialogHeader>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-9 shrink-0"
                aria-label="Close scorecard"
              >
                <XIcon className="size-4" aria-hidden />
              </Button>
            </DialogClose>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
