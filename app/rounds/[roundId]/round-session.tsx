"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ParticipantRow = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  joined_at: string;
};

type InviteRow = {
  id: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  profiles: {
    display_name: string;
  } | null;
};

type ProfileSearchResult = {
  id: string;
  display_name: string;
};

type UnifiedPlayer = {
  key: string;
  label: string;
  isPending: boolean;
  canRemove: boolean;
  source: "participant" | "invite";
  participantId?: string;
  invitedUserId?: string;
  inviteId?: string;
};

type Props = {
  roundId: string;
  roundStatus: string;
  currentUserId: string;
  scorerDisplayName: string;
  initialParticipants: ParticipantRow[];
  initialInvites: InviteRow[];
};

export function RoundSession({
  roundId,
  roundStatus,
  currentUserId,
  scorerDisplayName,
  initialParticipants,
  initialInvites,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [participantName, setParticipantName] = useState("");
  const [participants, setParticipants] = useState<ParticipantRow[]>(initialParticipants);
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchResults, setSearchResults] = useState<ProfileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null);

  const inviteNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const invite of invites) {
      if (invite.profiles?.display_name) {
        map.set(invite.invited_user_id, invite.profiles.display_name);
      }
    }
    return map;
  }, [invites]);

  const unifiedPlayers = useMemo(() => {
    const registeredParticipantIds = new Set<string>();
    const rows: UnifiedPlayer[] = [];

    for (const participant of participants) {
      if (participant.user_id) {
        registeredParticipantIds.add(participant.user_id);
      }

      if (participant.guest_name) {
        rows.push({
          key: `guest-${participant.id}`,
          label: participant.guest_name,
          isPending: false,
          canRemove: roundStatus === "draft",
          source: "participant",
          participantId: participant.id,
        });
        continue;
      }

      if (participant.user_id === currentUserId) {
        rows.push({
          key: `user-${participant.id}`,
          label: `${scorerDisplayName} (scorer)`,
          isPending: false,
          canRemove: false,
          source: "participant",
          participantId: participant.id,
          invitedUserId: participant.user_id ?? undefined,
        });
        continue;
      }

      rows.push({
        key: `user-${participant.id}`,
        label: inviteNameByUserId.get(participant.user_id ?? "") ?? `Registered user (${participant.user_id})`,
        isPending: false,
        canRemove: roundStatus === "draft",
        source: "participant",
        participantId: participant.id,
        invitedUserId: participant.user_id ?? undefined,
      });
    }

    for (const invite of invites) {
      if (registeredParticipantIds.has(invite.invited_user_id)) {
        continue;
      }
      if (invite.status === "declined" || invite.status === "cancelled") {
        continue;
      }

      rows.push({
        key: `invite-${invite.id}`,
        label: invite.profiles?.display_name ?? invite.invited_user_id,
        isPending: invite.status === "pending",
        canRemove: roundStatus === "draft",
        source: "invite",
        inviteId: invite.id,
        invitedUserId: invite.invited_user_id,
      });
    }

    return rows;
  }, [participants, invites, currentUserId, scorerDisplayName, inviteNameByUserId, roundStatus]);

  const hasPendingInvite = useMemo(
    () => unifiedPlayers.some((player) => player.isPending),
    [unifiedPlayers]
  );

  function withScorerParticipant(rows: ParticipantRow[]): ParticipantRow[] {
    const hasScorer = rows.some((participant) => participant.user_id === currentUserId);
    if (hasScorer) {
      return rows;
    }

    return [
      {
        id: "scorer-self",
        user_id: currentUserId,
        guest_name: null,
        joined_at: new Date(0).toISOString(),
      },
      ...rows,
    ];
  }

  async function loadParticipants() {
    const { data, error } = await supabase
      .from("round_participants")
      .select("id, user_id, guest_name, joined_at")
      .eq("round_id", roundId)
      .order("joined_at", { ascending: true });

    if (error) {
      setStatus(`Failed to refresh participants: ${error.message}`);
      return;
    }

    setParticipants(withScorerParticipant(data ?? []));
  }

  async function loadInvites() {
    const { data, error } = await supabase
      .from("round_invitations")
      .select("id, invited_user_id, status, created_at, profiles!round_invitations_invited_user_id_fkey(display_name)")
      .eq("round_id", roundId)
      .order("created_at", { ascending: true });

    if (error) {
      setStatus(`Failed to refresh invites: ${error.message}`);
      return;
    }

    setInvites((data ?? []) as InviteRow[]);
  }

  useEffect(() => {
    const query = participantName.trim();
    if (roundStatus !== "draft" || query.length < 2) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .ilike("display_name", `%${query}%`)
        .neq("id", currentUserId)
        .limit(8);

      if (error) {
        setStatus(`Participant lookup failed: ${error.message}`);
        setIsSearching(false);
        return;
      }

      const matches = (data ?? []) as ProfileSearchResult[];
      setSearchResults(matches);

      if (selectedProfile && !matches.some((match) => match.id === selectedProfile.id)) {
        setSelectedProfile(null);
      }

      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [participantName, roundStatus, supabase, currentUserId, selectedProfile]);

  async function onAddParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (roundStatus !== "draft") {
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
      const { error: inviteError } = await supabase.from("round_invitations").insert({
        round_id: roundId,
        invited_user_id: selectedProfile.id,
        invited_by: currentUserId,
      });

      if (inviteError) {
        setStatus(`Invite failed: ${inviteError.message}`);
        setIsSubmitting(false);
        return;
      }

      setParticipantName("");
      setSelectedProfile(null);
      setSearchResults([]);
      await loadInvites();
      setIsSubmitting(false);
      return;
    }

    const { error: guestInsertError } = await supabase.from("round_participants").insert({
      round_id: roundId,
      guest_name: trimmedName,
    });

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
    setSelectedProfile(null);
    setSearchResults([]);
    await loadParticipants();
    setIsSubmitting(false);
  }

  async function onStartRound() {
    setIsTransitioning(true);
    setStatus(null);

    const { error } = await supabase
      .from("rounds")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
      .eq("id", roundId);

    if (error) {
      setStatus(`Start failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }

    router.refresh();
  }

  async function onDeleteDraft() {
    const confirmed = window.confirm("Delete this draft round?");
    if (!confirmed) {
      return;
    }

    setIsTransitioning(true);
    setStatus(null);

    const { error } = await supabase.from("rounds").delete().eq("id", roundId);
    if (error) {
      setStatus(`Delete failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }

    router.push("/rounds/new");
    router.refresh();
  }

  async function onAbandonRound() {
    const confirmed = window.confirm("Abandon this round?");
    if (!confirmed) {
      return;
    }

    setIsTransitioning(true);
    setStatus(null);

    const { error } = await supabase
      .from("rounds")
      .update({ status: "abandoned" })
      .eq("id", roundId);
    if (error) {
      setStatus(`Abandon failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }

    router.push("/rounds/new");
    router.refresh();
  }

  async function onRemovePlayer(player: UnifiedPlayer) {
    if (roundStatus !== "draft" || !player.canRemove) {
      return;
    }

    setStatus(null);
    setIsSubmitting(true);

    if (player.source === "invite" && player.inviteId) {
      const { error } = await supabase
        .from("round_invitations")
        .update({ status: "cancelled" })
        .eq("id", player.inviteId);

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
      const { error: deleteError } = await supabase
        .from("round_participants")
        .delete()
        .eq("id", player.participantId);

      if (deleteError) {
        setStatus(`Remove failed: ${deleteError.message}`);
        setIsSubmitting(false);
        return;
      }

      if (player.invitedUserId) {
        await supabase
          .from("round_invitations")
          .update({ status: "cancelled" })
          .eq("round_id", roundId)
          .eq("invited_user_id", player.invitedUserId)
          .in("status", ["pending", "accepted"]);
      }

      await loadParticipants();
      await loadInvites();
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-5 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">Participants</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-700">Players</h3>
        {unifiedPlayers.length === 0 ? <p className="text-sm text-zinc-500">No players yet.</p> : null}
        {unifiedPlayers.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {unifiedPlayers.map((player) => (
              <li
                key={player.key}
                className="flex items-center justify-between gap-3 rounded border border-zinc-200 px-3 py-2"
              >
                <span>
                  {player.label}
                  {player.isPending ? <span className="ml-2 text-xs text-zinc-500">(pending)</span> : null}
                </span>
                {player.canRemove ? (
                  <button
                    type="button"
                    onClick={() => void onRemovePlayer(player)}
                    disabled={isSubmitting}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-60"
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {roundStatus === "draft" ? (
        <form onSubmit={onAddParticipant} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1 text-sm">
            <span>Player name</span>
            <input
              value={participantName}
              onChange={(event) => {
                setParticipantName(event.target.value);
                setSelectedProfile(null);
              }}
              className="w-full rounded border border-zinc-300 px-3 py-2"
              placeholder="Type player name or email"
              maxLength={80}
            />
            {participantName.trim().length >= 2 ? (
              <div className="mt-2 rounded border border-zinc-200 bg-white">
                {isSearching ? (
                  <p className="px-3 py-2 text-xs text-zinc-500">Searching...</p>
                ) : searchResults.length > 0 ? (
                  <ul className="max-h-40 overflow-auto">
                    {searchResults.map((profile) => (
                      <li key={profile.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfile(profile);
                            setParticipantName(profile.display_name);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 ${
                            selectedProfile?.id === profile.id ? "bg-zinc-100" : ""
                          }`}
                        >
                          {profile.display_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-xs text-zinc-500">No registered match, will add as guest.</p>
                )}
              </div>
            ) : null}
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "Adding..." : "Add player"}
          </button>
        </form>
      ) : null}

      {status ? (
        <p className="rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">{status}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        {roundStatus === "draft" ? (
          <>
            <button
              type="button"
              onClick={onStartRound}
              disabled={isTransitioning || hasPendingInvite}
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isTransitioning ? "Working..." : "Start round"}
            </button>
            <button
              type="button"
              onClick={onDeleteDraft}
              disabled={isTransitioning}
              className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
            >
              Delete draft
            </button>
          </>
        ) : null}

        {roundStatus === "active" ? (
          <button
            type="button"
            onClick={onAbandonRound}
            disabled={isTransitioning}
            className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
          >
            Abandon round
          </button>
        ) : null}
      </div>

      {roundStatus === "draft" && hasPendingInvite ? (
        <p className="text-xs text-zinc-500">
          Resolve pending invitations (accept or remove) before starting the round.
        </p>
      ) : null}
    </section>
  );
}
