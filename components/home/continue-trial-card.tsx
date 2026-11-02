"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { loadLocalTrial, type LocalTrialRound } from "@/lib/local-round";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import {
  homeFrameClassName,
  homeFrameLabelClassName,
  homeFrameTitleClassName,
  homeRowMetaClassName,
  pagePrimaryButtonClassName,
} from "@/lib/ui/page-chrome";

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
    <section className={homeFrameClassName}>
      <h2 className={homeFrameLabelClassName}>
        {isCompleted ? "Save this round" : trial.status === "setup" ? "Set up round" : "Round in progress"}
      </h2>
      <div className="space-y-3.5">
        <p className={homeFrameTitleClassName}>{trial.courseName}</p>
        <p className={homeRowMetaClassName}>
          {trial.layoutName}
          {dateLabel ? ` · ${dateLabel}` : null} · not saved yet
        </p>
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
