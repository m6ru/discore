"use client";

import { Button } from "@/components/ui/button";
import { pagePrimaryButtonClassName } from "@/lib/ui/page-chrome";
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
    <Button
      type="button"
      size="lg"
      disabled={isSubmitting}
      className={cn(pagePrimaryButtonClassName, className)}
      onClick={() => void startDraftRound()}
    >
      {isSubmitting ? "Creating..." : label}
    </Button>
  );
}
