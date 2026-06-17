import { sectionHeadingClassName } from "@/lib/ui/section-heading";

export function HomeSectionsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading home">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-11 animate-pulse rounded bg-muted/70" />
        <div className="h-11 animate-pulse rounded bg-muted/70" />
      </div>
      <div className="space-y-2">
        <div className={`${sectionHeadingClassName} h-4 w-28 animate-pulse rounded bg-muted`} />
        <div className="h-11 animate-pulse rounded bg-muted/70" />
      </div>
    </div>
  );
}
