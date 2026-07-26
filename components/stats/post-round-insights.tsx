"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { PostRoundInsights } from "@/lib/rounds/load-player-stats";
import { formatVsPar } from "@/lib/scoring/stats";
import { Button } from "@/components/ui/button";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

type Props = {
  insights: PostRoundInsights;
  onDismiss: () => void;
};

function deltaVsPar(thisVsPar: number, otherVsPar: number): string {
  return formatVsPar(thisVsPar - otherVsPar);
}

export function PostRoundInsightsCard({ insights, onDismiss }: Props) {
  const statsHref =
    insights.courseSlug && insights.layoutSlug
      ? `/courses/${insights.courseSlug}/stats?layout=${insights.layoutSlug}`
      : null;

  const headline = insights.isFirstOnLayout
    ? "First round on this layout"
    : insights.isNewBest
      ? "New best on this layout"
      : "Round complete";

  return (
    <section className="space-y-2 rounded-lg bg-muted/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className={sectionHeadingClassName}>{headline}</h2>
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {formatVsPar(insights.vsPar)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="-mr-1 -mt-1 size-8 shrink-0 text-muted-foreground"
          onClick={onDismiss}
          aria-label="Dismiss insights"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </div>

      <ul className="space-y-1 text-sm text-muted-foreground">
        {insights.aceCount > 0 ? (
          <li>
            {insights.aceCount === 1
              ? "1 ace this round"
              : `${insights.aceCount} aces this round`}
          </li>
        ) : null}
        {!insights.isNewBest && insights.lastRound ? (
          <li>
            <span className="font-mono font-medium tabular-nums text-foreground">
              {deltaVsPar(insights.vsPar, insights.lastRound.vsPar)}
            </span>
            {" vs last ("}
            <span className="font-mono tabular-nums">
              {formatVsPar(insights.lastRound.vsPar)}
            </span>
            {")"}
          </li>
        ) : null}
      </ul>

      {statsHref ? (
        <p className="pt-1 text-sm">
          <Link
            href={statsHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            All stats on {insights.layoutName}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
