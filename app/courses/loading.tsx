import { pageTitleClassName } from "@/lib/ui/page-chrome";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"];

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading courses"
    >
      <h1 className={pageTitleClassName}>Courses</h1>
      <div className="h-12 animate-pulse rounded-md bg-muted" />
      <ul className="border-t border-foreground">
        {SKELETON_ROWS.map((row) => (
          <li key={row} className="border-b py-[13px]">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted/70" />
          </li>
        ))}
      </ul>
    </main>
  );
}
