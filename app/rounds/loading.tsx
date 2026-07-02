import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";

const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading history"
    >
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>History</h1>
        <p className={pageSubtitleClassName}>Your rounds — stats coming later.</p>
      </header>

      <ul className="space-y-2">
        {SKELETON_ROWS.map((row) => (
          <li
            key={row}
            className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
            </div>
            <div className="h-5 w-10 shrink-0 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </main>
  );
}
