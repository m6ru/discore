"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ParticipantRow = {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  joined_at: string;
};

type Props = {
  roundId: string;
  roundStatus: string;
  joinCode: string;
  currentUserId: string;
  scorerDisplayName: string;
  initialParticipants: ParticipantRow[];
};

export function RoundSession({
  roundId,
  roundStatus,
  joinCode,
  currentUserId,
  scorerDisplayName,
  initialParticipants,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [guestName, setGuestName] = useState("");
  const [participants, setParticipants] = useState<ParticipantRow[]>(initialParticipants);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  async function onAddGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (roundStatus !== "draft" && roundStatus !== "active") {
      setStatus("Participants can only be changed while the round is draft or active.");
      return;
    }

    const trimmedGuestName = guestName.trim();
    if (!trimmedGuestName) {
      setStatus("Guest name is required.");
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error } = await supabase.from("round_participants").insert({
      round_id: roundId,
      guest_name: trimmedGuestName,
    });

    if (error) {
      setStatus(
        [
          `Guest add failed: ${error.message}`,
          `code=${error.code ?? "n/a"}`,
          `details=${error.details ?? "n/a"}`,
        ].join(" | ")
      );
      setIsSubmitting(false);
      return;
    }

    setGuestName("");
    setStatus(`Guest "${trimmedGuestName}" added.`);
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

  return (
    <section className="space-y-5 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">Participants</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-zinc-700">Current participants</h3>
        {participants.length === 0 ? <p className="text-sm text-zinc-500">No participants yet.</p> : null}
        {participants.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {participants.map((participant) => (
              <li key={participant.id} className="rounded border border-zinc-200 px-3 py-2">
                {participant.guest_name ??
                  (participant.user_id === currentUserId
                    ? `${scorerDisplayName} (scorer)`
                    : `Registered user (${participant.user_id})`)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        Registered users can join this round by entering code{" "}
        <span className="font-medium">{joinCode}</span>.
      </div>

      <form onSubmit={onAddGuest} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1 text-sm">
          <span>Add participant (guest)</span>
          <input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
            placeholder="Enter guest name"
            maxLength={80}
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Adding..." : "Add guest"}
        </button>
      </form>

      {status ? (
        <p className="rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">{status}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        {roundStatus === "draft" ? (
          <>
            <button
              type="button"
              onClick={onStartRound}
              disabled={isTransitioning}
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
    </section>
  );
}
