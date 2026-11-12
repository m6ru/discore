import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import { loadAceLog } from "@/lib/rounds/load-player-stats";
import { createServerClient } from "@/lib/supabase/server";
import { homeRowMetaClassName, pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";

export default async function AceLogPage() {
  const supabase = await createServerClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    redirect("/auth?message=Please+sign+in+to+view+your+ace+log");
  }

  const { aces, error } = await loadAceLog(supabase);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 pt-2 pb-4 sm:p-8">
      <header className="space-y-1">
        <Link
          href="/rounds"
          aria-label="Back to history"
          className="-ml-2 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h1 className={pageTitleClassName}>Ace log</h1>
        <p className={pageSubtitleClassName}>Every hole-in-one from your completed rounds.</p>
      </header>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load ace log: {error}
        </p>
      ) : null}

      {!error && aces.length === 0 ? (
        <p className={homeRowMetaClassName}>No aces yet — keep throwing!</p>
      ) : null}

      {!error && aces.length > 0 ? (
        <ul className="border-t border-foreground">
          {aces.map((ace) => {
            const dateLabel = formatRoundDisplayDate(ace.completedAt, null) ?? "—";
            const metaParts = [`Hole ${ace.holeNumber}`, ace.layoutName, dateLabel];

            return (
              <li key={`${ace.roundId}-${ace.holeNumber}`}>
                <Link
                  href={`/rounds/${ace.roundId}`}
                  className="flex items-center gap-3 border-b py-3 transition-colors hover:bg-accent/50"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-good font-display text-lg font-semibold text-good-foreground">
                    {ace.holeNumber}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold">
                      {ace.courseName}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                      {metaParts.join(" · ")}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
