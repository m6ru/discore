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
import { friendlyError } from "@/lib/ui/friendly-error";

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
      toastError(friendlyError("Could not save the starting hole", error));
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t pt-3.5">
      <span className="min-w-0">
        <span className="block text-base font-semibold">Starting hole</span>
        <span className="block text-[13px] text-muted-foreground">
          For shotgun starts or a busy first tee
        </span>
      </span>
      <Select
        value={String(startingHole)}
        onValueChange={(next) => void saveStartingHole(next)}
        disabled={disabled || isSaving}
      >
        <SelectTrigger className="min-h-11 w-28 shrink-0 font-mono font-semibold" aria-label="Starting hole">
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
