"use client";

import { useEffect } from "react";
import { markHistoryViewed } from "@/lib/onboarding/history-viewed";

/** Marks History as seen for the home onboarding checklist. */
export function HistoryViewedMarker() {
  useEffect(() => {
    markHistoryViewed();
  }, []);

  return null;
}
