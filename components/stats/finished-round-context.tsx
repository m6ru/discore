import Link from "next/link";
import type { FinishedRoundContext } from "@/lib/rounds/load-player-stats";
import { formatVsPar } from "@/lib/scoring/stats";
import { homeRowMetaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { cn } from "@/lib/utils";

type Props = {
  context: FinishedRoundContext;
};

function deltaVsPar(thisVsPar: number, otherVsPar: number): string {
  return formatVsPar(thisVsPar - otherVsPar);
}

export function FinishedRoundContextPanel({ context }: Props) {
  const { distribution } = context;
  const distributionRows = [
    { key: "ace", label: "Ace", count: distribution.ace },
    ...(distribution.eagle > 0
      ? [{ key: "eagle", label: "Eagle", count: distribution.eagle }]
      : []),
    { key: "birdie", label: "Birdie", count: distribution.birdie },
    { key: "par", label: "Par", count: distribution.par },
    { key: "bogey", label: "Bogey", count: distribution.bogey },
    { key: "double", label: "Double+", count: distribution.doublePlus },
  ];

  const statsHref =
    context.courseSlug && context.layoutSlug
      ? `/courses/${context.courseSlug}/stats?layout=${context.layoutSlug}`
      : null;

  return (
    <section className="space-y-2">
      <h2 className={sectionHeadingClassName}>This round</h2>

      <div className="space-y-3 rounded-lg bg-muted/60 px-4 py-3">
        <dl className="grid grid-cols-2 gap-4 [&_dd]:ml-0">
          <div className="text-center">
            <dt className={homeRowMetaClassName}>Vs par</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums">
              {formatVsPar(context.vsPar)}
            </dd>
          </div>
          <div className="text-center">
            <dt className={homeRowMetaClassName}>OB holes</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums">{context.obHoles}</dd>
          </div>
        </dl>

        <div
          className={cn(
            "grid gap-2 border-t border-border/50 pt-3 justify-items-center text-center",
            distribution.eagle > 0 ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-5"
          )}
        >
          {distributionRows.map((row) => (
            <div key={row.key} className="min-w-0 w-full">
              <p className="truncate text-xs text-muted-foreground">{row.label}</p>
              <p className="font-mono text-sm font-semibold tabular-nums">{row.count}</p>
            </div>
          ))}
        </div>

        {context.roundsPlayedOnLayout > 1 || context.isNewBest ? (
          <div className="space-y-2 border-t border-border/50 pt-3">
            <p className="text-xs font-semibold text-muted-foreground">On this layout</p>

            {context.isNewBest ? (
              <p className="text-sm font-medium">
                {context.roundsPlayedOnLayout <= 1 ? "First round on this layout" : "New best"}
              </p>
            ) : context.bestVsPar !== null && context.bestRoundId ? (
              <p className="text-sm">
                <span className="font-mono font-semibold tabular-nums">
                  {deltaVsPar(context.vsPar, context.bestVsPar)}
                </span>
                <span className="text-muted-foreground"> vs best (</span>
                <Link
                  href={`/rounds/${context.bestRoundId}`}
                  className="font-mono font-semibold tabular-nums text-primary underline-offset-4 hover:underline"
                >
                  {formatVsPar(context.bestVsPar)}
                </Link>
                <span className="text-muted-foreground">)</span>
              </p>
            ) : null}

            {context.lastRound ? (
              <p className="text-sm">
                <span className="font-mono font-semibold tabular-nums">
                  {deltaVsPar(context.vsPar, context.lastRound.vsPar)}
                </span>
                <span className="text-muted-foreground"> vs last (</span>
                <Link
                  href={`/rounds/${context.lastRound.roundId}`}
                  className="font-mono font-semibold tabular-nums text-primary underline-offset-4 hover:underline"
                >
                  {formatVsPar(context.lastRound.vsPar)}
                </Link>
                <span className="text-muted-foreground">)</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {statsHref ? (
          <div className="border-t border-border/50 pt-3">
            <Link
              href={statsHref}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              All stats on {context.layoutName}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
