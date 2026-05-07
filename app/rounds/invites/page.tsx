import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentProps } from "react";
import { createServerClient } from "@/lib/supabase/server";
import { InvitesClient } from "./invites-client";

export default async function RoundInvitesPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+continue");
  }

  const { data: invites, error } = await supabase
    .from("round_invitations")
    .select("id, round_id, status, created_at")
    .eq("invited_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Round invites</h1>
        <p className="text-sm text-zinc-600">Accept or decline invitations to join rounds.</p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load invites: {error.message}
        </p>
      ) : (
        <InvitesClient
          currentUserId={user.id}
          invites={(invites ?? []) as unknown as ComponentProps<typeof InvitesClient>["invites"]}
        />
      )}

      <Link href="/" className="text-sm underline text-zinc-600">
        Back home
      </Link>
    </main>
  );
}
