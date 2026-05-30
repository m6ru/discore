"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pickOne } from "@/lib/supabase/select-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  const [inviteItems, setInviteItems] = useState<InviteWithContext[]>(invites);
  const [status, setStatus] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPendingInvites = useCallback(async () => {
    const { data, error } = await supabase
      .from("round_invitations")
      .select(
        "id, round_id, created_at, rounds!inner(layouts(name, courses(name)), scorer:profiles!rounds_scorer_id_fkey(display_name))"
      )
      .eq("invited_user_id", currentUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(`Failed to refresh invites: ${error.message}`);
      return;
    }

    setInviteItems(
      (data ?? []).map((row) => {
        const round = pickOne(row.rounds);
        const layout = pickOne(round?.layouts);
        const course = pickOne(layout?.courses);
        const scorer = pickOne(round?.scorer);
        return {
          id: row.id,
          round_id: row.round_id,
          created_at: row.created_at,
          course_name: course?.name ?? null,
          layout_name: layout?.name ?? null,
          inviter_display_name: scorer?.display_name ?? null,
        };
      })
    );
  }, [supabase, currentUserId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server prop into client state
    setInviteItems(invites);
  }, [invites]);

  useEffect(() => {
    const channel = supabase
      .channel(`home-invites:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "round_invitations",
          filter: `invited_user_id=eq.${currentUserId}`,
        },
        () => {
          void loadPendingInvites();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void loadPendingInvites();
        }
      });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadPendingInvites();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUserId, loadPendingInvites]);

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

    setInviteItems((prev) => prev.filter((item) => item.id !== invite.id));
    setBusyId(null);
  }

  if (inviteItems.length === 0) {
    return null;
  }

  return (
    <Card className="py-4">
      <CardHeader>
        <CardTitle>Pending invites</CardTitle>
        <CardDescription>Accept to join the round setup.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status ? (
          <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            {status}
          </p>
        ) : null}
        <ul className="space-y-3">
          {inviteItems.map((invite) => (
            <li key={invite.id} className="rounded-lg border p-4">
              <p className="font-medium">{invite.course_name ?? "Unknown course"}</p>
              <p className="text-sm text-muted-foreground">
                {invite.layout_name ?? "Unknown layout"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Invited by {invite.inviter_display_name ?? "the scorer"} ·{" "}
                {formatDateTime(invite.created_at)}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  size="lg"
                  className="min-h-11 flex-1"
                  onClick={() => void onRespond(invite, "accepted")}
                  disabled={busyId === invite.id}
                >
                  Accept
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="min-h-11 flex-1"
                  onClick={() => void onRespond(invite, "declined")}
                  disabled={busyId === invite.id}
                >
                  Decline
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
