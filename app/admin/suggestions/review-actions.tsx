"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { SuggestionStatus } from "@/lib/courses/course-suggestions";
import { friendlyError } from "@/lib/ui/friendly-error";
import { toastError, toastSuccess } from "@/lib/ui/toast-notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function useReview(id: string) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);

  async function review(next: SuggestionStatus, ownerNote: string | null) {
    setIsBusy(true);
    const { error } = await supabase
      .from("course_suggestions")
      .update({ status: next, owner_note: ownerNote })
      .eq("id", id);
    setIsBusy(false);
    if (error) {
      toastError(friendlyError("Could not update the suggestion", error));
      return;
    }
    router.refresh();
  }

  return { isBusy, review };
}

export function SuggestionReviewActions({ id, agentPrompt }: { id: string; agentPrompt: string }) {
  const { isBusy, review } = useReview(id);
  const [ownerNote, setOwnerNote] = useState("");

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(agentPrompt);
      toastSuccess("Copied — paste it into Claude Code.");
    } catch {
      toastError("Could not copy. Select the text manually.");
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="min-h-12 w-full border-foreground text-[15px] font-semibold"
        onClick={() => void copyPrompt()}
      >
        <Copy className="size-[18px]" aria-hidden />
        Copy for agent
      </Button>
      <Input
        value={ownerNote}
        maxLength={500}
        onChange={(e) => setOwnerNote(e.target.value)}
        placeholder="Note to the sender"
        aria-label="Note to the sender"
        className="h-12 bg-card text-base"
      />
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          className="min-h-12 text-[15px] font-semibold"
          disabled={isBusy}
          onClick={() => void review("applied", ownerNote.trim() || null)}
        >
          Applied
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-12 text-[15px] font-semibold"
          disabled={isBusy}
          onClick={() => void review("rejected", ownerNote.trim() || null)}
        >
          Not applied
        </Button>
      </div>
    </div>
  );
}

export function MoveBackToNew({ id }: { id: string }) {
  const { isBusy, review } = useReview(id);
  return (
    <button
      type="button"
      disabled={isBusy}
      onClick={() => void review("new", null)}
      className="min-h-9 self-start text-[13px] font-semibold text-primary disabled:opacity-50"
    >
      Move back to new
    </button>
  );
}
