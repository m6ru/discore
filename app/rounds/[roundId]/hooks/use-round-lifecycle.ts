"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { abandonRound, completeRound } from "@/lib/rounds/round-active-actions";
import type { Database } from "@/lib/database.types";
import { toastError } from "@/lib/ui/toast-notify";

type Client = SupabaseClient<Database>;

type Options = {
  supabase: Client;
  roundId: string;
  isScorer: boolean;
  saveCurrentHoleScores: () => Promise<boolean>;
  setIsTransitioning: (value: boolean) => void;
};

export function useRoundLifecycle({
  supabase,
  roundId,
  isScorer,
  saveCurrentHoleScores,
  setIsTransitioning,
}: Options) {
  const router = useRouter();

  const onAbandonRound = useCallback(async () => {
    if (!isScorer) return;
    setIsTransitioning(true);
    const { error } = await abandonRound(supabase, roundId);
    if (error) {
      toastError(`Abandon failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }
    router.push("/");
    router.refresh();
  }, [isScorer, supabase, roundId, setIsTransitioning, router]);

  const onCompleteRound = useCallback(async () => {
    const saved = await saveCurrentHoleScores();
    if (!saved) return;
    setIsTransitioning(true);
    const { error } = await completeRound(supabase, roundId);
    if (error) {
      toastError(`Complete failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }
    router.push("/");
    router.refresh();
  }, [saveCurrentHoleScores, supabase, roundId, setIsTransitioning, router]);

  return { onAbandonRound, onCompleteRound };
}
