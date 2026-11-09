import { homeFrameClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";

export function HomeSectionsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading home">
      {/* Opaque like the real first frame, which overlaps the forest band. */}
      <div className={homeFrameClassName}>
        <div className="h-4 w-28 animate-pulse rounded bg-muted-foreground/15" />
        <div className="h-7 w-48 animate-pulse rounded bg-muted-foreground/15" />
        <div className="h-12 animate-pulse rounded bg-muted-foreground/15" />
      </div>
      <div className="space-y-2">
        <div className={`${sectionHeadingClassName} h-4 w-28 animate-pulse rounded bg-muted`} />
        <div className="h-11 animate-pulse rounded bg-muted/70" />
      </div>
    </div>
  );
}
