import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { HomeInvites } from "./home-invites";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: pendingInvites } = user
    ? await supabase
        .from("round_invitations")
        .select("id, round_id, status, created_at")
        .eq("invited_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Discore</h1>
        <p className="text-sm text-zinc-600">Start a round or continue where you left off.</p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4">
        <p className="font-medium">{user ? "Signed in" : "Signed out"}</p>
        {user ? (
          <p className="mt-1 break-all text-sm text-zinc-600">{user.email}</p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            Sign in to save true-history rounds. Guest round flow comes next.
          </p>
        )}
      </section>

      {user ? <HomeInvites currentUserId={user.id} invites={pendingInvites ?? []} /> : null}

      <nav className="flex flex-wrap gap-3" aria-label="Primary actions">
        <Link
          href="/rounds/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Start round
        </Link>
        <Link
          href="/auth"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          {user ? "Account" : "Sign in"}
        </Link>
      </nav>
    </main>
  );
}
