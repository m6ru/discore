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

export function useStartDraftRound(layoutId: string) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startDraftRound = useCallback(async (roundName?: string) => {
    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // Unsigned players have no session; getUser() reports that as an error.
      if (!user) {
        const existing = loadLocalTrial();
        if (existing?.status === "active") {
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

      if (userError) {
        toastError(`Session check failed: ${userError.message}`);
        return;
      }

      const result = await createDraftRound(supabase, layoutId, user.id, roundName);

      if (!result.ok) {
        if (result.existingRoundId) {
          router.push(`/rounds/${result.existingRoundId}`);
          router.refresh();
          return;
        }
        toastError(result.message);
        return;
      }

      router.push(`/rounds/${result.roundId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }, [layoutId, router, supabase]);

  return { startDraftRound, isSubmitting };
}
