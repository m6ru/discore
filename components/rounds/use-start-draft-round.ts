"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDraftRound } from "@/lib/rounds/round-draft-actions";
import { toastError } from "@/lib/ui/toast-notify";

export function useStartDraftRound(layoutId: string) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startDraftRound = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        toastError(`Session check failed: ${userError.message}`);
        return;
      }

      if (!user) {
        router.push("/auth?message=Please+sign+in+to+continue");
        return;
      }

      const result = await createDraftRound(supabase, layoutId, user.id);

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
