"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStartDraftRound } from "./use-start-draft-round";

type Props = {
  layoutId: string;
  label?: string;
  className?: string;
  errorClassName?: string;
};

export function StartRoundButton({
  layoutId,
  label = "Start round",
  className,
  errorClassName,
}: Props) {
  const { startDraftRound, isSubmitting, error } = useStartDraftRound(layoutId);

  return (
    <div className={className}>
      <Button type="button" disabled={isSubmitting} onClick={() => void startDraftRound()}>
        {isSubmitting ? "Creating..." : label}
      </Button>
      {error ? (
        <p
          className={cn(
            "mt-2 rounded-md border bg-muted p-2 text-xs text-muted-foreground",
            errorClassName
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
