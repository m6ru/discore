"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRoundDisplayName } from "@/lib/rounds/round-display-name";
import { updateRoundName } from "@/lib/rounds/round-draft-actions";
import { toastError } from "@/lib/ui/toast-notify";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { ROUND_HEADER_TITLE_ID } from "./round-header-actions-slot";

const TITLE_TEXT_CLASS = "text-xl font-bold tracking-tight sm:text-2xl";

function getTitleTarget(): HTMLElement | null {
  return document.getElementById(ROUND_HEADER_TITLE_ID);
}

type Props = {
  show: boolean;
  supabase: SupabaseClient<Database>;
  roundId: string;
  roundName: string | null;
  disabled?: boolean;
  onNameChange: (name: string | null) => void;
};

export function DraftRoundTitlePortal({
  show,
  supabase,
  roundId,
  roundName,
  disabled = false,
  onNameChange,
}: Props) {
  const target = useSyncExternalStore(
    () => () => {},
    getTitleTarget,
    () => null
  );
  const displayName = formatRoundDisplayName(roundName);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setValue("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setValue(displayName);
    setEditing(false);
  };

  const saveName = async () => {
    const trimmed = value.trim();
    const nextName = trimmed.length > 0 ? trimmed : null;
    const currentStored = roundName?.trim() || null;

    if (nextName === currentStored) {
      cancelEditing();
      return;
    }

    setIsSaving(true);
    const { error } = await updateRoundName(supabase, roundId, trimmed);
    setIsSaving(false);

    if (error) {
      toastError(`Could not save round name: ${error.message}`);
      cancelEditing();
      return;
    }

    onNameChange(nextName);
    setEditing(false);
  };

  if (!show || !target) {
    return null;
  }

  return createPortal(
    <div className="inline-flex max-w-full min-w-0 items-center gap-1.5">
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => void saveName()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void saveName();
            }
            if (event.key === "Escape") {
              cancelEditing();
            }
          }}
          className={cn(
            TITLE_TEXT_CLASS,
            "min-w-0 w-full max-w-full border-0 bg-transparent p-0 outline-none focus-visible:ring-0"
          )}
          maxLength={80}
          autoFocus
          disabled={disabled || isSaving}
          aria-label="Round name"
        />
      ) : (
        <>
          <h1 className={cn(TITLE_TEXT_CLASS, "min-w-0 truncate")}>{displayName}</h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground"
            onClick={startEditing}
            disabled={disabled || isSaving}
            aria-label="Edit round name"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        </>
      )}
    </div>,
    target
  );
}
