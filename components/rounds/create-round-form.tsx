"use client";

import { Button } from "@/components/ui/button";
import { useStartDraftRound } from "./use-start-draft-round";

type Props = {
  layoutId: string;
};

export function CreateRoundForm({ layoutId }: Props) {
  const { startDraftRound, isSubmitting } = useStartDraftRound(layoutId);

  return (
    <Button
      type="button"
      className="min-h-11 w-full"
      disabled={isSubmitting}
      onClick={() => void startDraftRound()}
    >
      {isSubmitting ? "Creating..." : "Create draft round"}
    </Button>
  );
}
