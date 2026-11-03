"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INVITE_SELECT, normalizeInviteRows, type InviteRow } from "@/lib/rounds/invite-rows";
import { normalizeParticipantRows, PARTICIPANT_SELECT } from "@/lib/rounds/round-rows";
import { isRoundStatus, type RoundStatus } from "@/lib/rounds/round-status";
import type { Database } from "@/lib/database.types";
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
  setRoundName: SetState<string | null>;
  setStartingHole: SetState<number>;
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
  setRoundName,
  setStartingHole,
  setLastSavedEvent,
  setRenderNow,
}: Options) {
  const loadParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_participants")
      .select(PARTICIPANT_SELECT)
      .eq("round_id", roundId)
      .order("joined_at", { ascending: true });

    if (error) {
      console.warn("Refreshing participants failed", error);
      return;
    }

    setParticipants(normalizeParticipantRows(data));
  }, [supabase, roundId, setParticipants]);

  const loadInvites = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_invitations")
      .select(INVITE_SELECT)
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Refreshing invitations failed", error);
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
      console.warn("Refreshing round status failed", error);
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
      console.warn("Refreshing scores failed", error);
      return;
    }

    setHoleScores((data ?? []) as HoleScoreRow[]);
  }, [supabase, roundId, setHoleScores]);

  // Full resync of the low-frequency collaboration data on subscription start
  // and tab visibility: closes the gap since the server render (which can come
  // from the 30 s client router cache) and covers dropped sockets. Single
  // events only reload their own table.
  const refreshRoundMeta = useCallback(async () => {
    await Promise.all([loadParticipants(), loadInvites(), loadRoundStatus()]);
  }, [loadParticipants, loadInvites, loadRoundStatus]);

  useEffect(() => {
    const channel = supabase
      .channel(`round-session:${roundId}`)
      .on(
        "postgres_changes",
        // Filtered DELETE events never arrive, so whoever deletes updates their own list.
        { event: "*", schema: "public", table: "round_participants", filter: `round_id=eq.${roundId}` },
        () => {
          void loadParticipants();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_invitations", filter: `round_id=eq.${roundId}` },
        () => {
          void loadInvites();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds", filter: `id=eq.${roundId}` },
        (payload) => {
          // The payload carries the whole row: no reload needed.
          const next = payload.new as { status?: unknown; name?: unknown; starting_hole?: unknown } | null;
          if (typeof next?.status !== "string" || !isRoundStatus(next.status)) {
            void loadRoundStatus();
            return;
          }
          setRoundStatus(next.status);
          if (typeof next.name === "string" || next.name === null) setRoundName(next.name);
          if (typeof next.starting_hole === "number") setStartingHole(next.starting_hole);
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
    loadParticipants,
    loadInvites,
    loadRoundStatus,
    loadHoleScores,
    setHoleScores,
    setRoundStatus,
    setRoundName,
    setStartingHole,
    setLastSavedEvent,
    setRenderNow,
  ]);

  return { loadHoleScores };
}
