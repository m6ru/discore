import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { CreateRoundForm } from "./create-round-form";

export default async function NewRoundPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+continue");
  }

  const { data: existingInProgressRound } = await supabase
    .from("rounds")
    .select("id, status")
    .eq("scorer_id", user.id)
    .in("status", ["draft", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInProgressRound) {
    redirect(`/rounds/${existingInProgressRound.id}`);
  }

  const { data: layouts, error: layoutsError } = await supabase
    .from("layouts")
    .select("id, name, total_par, total_distance_m")
    .order("name", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Create round</h1>
        <p className="text-sm text-zinc-600">
          Signed in as <span className="font-medium">{user.email}</span>
        </p>
      </header>

      {layoutsError ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load layouts: {layoutsError.message}
        </p>
      ) : null}

      {layouts && layouts.length > 0 ? (
        <CreateRoundForm layouts={layouts} />
      ) : (
        <p className="rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">
          No layouts available. Seed course data first.
        </p>
      )}

      <div className="flex gap-4 text-sm">
        <Link href="/" className="underline text-zinc-600">
          Back home
        </Link>
        <Link href="/auth" className="underline text-zinc-600">
          Manage auth
        </Link>
      </div>
    </main>
  );
}
