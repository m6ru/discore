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
      <DialogContent className="flex max-h-[85vh] max-w-[min(100vw-2rem,48rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle>Scorecard</DialogTitle>
          <DialogDescription className="sr-only">Full round scorecard</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
