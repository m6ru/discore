"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { claimLocalTrialIfNeeded } from "@/lib/local-round";
import { toastError, toastSuccess } from "@/lib/ui/toast-notify";

export function ClaimTrialOnAuth() {
  const supabase = useMemo(() => createClient(), []);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    void claimLocalTrialIfNeeded(supabase).then((result) => {
      if (!result.ok) {
        toastError(result.message);
        return;
      }
      if (result.outcome === "claimed") {
        toastSuccess("Your trial round was saved to history.");
      }
    });
  }, [supabase]);

  return null;
}
