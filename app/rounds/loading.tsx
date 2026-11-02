import { pageTitleClassName } from "@/lib/ui/page-chrome";

const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading history"
    >
      <h1 className={pageTitleClassName}>History</h1>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-[86px] animate-pulse rounded-md bg-muted" />
        <div className="h-[86px] animate-pulse rounded-md bg-muted" />
      </div>
      <ul className="border-t border-foreground">
        {SKELETON_ROWS.map((row) => (
          <li key={row} className="flex items-center gap-3 border-b py-[11px]">
            <div className="h-3 w-[42px] shrink-0 animate-pulse rounded bg-muted/70" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted/70" />
            </div>
            <div className="h-5 w-8 shrink-0 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </main>
  );
}
