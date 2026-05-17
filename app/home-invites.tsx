"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type InviteWithContext = {
  id: string;
  round_id: string;
  created_at: string;
  course_name: string | null;
  layout_name: string | null;
  inviter_display_name: string | null;
};

type Props = {
  currentUserId: string;
  invites: InviteWithContext[];
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HomeInvites({ currentUserId, invites }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onRespond(
    invite: InviteWithContext,
    nextStatus: "accepted" | "declined"
  ) {
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
            <p className="text-sm font-medium text-zinc-900">
              {invite.course_name ?? "Unknown course"}
            </p>
            <p className="text-xs text-zinc-600">
              {invite.layout_name ?? "Unknown layout"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Invited by {invite.inviter_display_name ?? "the scorer"} ·{" "}
              {formatDateTime(invite.created_at)}
            </p>
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
