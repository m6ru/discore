"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadLocalTrial, type LocalTrialRound } from "@/lib/local-round";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import {
  homeRowMetaClassName,
  homeRowTitleClassName,
  pagePrimaryButtonClassName,
} from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

export function ContinueTrialCard() {
  const [trial, setTrial] = useState<LocalTrialRound | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read client-only trial after mount
    setTrial(loadLocalTrial());
  }, []);

  if (!trial) {
    return null;
  }

  const isCompleted = trial.status === "completed";
  const dateLabel = formatRoundDisplayDate(trial.completedAt, trial.startedAt);

  return (
    <section className="space-y-2">
      <h2 className={sectionHeadingClassName}>
        {isCompleted ? "Save this round" : trial.status === "setup" ? "Set up round" : "Continue round"}
      </h2>
      <div className="space-y-3 rounded-lg bg-muted/60 px-4 py-3">
        <div className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0 space-y-0.5">
            <p className={homeRowTitleClassName}>{trial.courseName}</p>
            <p className={homeRowMetaClassName}>
              {trial.layoutName}
              {dateLabel ? ` · ${dateLabel}` : null}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            Trial
          </Badge>
        </div>
        {isCompleted ? (
          <div className="space-y-2">
            <Button asChild size="lg" className={pagePrimaryButtonClassName}>
              <Link href="/auth">Create account to save</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className={pagePrimaryButtonClassName}>
              <Link href="/rounds/trial">View scorecard</Link>
            </Button>
          </div>
        ) : (
          <Button asChild size="lg" className={pagePrimaryButtonClassName}>
            <Link href="/rounds/trial">{trial.status === "setup" ? "Set up round" : "Continue round"}</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
