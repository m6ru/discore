"use client";

import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeInviteRows, type InviteRow } from "@/lib/rounds/invite-rows";
import type { Database } from "@/lib/database.types";
import type { HoleScoreRow, LastSavedEvent, ParticipantRow } from "./round-types";

type Client = SupabaseClient<Database>;

type SetState<T> = Dispatch<SetStateAction<T>>;

type Options = {
  supabase: Client;
  roundId: string;
  setParticipants: SetState<ParticipantRow[]>;
  setInvites: SetState<InviteRow[]>;
  setHoleScores: SetState<HoleScoreRow[]>;
  setLastSavedEvent: SetState<LastSavedEvent | null>;
  setRenderNow: SetState<number>;
  onLoadError: (message: string) => void;
};

export function useRoundRealtime({
  supabase,
  roundId,
  setParticipants,
  setInvites,
  setHoleScores,
  setLastSavedEvent,
  setRenderNow,
  onLoadError,
}: Options) {
  const loadParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_participants")
      .select("id, user_id, guest_name, joined_at")
      .eq("round_id", roundId)
      .order("joined_at", { ascending: true });

    if (error) {
      onLoadError(`Failed to refresh participants: ${error.message}`);
      return;
    }

    setParticipants((data ?? []) as ParticipantRow[]);
  }, [supabase, roundId, setParticipants, onLoadError]);

  const loadInvites = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_invitations")
      .select(
        "id, invited_user_id, status, created_at, profiles!round_invitations_invited_user_id_fkey(display_name)"
      )
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) {
      onLoadError(`Failed to refresh invitations: ${error.message}`);
      return;
    }

    setInvites(normalizeInviteRows(data ?? []));
  }, [supabase, roundId, setInvites, onLoadError]);

  const loadHoleScores = useCallback(async () => {
    const { data, error } = await supabase
      .from("hole_scores")
      .select("id, participant_id, hole_id, strokes, ob, fairway_hit")
      .eq("round_id", roundId);

    if (error) {
      onLoadError(`Failed to refresh scores: ${error.message}`);
      return;
    }

    setHoleScores((data ?? []) as HoleScoreRow[]);
  }, [supabase, roundId, setHoleScores, onLoadError]);

  useEffect(() => {
    const channel = supabase
      .channel(`round-session:${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_participants", filter: `round_id=eq.${roundId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id?: string } | null;
            if (oldRow?.id) {
              const deletedId = oldRow.id;
              setParticipants((prev) => prev.filter((row) => row.id !== deletedId));
            } else {
              void loadParticipants();
            }
            return;
          }
          const newRow = payload.new as Partial<ParticipantRow> | null;
          if (!newRow || !newRow.id) {
            void loadParticipants();
            return;
          }
          const row: ParticipantRow = {
            id: newRow.id,
            user_id: newRow.user_id ?? null,
            guest_name: newRow.guest_name ?? null,
            joined_at: newRow.joined_at ?? new Date().toISOString(),
          };
          setParticipants((prev) => {
            const filtered = prev.filter((existing) => existing.id !== row.id);
            return [...filtered, row].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
          });
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    supabase,
    roundId,
    loadParticipants,
    loadInvites,
    loadHoleScores,
    setParticipants,
    setInvites,
    setHoleScores,
    setLastSavedEvent,
    setRenderNow,
  ]);

  return { loadParticipants, loadInvites, loadHoleScores };
}
