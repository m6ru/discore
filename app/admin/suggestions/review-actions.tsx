"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SuggestionStatus } from "@/lib/courses/course-suggestions";
import { friendlyError } from "@/lib/ui/friendly-error";
import { toastError, toastSuccess } from "@/lib/ui/toast-notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  id: string;
  status: SuggestionStatus;
  agentPrompt: string;
};

export function SuggestionReviewActions({ id, status, agentPrompt }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [ownerNote, setOwnerNote] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  async function review(next: SuggestionStatus) {
    setIsBusy(true);
    const { error } = await supabase
      .from("course_suggestions")
      .update({ status: next, owner_note: next === "new" ? null : ownerNote.trim() || null })
      .eq("id", id);
    setIsBusy(false);
    if (error) {
      toastError(friendlyError("Could not update the suggestion", error));
      return;
    }
    router.refresh();
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(agentPrompt);
      toastSuccess("Copied — paste it into Claude Code.");
    } catch {
      toastError("Could not copy. Select the text manually.");
    }
  }

  if (status !== "new") {
    return (
      <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => void review("new")}>
        Move back to new
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="min-h-10 w-full" onClick={() => void copyPrompt()}>
        Copy for agent
      </Button>
      <Input
        value={ownerNote}
        maxLength={500}
        onChange={(e) => setOwnerNote(e.target.value)}
        placeholder="Note to the sender (optional)"
        aria-label="Note to the sender"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          className="min-h-10 flex-1"
          disabled={isBusy}
          onClick={() => void review("applied")}
        >
          Applied
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-10 flex-1"
          disabled={isBusy}
          onClick={() => void review("rejected")}
        >
          Not applied
        </Button>
      </div>
    </div>
  );
}
