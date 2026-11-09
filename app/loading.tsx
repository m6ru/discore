import { HomeSectionsSkeleton } from "@/components/home/sections-skeleton";

export default function Loading() {
  return (
    <>
      <div className="bg-primary">
        <div className="mx-auto w-full max-w-3xl px-4 pb-[52px] sm:px-8">
          <div className="flex min-h-14 items-center">
            <div className="h-6 w-24 animate-pulse rounded bg-primary-foreground/20" />
          </div>
        </div>
      </div>
      <main
        className="mx-auto -mt-10 flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-4 sm:px-8 sm:pb-8"
        aria-busy="true"
        aria-label="Loading home"
      >
        <HomeSectionsSkeleton />
      </main>
    </>
  );
}
