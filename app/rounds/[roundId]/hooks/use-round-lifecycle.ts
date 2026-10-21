"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { abandonRound, completeRound } from "@/lib/rounds/round-active-actions";
import type { Database } from "@/lib/database.types";
import { toastError } from "@/lib/ui/toast-notify";
import type { SyncPhase } from "./use-score-sync";
import { friendlyError } from "@/lib/ui/friendly-error";

type Client = SupabaseClient<Database>;

type Options = {
  supabase: Client;
  roundId: string;
  isScorer: boolean;
  saveCurrentHoleScores: () => boolean;
  flushScores: () => Promise<SyncPhase>;
  discardPendingScores: () => void;
  setIsTransitioning: (value: boolean) => void;
  onCompleted?: () => void;
};

export function useRoundLifecycle({
  supabase,
  roundId,
  isScorer,
  saveCurrentHoleScores,
  flushScores,
  discardPendingScores,
  setIsTransitioning,
  onCompleted,
}: Options) {
  const router = useRouter();

  const onAbandonRound = useCallback(async () => {
    if (!isScorer) return;
    setIsTransitioning(true);
    const { error } = await abandonRound(supabase, roundId);
    if (error) {
      toastError(friendlyError("Could not abandon the round", error));
      setIsTransitioning(false);
      return;
    }
    discardPendingScores();
    router.push("/");
    router.refresh();
  }, [isScorer, supabase, roundId, setIsTransitioning, discardPendingScores, router]);

  // Completing needs signal: every score must be on the server first.
  const onCompleteRound = useCallback(async () => {
    const saved = saveCurrentHoleScores();
    if (!saved) return;
    setIsTransitioning(true);
    const phase = await flushScores();
    if (phase !== "synced") {
      if (phase === "waiting") {
        toastError(
          "No signal. Your scores are saved on this phone — complete the round once you're back online."
        );
      }
      setIsTransitioning(false);
      return;
    }
    const { error } = await completeRound(supabase, roundId);
    if (error) {
      toastError(friendlyError("Could not complete the round", error));
      setIsTransitioning(false);
      return;
    }
    onCompleted?.();
    router.refresh();
    setIsTransitioning(false);
  }, [saveCurrentHoleScores, flushScores, supabase, roundId, setIsTransitioning, router, onCompleted]);

  return { onAbandonRound, onCompleteRound };
}
