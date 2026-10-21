"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import {
  addPendingScores,
  countPendingHoles,
  isRetryableSaveError,
  readPendingScores,
  removeSyncedScores,
  writePendingScores,
  type PendingScore,
  type PendingScores,
} from "@/lib/rounds/pending-scores";
import {
  parseUpsertedHoleScores,
  upsertHoleScores,
} from "@/lib/rounds/round-active-actions";
import type { Database } from "@/lib/database.types";
import { SAVE_SCORES_TOAST_ID, toastSaveError } from "@/lib/ui/toast-notify";
import type { HoleScoreRow } from "../round-types";
import { friendlyError } from "@/lib/ui/friendly-error";

type Client = SupabaseClient<Database>;

/** synced: nothing waiting · waiting: offline/slow, retrying · failed: the database refused. */
export type SyncPhase = "synced" | "waiting" | "failed";

const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 30_000];
const REQUEST_TIMEOUT_MS = 15_000;

type Options = {
  supabase: Client;
  roundId: string;
  /** Only the scorer of an active round sends scores. */
  enabled: boolean;
  onSynced: (rows: HoleScoreRow[]) => void;
};

/**
 * Optimistic score saving (BLUEPRINT §3a). Saves land in a per-round queue in
 * localStorage first; this hook sends them in the background, retries on
 * network trouble, and resumes after a reload. Single writer + upsert on
 * participant × hole means re-sending is always safe.
 */
export function useScoreSync({ supabase, roundId, enabled, onSynced }: Options) {
  const [pending, setPendingState] = useState<PendingScores>({});
  const [phase, setPhase] = useState<SyncPhase>("synced");
  const pendingRef = useRef<PendingScores>({});
  const inFlightRef = useRef<Promise<SyncPhase> | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const flushRef = useRef<() => Promise<SyncPhase>>(() => Promise.resolve("synced"));
  const onSyncedRef = useRef(onSynced);

  useEffect(() => {
    onSyncedRef.current = onSynced;
  });

  const setPending = useCallback(
    (next: PendingScores) => {
      pendingRef.current = next;
      writePendingScores(roundId, next);
      setPendingState(next);
    },
    [roundId]
  );

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const scheduleRetry = useCallback(() => {
    clearRetry();
    const delay = RETRY_DELAYS_MS[Math.min(attemptRef.current, RETRY_DELAYS_MS.length - 1)]!;
    attemptRef.current += 1;
    retryTimerRef.current = window.setTimeout(() => void flushRef.current(), delay);
  }, [clearRetry]);

  const sendAll = useCallback(async (): Promise<SyncPhase> => {
    // Loops because newer values may be saved while a request is in flight.
    while (Object.keys(pendingRef.current).length > 0) {
      const rows: PendingScore[] = Object.values(pendingRef.current);
      const { data, error, status } = await upsertHoleScores(
        supabase,
        rows,
        AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      );

      if (error) {
        if (isRetryableSaveError(status)) {
          setPhase("waiting");
          scheduleRetry();
          return "waiting";
        }
        setPhase("failed");
        toastSaveError(friendlyError("Could not save scores", error));
        return "failed";
      }

      attemptRef.current = 0;
      toast.dismiss(SAVE_SCORES_TOAST_ID);
      setPending(removeSyncedScores(pendingRef.current, rows));
      onSyncedRef.current(parseUpsertedHoleScores(data));
    }
    setPhase("synced");
    return "synced";
  }, [supabase, scheduleRetry, setPending]);

  /** Sends everything waiting; resolves with the resulting phase. */
  const flush = useCallback((): Promise<SyncPhase> => {
    clearRetry();
    if (inFlightRef.current) {
      return inFlightRef.current.then(() => flushRef.current());
    }
    const request = sendAll().finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = request;
    return request;
  }, [clearRetry, sendAll]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const enqueue = useCallback(
    (rows: PendingScore[]) => {
      setPending(addPendingScores(pendingRef.current, rows));
      void flush();
    },
    [setPending, flush]
  );

  /** Forget unsent scores (round abandoned or finished: they can no longer be written). */
  const discard = useCallback(() => {
    clearRetry();
    setPending({});
    setPhase("synced");
  }, [clearRetry, setPending]);

  // Resume after a reload, and retry as soon as the phone is back online or
  // the tab is visible again.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const stored = readPendingScores(roundId);
    if (Object.keys(stored).length > 0) {
      setPending(addPendingScores(stored, Object.values(pendingRef.current)));
      void flush();
    }

    const onOnline = () => void flush();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && Object.keys(pendingRef.current).length > 0) {
        void flush();
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearRetry();
    };
  }, [enabled, roundId, setPending, flush, clearRetry]);

  return {
    pending,
    phase,
    pendingHoleCount: countPendingHoles(pending),
    enqueue,
    flush,
    discard,
  };
}
