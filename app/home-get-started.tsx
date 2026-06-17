"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getRemainingGetStartedItems } from "@/lib/onboarding/get-started-items";
import { hasViewedHistory, HISTORY_VIEWED_STORAGE_KEY } from "@/lib/onboarding/history-viewed";
import {
  homeRowLinkClassName,
  homeRowTitleClassName,
} from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

type Props = {
  hasJoinedRound: boolean;
  profileOnboardingComplete: boolean;
};

export function HomeGetStarted({ hasJoinedRound, profileOnboardingComplete }: Props) {
  const [historyViewed, setHistoryViewed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read client-only onboarding flag after mount
    setHistoryViewed(hasViewedHistory());
  }, []);

  useEffect(() => {
    const syncHistoryViewed = () => setHistoryViewed(hasViewedHistory());

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === HISTORY_VIEWED_STORAGE_KEY) {
        syncHistoryViewed();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncHistoryViewed();
      }
    };

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const remaining = getRemainingGetStartedItems({
    hasJoinedRound,
    historyViewed,
    profileOnboardingComplete,
  });

  if (remaining.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className={sectionHeadingClassName}>Get started</h2>
      <ul>
        {remaining.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className={homeRowLinkClassName}>
              <span className={homeRowTitleClassName}>{item.label}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
