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
import { toastError, toastInfo } from "@/lib/ui/toast-notify";
import type { ProfileSearchResult, UnifiedPlayer } from "../round-types";

type Client = SupabaseClient<Database>;

type Options = {
  supabase: Client;
  roundId: string;
  roundStatus: RoundStatus;
  isScorer: boolean;
  currentUserId: string;
  courseSlug: string | null;
  loadParticipants: () => Promise<void>;
  loadInvites: () => Promise<void>;
  setIsSubmitting: (value: boolean) => void;
  setIsTransitioning: (value: boolean) => void;
};

export function useDraftSetup({
  supabase,
  roundId,
  roundStatus,
  isScorer,
  currentUserId,
  courseSlug,
  loadParticipants,
  loadInvites,
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
        toastInfo("Participants can only be changed while the round is in draft.");
        return false;
      }

      const trimmedName = participantName.trim();
      if (!trimmedName) {
        toastError("Participant name is required.");
        return false;
      }

      setIsSubmitting(true);

      if (selectedProfile) {
        const { error: inviteError } = await sendRoundInvite(
          supabase,
          roundId,
          selectedProfile.id,
          currentUserId
        );
        if (inviteError) {
          toastError(`Invite failed: ${inviteError.message}`);
          setIsSubmitting(false);
          return false;
        }
        setParticipantName("");
        clearSearchSelection();
        await loadInvites();
        setIsSubmitting(false);
        return true;
      }

      const { error: guestInsertError } = await addGuestParticipant(supabase, roundId, trimmedName);
      if (guestInsertError) {
        toastError(
          [
            `Participant add failed: ${guestInsertError.message}`,
            `code=${guestInsertError.code ?? "n/a"}`,
            `details=${guestInsertError.details ?? "n/a"}`,
          ].join(" | ")
        );
        setIsSubmitting(false);
        return false;
      }

      setParticipantName("");
      clearSearchSelection();
      await loadParticipants();
      setIsSubmitting(false);
      return true;
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
      setIsSubmitting,
    ]
  );

  const onRemovePlayer = useCallback(
    async (player: UnifiedPlayer) => {
      if (!isScorer || roundStatus !== "draft" || !player.canRemove) return;
      setIsSubmitting(true);

      if (player.source === "invite" && player.inviteId) {
        const { error } = await cancelRoundInvitation(supabase, player.inviteId);
        if (error) {
          toastError(`Remove failed: ${error.message}`);
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
          toastError(`Remove failed: ${deleteError.message}`);
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
      setIsSubmitting,
    ]
  );

  const onStartRound = useCallback(async () => {
    if (!isScorer) return;
    setIsTransitioning(true);
    const { error } = await startRound(supabase, roundId);
    if (error) {
      toastError(`Start failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }
    setIsTransitioning(false);
    router.refresh();
  }, [isScorer, supabase, roundId, setIsTransitioning, router]);

  const onDeleteDraft = useCallback(async () => {
    if (!isScorer) return;
    setIsTransitioning(true);
    const { error } = await deleteDraftRound(supabase, roundId);
    if (error) {
      toastError(`Delete failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }
    router.push(courseSlug ? `/courses/${courseSlug}` : "/courses");
    router.refresh();
  }, [isScorer, supabase, roundId, courseSlug, setIsTransitioning, router]);

  return {
    participantName,
    setParticipantName,
    onAddParticipant,
    onRemovePlayer,
    onStartRound,
    onDeleteDraft,
  };
}
