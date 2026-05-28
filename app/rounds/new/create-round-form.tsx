"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type LayoutOption = {
  id: string;
  name: string;
  total_par: number;
  total_distance_m: number;
};

type Props = {
  layouts: LayoutOption[];
};

export function CreateRoundForm({ layouts }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [layoutId, setLayoutId] = useState<string>(layouts[0]?.id ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!layoutId) {
      setError("Missing layout selection");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(`Session check failed: ${userError.message}`);
        return;
      }

      if (!user) {
        setError("No authenticated session in browser. Please sign in again.");
        return;
      }

      const roundId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from("rounds")
        .insert({
          id: roundId,
          layout_id: layoutId,
          scorer_id: user.id,
          status: "draft",
        });

      if (insertError) {
        if (
          insertError.code === "23505" &&
          (insertError.details ?? "").includes("rounds_one_active_per_scorer_idx")
        ) {
          setError("You already have an active round. Finish it before creating a new one.");
          return;
        }

        setError(
          [
            `Round create failed: ${insertError.message}`,
            `code=${insertError.code ?? "n/a"}`,
            `details=${insertError.details ?? "n/a"}`,
            `hint=${insertError.hint ?? "n/a"}`,
          ].join(" | ")
        );
        return;
      }

      // The scorer is enrolled into `round_participants` automatically by the
      // `ensure_scorer_participant_trigger` Postgres trigger on insert.

      router.push(`/rounds/${roundId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-zinc-200 p-4">
        <label className="block space-y-1 text-sm">
          <span>Layout</span>
          <select
            name="layout_id"
            required
            value={layoutId}
            onChange={(event) => setLayoutId(event.target.value)}
            className="w-full rounded border border-zinc-300 px-3 py-2"
          >
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name} (Par {layout.total_par}, {layout.total_distance_m}m)
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={isSubmitting || layouts.length === 0}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Creating..." : "Create draft round"}
        </button>
      </form>
    </>
  );
}
