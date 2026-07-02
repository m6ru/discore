import { HomeSectionsSkeleton } from "@/components/home/sections-skeleton";

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading home"
    >
      <header className="space-y-1">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted/70" />
      </header>

      <HomeSectionsSkeleton />
    </main>
  );
}
