import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"];

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading courses"
    >
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>Courses</h1>
        <p className={pageSubtitleClassName}>Pick a course to play.</p>
      </header>

      <div className="space-y-4">
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <ul className="space-y-2">
          {SKELETON_ROWS.map((row) => (
            <li key={row} className="rounded-lg border px-4 py-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted/70" />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
