const SKELETON_FIELDS = ["a", "b", "c", "d"];

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading profile"
    >
      <header className="space-y-1">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted/70" />
      </header>

      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-xl bg-muted/60" />
        {SKELETON_FIELDS.map((field) => (
          <div key={field} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-muted/70" />
            <div className="h-10 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </main>
  );
}
