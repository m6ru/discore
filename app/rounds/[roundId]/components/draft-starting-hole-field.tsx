"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateRoundStartingHole } from "@/lib/rounds/round-draft-actions";
import { toastError } from "@/lib/ui/toast-notify";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Props = {
  supabase: SupabaseClient<Database>;
  roundId: string;
  holeNumbers: number[];
  startingHole: number;
  disabled?: boolean;
  onStartingHoleChange: (hole: number) => void;
};

export function DraftStartingHoleField({
  supabase,
  roundId,
  holeNumbers,
  startingHole,
  disabled = false,
  onStartingHoleChange,
}: Props) {
  const [isSaving, setIsSaving] = useState(false);

  const saveStartingHole = async (nextValue: string) => {
    const parsed = Number(nextValue);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed === startingHole) {
      return;
    }

    const previousHole = startingHole;
    onStartingHoleChange(parsed);
    setIsSaving(true);
    const { error } = await updateRoundStartingHole(supabase, roundId, parsed);
    setIsSaving(false);

    if (error) {
      onStartingHoleChange(previousHole);
      toastError(`Could not save starting hole: ${error.message}`);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-sm text-muted-foreground">Starting from:</span>
      <Select
        value={String(startingHole)}
        onValueChange={(next) => void saveStartingHole(next)}
        disabled={disabled || isSaving}
      >
        <SelectTrigger className="min-h-10 flex-1" aria-label="Starting hole">
          <SelectValue placeholder="Hole 1" />
        </SelectTrigger>
        <SelectContent>
          {holeNumbers.map((holeNumber) => (
            <SelectItem key={holeNumber} value={String(holeNumber)}>
              Hole {holeNumber}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
