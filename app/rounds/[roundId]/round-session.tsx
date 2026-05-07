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

type HoleRow = {
  id: string;
  hole_number: number;
  par: number;
};

type HoleScoreRow = {
  id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: number;
  putts: number | null;
  fairway_hit: boolean | null;
};

type Props = {
  roundId: string;
  roundStatus: string;
  currentUserId: string;
  scorerDisplayName: string;
  initialParticipants: ParticipantRow[];
  initialInvites: InviteRow[];
  holes: HoleRow[];
  initialHoleScores: HoleScoreRow[];
};

function getFirstIncompleteHoleIndex(
  holes: HoleRow[],
  participants: ParticipantRow[],
  scores: HoleScoreRow[]
): number {
  const scoringParticipants = participants.filter((participant) => participant.id !== "scorer-self");
  if (holes.length === 0 || scoringParticipants.length === 0) {
    return 0;
  }

  const firstIncompleteIndex = holes.findIndex((hole) =>
    scoringParticipants.some(
      (participant) =>
        !scores.some((score) => score.hole_id === hole.id && score.participant_id === participant.id)
    )
  );

  return firstIncompleteIndex === -1 ? holes.length - 1 : firstIncompleteIndex;
}

export function RoundSession({
  roundId,
  roundStatus,
  currentUserId,
  scorerDisplayName,
  initialParticipants,
  initialInvites,
  holes,
  initialHoleScores,
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
  const [holeScores, setHoleScores] = useState<HoleScoreRow[]>(initialHoleScores);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(() =>
    getFirstIncompleteHoleIndex(holes, initialParticipants, initialHoleScores)
  );
  const [draftStrokeInputs, setDraftStrokeInputs] = useState<Record<string, string>>({});

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
  const scoringParticipants = useMemo(
    () => participants.filter((participant) => participant.id !== "scorer-self"),
    [participants]
  );
  const activeHole = holes[currentHoleIndex] ?? null;
  const canScore = roundStatus === "active" && !!activeHole && scoringParticipants.length > 0;
  const isLastHole = activeHole ? currentHoleIndex === holes.length - 1 : false;
  const holeIds = useMemo(() => holes.map((hole) => hole.id), [holes]);
  const firstNineHoleIds = useMemo(
    () => holes.filter((hole) => hole.hole_number <= 9).map((hole) => hole.id),
    [holes]
  );
  const allScoresComplete = useMemo(() => {
    if (holeIds.length === 0 || scoringParticipants.length === 0) {
      return false;
    }

    return holeIds.every((holeId) =>
      scoringParticipants.every((participant) =>
        holeScores.some((score) => score.hole_id === holeId && score.participant_id === participant.id)
      )
    );
  }, [holeIds, scoringParticipants, holeScores]);
  const frontNineComplete = useMemo(() => {
    if (firstNineHoleIds.length === 0 || scoringParticipants.length === 0) {
      return false;
    }

    return firstNineHoleIds.every((holeId) =>
      scoringParticipants.every((participant) =>
        holeScores.some((score) => score.hole_id === holeId && score.participant_id === participant.id)
      )
    );
  }, [firstNineHoleIds, scoringParticipants, holeScores]);
  const showFinalSummary = roundStatus === "completed" || (roundStatus === "active" && allScoresComplete);
  const showFrontNineSummary = roundStatus === "active" && !showFinalSummary && frontNineComplete;

  function getStrokeInputValue(participantId: string): string {
    if (!activeHole) {
      return "";
    }

    const key = `${activeHole.id}:${participantId}`;
    const draftValue = draftStrokeInputs[key];
    if (draftValue !== undefined) {
      return draftValue;
    }

    const existing = holeScores.find(
      (score) => score.hole_id === activeHole.id && score.participant_id === participantId
    );
    return existing ? String(existing.strokes) : "";
  }

  function getParticipantLabel(participant: ParticipantRow): string {
    const player =
      unifiedPlayers.find((item) => item.participantId === participant.id)?.label ??
      participant.guest_name ??
      "Player";
    return player.replace(" (pending)", "");
  }

  function getTotalStrokes(participantId: string, targetHoleIds: string[]): number {
    return holeScores
      .filter((score) => score.participant_id === participantId && targetHoleIds.includes(score.hole_id))
      .reduce((sum, score) => sum + score.strokes, 0);
  }

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

    setIsTransitioning(false);
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

  async function saveCurrentHoleScores() {
    if (!activeHole) {
      return false;
    }

    const payload: Array<{
      round_id: string;
      participant_id: string;
      hole_id: string;
      strokes: number;
      ob: number;
      putts: number | null;
      fairway_hit: boolean | null;
    }> = [];

    for (const participant of scoringParticipants) {
      const rawValue = getStrokeInputValue(participant.id).trim();
      const strokes = Number(rawValue);

      if (!Number.isInteger(strokes) || strokes < 1 || strokes > 25) {
        setStatus(`Enter valid strokes (1-25) for every player on hole ${activeHole.hole_number}.`);
        return false;
      }

      payload.push({
        round_id: roundId,
        participant_id: participant.id,
        hole_id: activeHole.id,
        strokes,
        ob: 0,
        putts: null,
        fairway_hit: null,
      });
    }

    setIsSubmitting(true);
    setStatus(null);
    const { data, error } = await supabase
      .from("hole_scores")
      .upsert(payload, { onConflict: "round_id,participant_id,hole_id" })
      .select("id, participant_id, hole_id, strokes, ob, putts, fairway_hit");

    if (error) {
      setStatus(`Save failed: ${error.message}`);
      setIsSubmitting(false);
      return false;
    }

    const updatedRows = (data ?? []) as HoleScoreRow[];
    setHoleScores((prev) => {
      const remaining = prev.filter(
        (score) =>
          !updatedRows.some(
            (updated) =>
              updated.hole_id === score.hole_id && updated.participant_id === score.participant_id
          )
      );
      return [...remaining, ...updatedRows];
    });
    if (activeHole) {
      setDraftStrokeInputs((prev) => {
        const next = { ...prev };
        for (const participant of scoringParticipants) {
          delete next[`${activeHole.id}:${participant.id}`];
        }
        return next;
      });
    }
    setIsSubmitting(false);
    setStatus("Scores saved.");
    return true;
  }

  async function onSaveAndAdvanceHole() {
    const saved = await saveCurrentHoleScores();
    if (!saved || !activeHole) {
      return;
    }

    if (isLastHole) {
      setStatus("Final hole saved. Review summary and end the round.");
      return;
    }

    setCurrentHoleIndex((index) => Math.min(index + 1, holes.length - 1));
    setStatus(null);
  }

  function onPreviousHole() {
    setStatus(null);
    setCurrentHoleIndex((index) => Math.max(index - 1, 0));
  }

  async function onCompleteRound() {
    const confirmed = window.confirm("Complete this round?");
    if (!confirmed) {
      return;
    }

    const saved = await saveCurrentHoleScores();
    if (!saved) {
      return;
    }

    setIsTransitioning(true);
    const { error } = await supabase
      .from("rounds")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", roundId);
    if (error) {
      setStatus(`Complete failed: ${error.message}`);
      setIsTransitioning(false);
      return;
    }

    router.push("/rounds/new");
    router.refresh();
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

      {showFrontNineSummary ? (
        <div className="space-y-2 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <h3 className="text-sm font-semibold text-zinc-800">Front 9 summary</h3>
          <ul className="space-y-1 text-sm text-zinc-700">
            {scoringParticipants.map((participant) => (
              <li key={`front9-${participant.id}`} className="flex items-center justify-between">
                <span>{getParticipantLabel(participant)}</span>
                <span className="font-medium">{getTotalStrokes(participant.id, firstNineHoleIds)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showFinalSummary ? (
        <div className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <h3 className="text-sm font-semibold text-zinc-800">Round summary</h3>
          <ul className="space-y-1 text-sm text-zinc-700">
            {scoringParticipants.map((participant) => (
              <li key={`final-${participant.id}`} className="flex items-center justify-between">
                <span>{getParticipantLabel(participant)}</span>
                <span className="font-medium">{getTotalStrokes(participant.id, holeIds)}</span>
              </li>
            ))}
          </ul>
          {roundStatus === "active" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void onCompleteRound()}
                disabled={isSubmitting || isTransitioning}
                className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {isTransitioning ? "Working..." : "Confirm and end round"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Round is completed. Scores are now read-only.</p>
          )}
        </div>
      ) : null}

      {roundStatus === "active" && !showFinalSummary ? (
        <div className="space-y-3 rounded-md border border-zinc-200 p-3">
          <h3 className="text-sm font-semibold text-zinc-800">Scoring</h3>
          {!canScore ? (
            <p className="text-sm text-zinc-500">No participants available for scoring.</p>
          ) : (
            <>
              <p className="text-sm text-zinc-700">
                Hole <span className="font-medium">{activeHole?.hole_number}</span> of{" "}
                <span className="font-medium">{holes.length}</span> - Par{" "}
                <span className="font-medium">{activeHole?.par}</span>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {scoringParticipants.map((participant) => {
                  return (
                    <label key={participant.id} className="space-y-1 text-sm">
                      <span>{getParticipantLabel(participant)}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={25}
                        value={getStrokeInputValue(participant.id)}
                        onChange={(event) =>
                          setDraftStrokeInputs((prev) => ({
                            ...prev,
                            [`${activeHole?.id ?? "none"}:${participant.id}`]: event.target.value,
                          }))
                        }
                        className="w-full rounded border border-zinc-300 px-3 py-2"
                        placeholder="Strokes"
                      />
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {currentHoleIndex > 0 ? (
                  <button
                    type="button"
                    onClick={onPreviousHole}
                    disabled={isSubmitting}
                    className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    Previous hole
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void onSaveAndAdvanceHole()}
                  disabled={isSubmitting}
                  className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : isLastHole ? "Save scores" : "Save & next hole"}
                </button>
              </div>
            </>
          )}
        </div>
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
