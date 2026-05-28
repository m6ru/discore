"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { abandonRound, completeRound } from "@/lib/rounds/round-active-actions";
import type { Database } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

type Options = {
  supabase: Client;
  roundId: string;
  isScorer: boolean;
  saveCurrentHoleScores: () => Promise<boolean>;
  setStatus: (message: string | null) => void;
  setIsTransitioning: (value: boolean) => void;
};

export function useRoundLifecycle({
  supabase,
  roundId,
  isScorer,
  saveCurrentHoleScores,
  setStatus,
  setIsTransitioning,
}: Options) {
  const router = useRouter();

  const onAbandonRound = useCallback(async () => {
    if (!isScorer) return;
    if (!window.confirm("Abandon this round?")) return;
    setIsTransitioning(true);
    setStatus(null);
    const { error } = await abandonRound(supabase, roundId);
    if (error) {
      setStatus(`Abandon failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }
    router.push("/");
    router.refresh();
  }, [isScorer, supabase, roundId, setStatus, setIsTransitioning, router]);

  const onCompleteRound = useCallback(async () => {
    if (!window.confirm("Complete this round?")) return;
    const saved = await saveCurrentHoleScores();
    if (!saved) return;
    setIsTransitioning(true);
    setStatus(null);
    const { error } = await completeRound(supabase, roundId);
    if (error) {
      setStatus(`Complete failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }
    router.push("/");
    router.refresh();
  }, [saveCurrentHoleScores, supabase, roundId, setStatus, setIsTransitioning, router]);

  return { onAbandonRound, onCompleteRound };
}
