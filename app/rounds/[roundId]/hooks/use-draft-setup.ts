"use client";

import { FormEvent, useCallback, useState, type Dispatch, type SetStateAction } from "react";
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
import { normalizeInviteRows, type InviteRow } from "@/lib/rounds/invite-rows";
import { normalizeParticipantRows } from "@/lib/rounds/round-rows";
import { toastError, toastInfo } from "@/lib/ui/toast-notify";
import type { ParticipantRow, ProfileSearchResult, UnifiedPlayer } from "../round-types";
import { friendlyError } from "@/lib/ui/friendly-error";

type Client = SupabaseClient<Database>;

type Options = {
  supabase: Client;
  roundId: string;
  roundStatus: RoundStatus;
  isScorer: boolean;
  currentUserId: string;
  courseSlug: string | null;
  setParticipants: Dispatch<SetStateAction<ParticipantRow[]>>;
  setInvites: Dispatch<SetStateAction<InviteRow[]>>;
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
  setParticipants,
  setInvites,
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
        const { data: invite, error: inviteError } = await sendRoundInvite(
          supabase,
          roundId,
          selectedProfile.id,
          currentUserId
        );
        if (inviteError) {
          toastError(friendlyError("Could not send the invite", inviteError));
          setIsSubmitting(false);
          return false;
        }
        setParticipantName("");
        clearSearchSelection();
        // The written row is the answer; the Realtime echo only reaches other phones.
        setInvites((prev) => upsertById(prev, normalizeInviteRows([invite])));
        setIsSubmitting(false);
        return true;
      }

      const { data: guest, error: guestInsertError } = await addGuestParticipant(supabase, roundId, trimmedName);
      if (guestInsertError) {
        toastError(friendlyError("Could not add the player", guestInsertError));
        setIsSubmitting(false);
        return false;
      }

      setParticipantName("");
      clearSearchSelection();
      setParticipants((prev) => upsertById(prev, normalizeParticipantRows([guest])));
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
      setInvites,
      setParticipants,
      setIsSubmitting,
    ]
  );

  const onRemovePlayer = useCallback(
    async (player: UnifiedPlayer) => {
      if (!isScorer || roundStatus !== "draft" || !player.canRemove) return;
      setIsSubmitting(true);

      if (player.source === "invite" && player.inviteId) {
        const inviteId = player.inviteId;
        const { data, error } = await cancelRoundInvitation(supabase, inviteId);
        if (error || !data?.length) {
          toastError(friendlyError("Could not remove the player", error));
          setIsSubmitting(false);
          return;
        }
        setInvites((prev) =>
          prev.map((invite) => (invite.id === inviteId ? { ...invite, status: "cancelled" } : invite))
        );
        setIsSubmitting(false);
        return;
      }

      if (player.source === "participant" && player.participantId) {
        const participantId = player.participantId;
        // A delete never comes back through Realtime, so this screen updates itself.
        const { data, error: deleteError } = await removeRoundParticipant(supabase, participantId);
        if (deleteError || !data?.length) {
          toastError(friendlyError("Could not remove the player", deleteError));
          setIsSubmitting(false);
          return;
        }
        setParticipants((prev) => prev.filter((participant) => participant.id !== participantId));
        const invitedUserId = player.invitedUserId;
        if (invitedUserId) {
          // Otherwise their accepted invite would show them again.
          await cancelInvitesForUser(supabase, roundId, invitedUserId);
          setInvites((prev) =>
            prev.map((invite) =>
              invite.invited_user_id === invitedUserId &&
              (invite.status === "pending" || invite.status === "accepted")
                ? { ...invite, status: "cancelled" }
                : invite
            )
          );
        }
        setIsSubmitting(false);
      }
    },
    [
      isScorer,
      roundStatus,
      supabase,
      roundId,
      setInvites,
      setParticipants,
      setIsSubmitting,
    ]
  );

  const onStartRound = useCallback(async () => {
    if (!isScorer) return;
    setIsTransitioning(true);
    const { error } = await startRound(supabase, roundId);
    if (error) {
      toastError(friendlyError("Could not start the round", error));
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
      toastError(friendlyError("Could not delete the round", error));
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

function upsertById<T extends { id: string }>(rows: T[], incoming: T[]): T[] {
  const ids = new Set(incoming.map((row) => row.id));
  return [...rows.filter((row) => !ids.has(row.id)), ...incoming];
}
