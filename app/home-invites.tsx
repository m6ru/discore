"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Invite = {
  id: string;
  round_id: string;
  status: string;
  created_at: string;
};

type Props = {
  currentUserId: string;
  invites: Invite[];
};

export function HomeInvites({ currentUserId, invites }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onRespond(invite: Invite, nextStatus: "accepted" | "declined") {
    setBusyId(invite.id);
    setStatus(null);

    if (nextStatus === "accepted") {
      const { error: participantError } = await supabase.from("round_participants").insert({
        round_id: invite.round_id,
        user_id: currentUserId,
      });

      if (participantError && participantError.code !== "23505") {
        setStatus(`Invite acceptance failed: ${participantError.message}`);
        setBusyId(null);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("round_invitations")
      .update({
        status: nextStatus,
        responded_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    if (updateError) {
      setStatus(`Failed to update invite: ${updateError.message}`);
      setBusyId(null);
      return;
    }

    if (nextStatus === "accepted") {
      router.push(`/rounds/${invite.round_id}`);
      router.refresh();
      return;
    }

    setBusyId(null);
    router.refresh();
  }

  if (invites.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">Pending invites</h2>
      {status ? (
        <p className="rounded border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">{status}</p>
      ) : null}
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li key={invite.id} className="rounded border border-zinc-200 p-3">
            <p className="text-sm font-medium">Round invitation</p>
            <p className="text-xs text-zinc-500">Round {invite.round_id.slice(0, 8)}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void onRespond(invite, "accepted")}
                disabled={busyId === invite.id}
                className="rounded bg-emerald-700 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => void onRespond(invite, "declined")}
                disabled={busyId === invite.id}
                className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
