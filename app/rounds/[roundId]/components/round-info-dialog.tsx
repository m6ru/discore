"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRoundDisplayName } from "@/lib/rounds/round-display-name";
import { formatStatusLabel } from "@/lib/rounds/format-round-status";
import type { RoundStatus } from "@/lib/rounds/round-status";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundName: string | null;
  courseName: string;
  layoutName: string;
  holeCount: number;
  layoutTotalPar: number;
  startingHole: number;
  roundStatus: RoundStatus;
};

export function RoundInfoDialog({
  open,
  onOpenChange,
  roundName,
  courseName,
  layoutName,
  holeCount,
  layoutTotalPar,
  startingHole,
  roundStatus,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Round info</DialogTitle>
          <DialogDescription>Course, layout, and round details.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="font-medium">{formatRoundDisplayName(roundName)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Course</dt>
            <dd className="font-medium">{courseName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Layout</dt>
            <dd className="font-medium">{layoutName}</dd>
          </div>
          <div className="flex gap-6">
            <div>
              <dt className="text-muted-foreground">Holes</dt>
              <dd className="font-medium tabular-nums">{holeCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Par</dt>
              <dd className="font-medium tabular-nums">{layoutTotalPar}</dd>
            </div>
            {startingHole > 1 ? (
              <div>
                <dt className="text-muted-foreground">Start</dt>
                <dd className="font-medium tabular-nums">Hole {startingHole}</dd>
              </div>
            ) : null}
          </div>
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{formatStatusLabel(roundStatus)}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
