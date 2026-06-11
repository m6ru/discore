"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStartDraftRound } from "./use-start-draft-round";

type Props = {
  layoutId: string;
};

export function CreateRoundForm({ layoutId }: Props) {
  const [roundName, setRoundName] = useState("");
  const { startDraftRound, isSubmitting } = useStartDraftRound(layoutId);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void startDraftRound(roundName);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="round-name">Round name</Label>
        <Input
          id="round-name"
          value={roundName}
          onChange={(event) => setRoundName(event.target.value)}
          placeholder="Practice round, club singles, etc."
          maxLength={80}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Optional — shown at the top while scoring.
        </p>
      </div>
      <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create draft round"}
      </Button>
    </form>
  );
}
