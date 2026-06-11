"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeInviteRows, type InviteRow } from "@/lib/rounds/invite-rows";
import { isRoundStatus, type RoundStatus } from "@/lib/rounds/round-status";
import type { Database } from "@/lib/database.types";
import { toastError } from "@/lib/ui/toast-notify";
import type {
  HoleScoreRow,
  LastSavedEvent,
  ParticipantRow,
} from "../round-types";

type Client = SupabaseClient<Database>;

type SetState<T> = Dispatch<SetStateAction<T>>;

type Options = {
  supabase: Client;
  roundId: string;
  setParticipants: SetState<ParticipantRow[]>;
  setInvites: SetState<InviteRow[]>;
  setHoleScores: SetState<HoleScoreRow[]>;
  setRoundStatus: SetState<RoundStatus>;
  setLastSavedEvent: SetState<LastSavedEvent | null>;
  setRenderNow: SetState<number>;
};

export function useRoundRealtime({
  supabase,
  roundId,
  setParticipants,
  setInvites,
  setHoleScores,
  setRoundStatus,
  setLastSavedEvent,
  setRenderNow,
}: Options) {
  const loadParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_participants")
      .select("id, user_id, guest_name, joined_at")
      .eq("round_id", roundId)
      .order("joined_at", { ascending: true });

    if (error) {
      toastError(`Failed to refresh participants: ${error.message}`);
      return;
    }

    setParticipants((data ?? []) as ParticipantRow[]);
  }, [supabase, roundId, setParticipants]);

  const loadInvites = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_invitations")
      .select(
        "id, invited_user_id, status, created_at, profiles!round_invitations_invited_user_id_fkey(display_name)"
      )
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) {
      toastError(`Failed to refresh invitations: ${error.message}`);
      return;
    }

    setInvites(normalizeInviteRows(data ?? []));
  }, [supabase, roundId, setInvites]);

  const loadRoundStatus = useCallback(async () => {
    const { data, error } = await supabase
      .from("rounds")
      .select("status")
      .eq("id", roundId)
      .maybeSingle();

    if (error) {
      toastError(`Failed to refresh round status: ${error.message}`);
      return;
    }

    if (data?.status && isRoundStatus(data.status)) {
      setRoundStatus(data.status);
    }
  }, [supabase, roundId, setRoundStatus]);

  const loadHoleScores = useCallback(async () => {
    const { data, error } = await supabase
      .from("hole_scores")
      .select("id, participant_id, hole_id, strokes, ob, fairway_hit")
      .eq("round_id", roundId);

    if (error) {
      toastError(`Failed to refresh scores: ${error.message}`);
      return;
    }

    setHoleScores((data ?? []) as HoleScoreRow[]);
  }, [supabase, roundId, setHoleScores]);

  // Single refresh for low-frequency collaboration data. Called on every
  // postgres_changes event for participants/invites/rounds, and on every
  // resync trigger (subscription start, tab visibility).
  const refreshRoundMeta = useCallback(async () => {
    await Promise.all([loadParticipants(), loadInvites(), loadRoundStatus()]);
  }, [loadParticipants, loadInvites, loadRoundStatus]);

  useEffect(() => {
    const channel = supabase
      .channel(`round-session:${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_participants", filter: `round_id=eq.${roundId}` },
        () => {
          void refreshRoundMeta();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_invitations", filter: `round_id=eq.${roundId}` },
        () => {
          void refreshRoundMeta();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds", filter: `id=eq.${roundId}` },
        () => {
          void refreshRoundMeta();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hole_scores", filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            if (oldRow?.id) {
              const deletedId = oldRow.id;
              setHoleScores((prev) => prev.filter((row) => row.id !== deletedId));
            } else {
              void loadHoleScores();
            }
            return;
          }
          const newRow = payload.new as Partial<HoleScoreRow> | null;
          if (
            !newRow ||
            !newRow.id ||
            !newRow.participant_id ||
            !newRow.hole_id ||
            typeof newRow.strokes !== "number"
          ) {
            void loadHoleScores();
            return;
          }
          const row: HoleScoreRow = {
            id: newRow.id,
            participant_id: newRow.participant_id,
            hole_id: newRow.hole_id,
            strokes: newRow.strokes,
            ob: typeof newRow.ob === "boolean" ? newRow.ob : false,
            fairway_hit:
              typeof newRow.fairway_hit === "boolean" ? newRow.fairway_hit : null,
          };
          setHoleScores((prev) => {
            const filtered = prev.filter(
              (existing) =>
                !(
                  existing.participant_id === row.participant_id &&
                  existing.hole_id === row.hole_id
                )
            );
            return [...filtered, row];
          });
          const savedAt = Date.now();
          setLastSavedEvent({
            holeId: row.hole_id,
            participantId: row.participant_id,
            savedAt,
          });
          setRenderNow(savedAt);
        }
      )
      .subscribe((status) => {
        // Close the race between page mount and subscription activation by
        // resyncing once the channel is confirmed live.
        if (status === "SUBSCRIBED") {
          void refreshRoundMeta();
          void loadHoleScores();
        }
      });

    // Resync when the tab becomes visible again. Covers screen lock, app
    // switch, and websocket drops on flaky LTE.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshRoundMeta();
        void loadHoleScores();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [
    supabase,
    roundId,
    refreshRoundMeta,
    loadHoleScores,
    setHoleScores,
    setLastSavedEvent,
    setRenderNow,
  ]);

  return { loadParticipants, loadInvites, loadHoleScores };
}
