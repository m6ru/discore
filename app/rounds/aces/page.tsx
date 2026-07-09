import Link from "next/link";
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
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
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
        <ul className="space-y-2">
          {aces.map((ace) => {
            const dateLabel = formatRoundDisplayDate(ace.completedAt, null) ?? "—";
            const metaParts = [ace.courseName, ace.layoutName, dateLabel];

            return (
              <li key={`${ace.roundId}-${ace.holeNumber}`}>
                <Link
                  href={`/rounds/${ace.roundId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">Hole {ace.holeNumber}</p>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {metaParts.join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-primary">View round</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
