"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateRoundName } from "@/lib/rounds/round-draft-actions";
import { toastError } from "@/lib/ui/toast-notify";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

type Props = {
  supabase: SupabaseClient<Database>;
  roundId: string;
  initialName: string | null;
  disabled?: boolean;
  onNameChange: (name: string | null) => void;
};

export function DraftRoundNameField({
  supabase,
  roundId,
  initialName,
  disabled = false,
  onNameChange,
}: Props) {
  const [value, setValue] = useState(initialName ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const saveName = async (nextValue: string) => {
    setIsSaving(true);
    const trimmed = nextValue.trim();
    const { error } = await updateRoundName(supabase, roundId, trimmed);
    setIsSaving(false);

    if (error) {
      toastError(`Could not save round name: ${error.message}`);
      return;
    }

    onNameChange(trimmed.length > 0 ? trimmed : null);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="draft-round-name">Round name</Label>
      <Input
        id="draft-round-name"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => void saveName(value)}
        placeholder="Practice round, club singles, etc."
        maxLength={80}
        disabled={disabled || isSaving}
      />
    </div>
  );
}
