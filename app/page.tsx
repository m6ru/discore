import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Discore</h1>
        <p className="text-sm text-zinc-600">
          Phase 3 kickoff: authenticated round creation flow.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4">
        <p className="font-medium">
          Session: {user ? "Signed in" : "Signed out"}
        </p>
        {user ? (
          <p className="mt-1 break-all text-sm text-zinc-600">{user.email}</p>
        ) : (
          <p className="mt-1 text-sm text-zinc-600">
            Sign in to create true-history rounds.
          </p>
        )}
      </section>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/auth"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          {user ? "Manage session" : "Sign in"}
        </Link>
        <Link
          href="/rounds/new"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          Create round
        </Link>
        <Link
          href="/rounds/invites"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          Round invites
        </Link>
      </nav>
    </main>
  );
}
