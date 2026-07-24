import Link from "next/link";

type Props = {
  courseSlug: string;
  layoutSlug: string;
  layoutName: string;
};

/** Quiet bridge from a finished round to layout-scoped stats. */
export function FinishedRoundStatsLink({ courseSlug, layoutSlug, layoutName }: Props) {
  return (
    <p className="text-sm text-muted-foreground">
      <Link
        href={`/courses/${courseSlug}/stats?layout=${layoutSlug}`}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        All stats on {layoutName}
      </Link>
    </p>
  );
}
