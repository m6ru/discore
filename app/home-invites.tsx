"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pickOne } from "@/lib/supabase/select-helpers";
import type { HomeInvite } from "@/lib/home/types";
import { toastError } from "@/lib/ui/toast-notify";
import {
  homeRowMetaClassName,
  homeRowTitleClassName,
} from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { Button } from "@/components/ui/button";

export type { HomeInvite as InviteWithContext };

type Props = {
  currentUserId: string;
  invites: HomeInvite[];
};

export function HomeInvites({ currentUserId, invites }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [inviteItems, setInviteItems] = useState<HomeInvite[]>(invites);
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
      toastError(`Failed to refresh invites: ${error.message}`);
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

  async function onRespond(invite: HomeInvite, nextStatus: "accepted" | "declined") {
    setBusyId(invite.id);

    if (nextStatus === "accepted") {
      const { error: participantError } = await supabase.from("round_participants").insert({
        round_id: invite.round_id,
        user_id: currentUserId,
      });

      if (participantError && participantError.code !== "23505") {
        toastError(`Invite acceptance failed: ${participantError.message}`);
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
      toastError(`Failed to update invite: ${updateError.message}`);
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
    <section className="space-y-2">
      <h2 className={sectionHeadingClassName}>Pending invites</h2>
      <ul>
        {inviteItems.map((invite) => (
          <li key={invite.id} className="space-y-3 py-2">
            <div className="space-y-0.5 text-sm">
              <p className={homeRowTitleClassName}>{invite.course_name ?? "Unknown course"}</p>
              <p className={homeRowMetaClassName}>
                {invite.layout_name ?? "Unknown layout"} · Invited by{" "}
                {invite.inviter_display_name ?? "the scorer"}
              </p>
            </div>
            <div className="flex gap-2">
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
    </section>
  );
}
