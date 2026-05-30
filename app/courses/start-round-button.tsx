"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDraftRound } from "@/lib/rounds/create-draft-round";
import { Button } from "@/components/ui/button";

type Props = {
  layoutId: string;
  label?: string;
  className?: string;
};

export function StartRoundButton({ layoutId, label = "Start round", className }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
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
        router.push("/auth?message=Please+sign+in+to+continue");
        return;
      }

      const result = await createDraftRound(supabase, layoutId, user.id);

      if (!result.ok) {
        if (result.existingRoundId) {
          router.push(`/rounds/${result.existingRoundId}`);
          router.refresh();
          return;
        }
        setError(result.message);
        return;
      }

      router.push(`/rounds/${result.roundId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={className}>
      <Button type="button" disabled={isSubmitting} onClick={() => void onStart()}>
        {isSubmitting ? "Creating..." : label}
      </Button>
      {error ? (
        <p className="mt-2 rounded-md border bg-muted p-2 text-xs text-muted-foreground">{error}</p>
      ) : null}
    </div>
  );
}
