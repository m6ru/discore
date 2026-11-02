import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { PostRoundInsights } from "@/lib/rounds/load-player-stats";
import { formatVsPar } from "@/lib/scoring/stats";

type Props = {
  /** Only for the player who just finished; null otherwise. */
  insights: PostRoundInsights | null;
  courseSlug: string;
  layoutSlug: string;
  layoutName: string;
};

function insightLine(insights: PostRoundInsights): string {
  const parts: string[] = [];
  if (insights.isFirstOnLayout) {
    parts.push(`First round on ${insights.layoutName}.`);
  } else if (insights.isNewBest) {
    parts.push(`New best on ${insights.layoutName}.`);
  } else if (insights.lastRound) {
    const delta = insights.vsPar - insights.lastRound.vsPar;
    parts.push(
      delta === 0
        ? `Same as your last round here (${formatVsPar(insights.lastRound.vsPar)}).`
        : `${Math.abs(delta)} ${delta < 0 ? "better" : "more"} than your last round here (${formatVsPar(insights.lastRound.vsPar)}).`
    );
  }
  if (insights.aceCount > 0) {
    parts.push(insights.aceCount === 1 ? "1 ace!" : `${insights.aceCount} aces!`);
  }
  return parts.join(" ");
}

/** "Your round": the viewer's own moment (if any) and their stats on this layout. */
export function YourRound({ insights, courseSlug, layoutSlug, layoutName }: Props) {
  const line = insights ? insightLine(insights) : "";

  return (
    <section className="space-y-1.5 border-t pt-3">
      {line ? (
        <p className="text-sm leading-snug text-foreground/85">
          <span className="font-bold text-foreground">Your round:</span> {line}
        </p>
      ) : null}
      <Link
        href={`/courses/${courseSlug}/stats?layout=${layoutSlug}`}
        className="flex min-h-11 items-center justify-between text-[15px] font-semibold text-primary"
      >
        Your stats on {layoutName}
        <ChevronRight className="size-[18px]" aria-hidden />
      </Link>
    </section>
  );
}
