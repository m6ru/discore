const SKELETON_ROWS = ["a", "b", "c", "d", "e"];

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-2 pb-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="h-9 w-32 animate-pulse rounded bg-muted" />
      <div className="flex items-center gap-3.5">
        <div className="size-16 animate-pulse rounded-md bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
        </div>
      </div>
      <ul className="border-t border-foreground">
        {SKELETON_ROWS.map((row) => (
          <li key={row} className="border-b py-4">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    </main>
  );
}
