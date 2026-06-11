"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStartDraftRound } from "./use-start-draft-round";

type Props = {
  layoutId: string;
  label?: string;
  className?: string;
};

export function StartRoundButton({
  layoutId,
  label = "Start round",
  className,
}: Props) {
  const { startDraftRound, isSubmitting } = useStartDraftRound(layoutId);

  return (
    <div className={cn(className)}>
      <Button type="button" disabled={isSubmitting} onClick={() => void startDraftRound()}>
        {isSubmitting ? "Creating..." : label}
      </Button>
    </div>
  );
}
