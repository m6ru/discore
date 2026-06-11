"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addGuestParticipant,
  cancelInvitesForUser,
  cancelRoundInvitation,
  deleteDraftRound,
  removeRoundParticipant,
  sendRoundInvite,
  startRound,
} from "@/lib/rounds/round-draft-actions";
import type { Database } from "@/lib/database.types";
import type { RoundStatus } from "@/lib/rounds/round-status";
import type { ProfileSearchResult, UnifiedPlayer } from "../round-types";

type Client = SupabaseClient<Database>;

type Options = {
  supabase: Client;
  roundId: string;
  roundStatus: RoundStatus;
  isScorer: boolean;
  currentUserId: string;
  loadParticipants: () => Promise<void>;
  loadInvites: () => Promise<void>;
  setStatus: (message: string | null) => void;
  setIsSubmitting: (value: boolean) => void;
  setIsTransitioning: (value: boolean) => void;
};

export function useDraftSetup({
  supabase,
  roundId,
  roundStatus,
  isScorer,
  currentUserId,
  loadParticipants,
  loadInvites,
  setStatus,
  setIsSubmitting,
  setIsTransitioning,
}: Options) {
  const router = useRouter();
  const [participantName, setParticipantName] = useState("");

  const onAddParticipant = useCallback(
    async (
      event: FormEvent<HTMLFormElement>,
      selectedProfile: ProfileSearchResult | null,
      clearSearchSelection: () => void
    ) => {
      event.preventDefault();
      if (!isScorer || roundStatus !== "draft") {
        setStatus("Participants can only be changed while the round is in draft.");
        return;
      }

      const trimmedName = participantName.trim();
      if (!trimmedName) {
        setStatus("Participant name is required.");
        return;
      }

      setIsSubmitting(true);
      setStatus(null);

      if (selectedProfile) {
        const { error: inviteError } = await sendRoundInvite(
          supabase,
          roundId,
          selectedProfile.id,
          currentUserId
        );
        if (inviteError) {
          setStatus(`Invite failed: ${inviteError.message}`);
          setIsSubmitting(false);
          return;
        }
        setParticipantName("");
        clearSearchSelection();
        await loadInvites();
        setIsSubmitting(false);
        return;
      }

      const { error: guestInsertError } = await addGuestParticipant(supabase, roundId, trimmedName);
      if (guestInsertError) {
        setStatus(
          [
            `Participant add failed: ${guestInsertError.message}`,
            `code=${guestInsertError.code ?? "n/a"}`,
            `details=${guestInsertError.details ?? "n/a"}`,
          ].join(" | ")
        );
        setIsSubmitting(false);
        return;
      }

      setParticipantName("");
      clearSearchSelection();
      await loadParticipants();
      setIsSubmitting(false);
    },
    [
      isScorer,
      roundStatus,
      participantName,
      supabase,
      roundId,
      currentUserId,
      loadInvites,
      loadParticipants,
      setStatus,
      setIsSubmitting,
    ]
  );

  const onRemovePlayer = useCallback(
    async (player: UnifiedPlayer) => {
      if (!isScorer || roundStatus !== "draft" || !player.canRemove) return;
      setStatus(null);
      setIsSubmitting(true);

      if (player.source === "invite" && player.inviteId) {
        const { error } = await cancelRoundInvitation(supabase, player.inviteId);
        if (error) {
          setStatus(`Remove failed: ${error.message}`);
          setIsSubmitting(false);
          return;
        }
        await loadInvites();
        setIsSubmitting(false);
        return;
      }

      if (player.source === "participant" && player.participantId) {
        const { error: deleteError } = await removeRoundParticipant(supabase, player.participantId);
        if (deleteError) {
          setStatus(`Remove failed: ${deleteError.message}`);
          setIsSubmitting(false);
          return;
        }
        if (player.invitedUserId) {
          await cancelInvitesForUser(supabase, roundId, player.invitedUserId);
        }
        await loadParticipants();
        await loadInvites();
        setIsSubmitting(false);
      }
    },
    [
      isScorer,
      roundStatus,
      supabase,
      roundId,
      loadInvites,
      loadParticipants,
      setStatus,
      setIsSubmitting,
    ]
  );

  const onStartRound = useCallback(async () => {
    if (!isScorer) return;
    setIsTransitioning(true);
    setStatus(null);
    const { error } = await startRound(supabase, roundId);
    if (error) {
      setStatus(`Start failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }
    setIsTransitioning(false);
    router.refresh();
  }, [isScorer, supabase, roundId, setStatus, setIsTransitioning, router]);

  const onDeleteDraft = useCallback(async () => {
    if (!isScorer) return;
    setIsTransitioning(true);
    setStatus(null);
    const { error } = await deleteDraftRound(supabase, roundId);
    if (error) {
      setStatus(`Delete failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }
    router.push("/");
    router.refresh();
  }, [isScorer, supabase, roundId, setStatus, setIsTransitioning, router]);

  return {
    participantName,
    setParticipantName,
    onAddParticipant,
    onRemovePlayer,
    onStartRound,
    onDeleteDraft,
  };
}
