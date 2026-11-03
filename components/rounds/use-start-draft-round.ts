"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDraftRound } from "@/lib/rounds/round-draft-actions";
import {
  loadLocalTrial,
  startLocalTrialFromLayout,
} from "@/lib/local-round";
import { toastError } from "@/lib/ui/toast-notify";

/**
 * `userId` comes from the server page (getClaims), so a tap needs no Auth
 * round trip; null starts a signed-out trial. A session that expired since the
 * page rendered fails at the insert (RLS) and shows the error toast.
 */
export function useStartDraftRound(layoutId: string, userId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startDraftRound = useCallback(async (roundName?: string) => {
    setIsSubmitting(true);

    try {
      if (!userId) {
        const existing = loadLocalTrial();
        if (existing?.status === "setup" || existing?.status === "active") {
          router.push("/rounds/trial");
          return;
        }

        const created = await startLocalTrialFromLayout(supabase, layoutId);
        if (!created.ok) {
          toastError(created.message);
          return;
        }

        router.push("/rounds/trial");
        return;
      }

      const result = await createDraftRound(supabase, layoutId, userId, roundName);

      if (!result.ok) {
        if (result.existingRoundId) {
          router.push(`/rounds/${result.existingRoundId}`);
          router.refresh();
          return;
        }
        toastError(result.message);
        return;
      }

      // A new URL is never in the client cache, and no other page shows
      // drafts, so no refresh (it would render the round page twice).
      router.push(`/rounds/${result.roundId}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [layoutId, userId, router, supabase]);

  return { startDraftRound, isSubmitting };
}
