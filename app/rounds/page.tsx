import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatStatusLabel,
  statusBadgeVariant,
} from "@/lib/rounds/format-round-status";

function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function RoundsHistoryPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?message=Please+sign+in+to+view+round+history");
  }

  const { data, error } = await supabase
    .from("rounds")
    .select(
      "id, status, started_at, completed_at, layouts(name, courses(name)), round_participants!inner(user_id)"
    )
    .eq("round_participants.user_id", user.id)
    .in("status", ["active", "completed", "abandoned"])
    .order("started_at", { ascending: false, nullsFirst: false });

  const rounds = data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Round history</h1>
        <p className="text-sm text-muted-foreground">Your past and active rounds.</p>
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load rounds: {error.message}
        </p>
      ) : null}

      {!error && rounds.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No rounds yet</CardTitle>
            <CardDescription>
              Start one from the home screen or browse courses to pick a layout.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {rounds.length > 0 ? (
        <ul className="space-y-3">
          {rounds.map((round) => {
            const layout = pickOne(round.layouts);
            const course = pickOne(layout?.courses);
            const dateLabel = formatDate(round.completed_at ?? round.started_at);

            return (
              <li key={round.id}>
                <Link href={`/rounds/${round.id}`} className="block">
                  <Card className="py-4 transition-colors hover:bg-accent/40">
                    <CardHeader className="gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="truncate text-base">
                          {course?.name ?? "Unknown course"}
                        </CardTitle>
                        <Badge variant={statusBadgeVariant(round.status)}>
                          {formatStatusLabel(round.status)}
                        </Badge>
                      </div>
                      <CardDescription>
                        {layout?.name ?? "Unknown layout"} · {dateLabel}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
