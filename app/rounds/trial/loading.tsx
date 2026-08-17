import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";

export default function Loading() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
      aria-busy="true"
      aria-label="Loading trial round"
    >
      <header className="space-y-1">
        <h1 className={pageTitleClassName}>Trial round</h1>
        <p className={pageSubtitleClassName}>Loading your local scorecard.</p>
      </header>
      <div className="h-8 animate-pulse rounded bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted/70" />
    </main>
  );
}
