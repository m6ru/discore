import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createRoundAction } from "./actions";

type NewRoundPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewRoundPage({ searchParams }: NewRoundPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const error = typeof params?.error === "string" ? params.error : null;
  const created = params?.created === "1";
  const roundId = typeof params?.roundId === "string" ? params.roundId : null;
  const joinCode = typeof params?.joinCode === "string" ? params.joinCode : null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+continue");
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

      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {created && roundId && joinCode ? (
        <section className="rounded-md border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-medium">Round created successfully.</p>
          <p className="mt-1 break-all">Round ID: {roundId}</p>
          <p className="mt-1">Join code: {joinCode}</p>
        </section>
      ) : null}

      {layoutsError ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to load layouts: {layoutsError.message}
        </p>
      ) : null}

      <form action={createRoundAction} className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <label className="block space-y-1 text-sm">
          <span>Layout</span>
          <select
            name="layout_id"
            required
            defaultValue={layouts && layouts.length > 0 ? layouts[0].id : ""}
            className="w-full rounded border border-zinc-300 px-3 py-2"
          >
            {layouts?.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name} (Par {layout.total_par}, {layout.total_distance_m}m)
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!layouts || layouts.length === 0}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Create active round
        </button>
      </form>

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
