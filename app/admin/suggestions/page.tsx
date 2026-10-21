import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { pickOne } from "@/lib/supabase/select-helpers";
import {
  SUGGESTION_PHOTO_BUCKET,
  buildAgentPrompt,
  suggestionKindLabel,
  type SuggestionStatus,
} from "@/lib/courses/course-suggestions";
import { formatRoundDate } from "@/lib/format/round-date";
import { pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SuggestionReviewActions } from "./review-actions";

const STATUSES: { value: SuggestionStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "applied", label: "Applied" },
  { value: "rejected", label: "Not applied" },
];

const PHOTO_LINK_SECONDS = 60 * 60;

type PageProps = {
  searchParams: Promise<{ status?: string }>;
};

/** Owner-only review of course suggestions (`app_admins`); everyone else gets a 404. */
export default async function SuggestionsReviewPage({ searchParams }: PageProps) {
  const supabase = await createServerClient();
  const { data: isAdmin } = await supabase.rpc("is_app_admin");
  if (!isAdmin) {
    notFound();
  }

  const { status: rawStatus } = await searchParams;
  const status = STATUSES.find((s) => s.value === rawStatus)?.value ?? "new";

  const [{ data: rows, error }, ...counts] = await Promise.all([
    supabase
      .from("course_suggestions")
      .select(
        "id, kind, note, photo_paths, status, owner_note, created_at, course_name, location, courses(name, slug), layouts(name), holes(hole_number), profiles(display_name)"
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(100),
    ...STATUSES.map((s) =>
      supabase
        .from("course_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("status", s.value)
    ),
  ]);

  const paths = (rows ?? []).flatMap((row) => row.photo_paths);
  const { data: signed } =
    paths.length > 0
      ? await supabase.storage.from(SUGGESTION_PHOTO_BUCKET).createSignedUrls(paths, PHOTO_LINK_SECONDS)
      : { data: [] };
  const urlByPath = new Map(
    (signed ?? []).flatMap((s) => (s.path && s.signedUrl ? [[s.path, s.signedUrl] as const] : []))
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h1 className={cn(pageTitleClassName, "min-w-0 flex-1")}>Course suggestions</h1>
          <Link
            href="/auth"
            aria-label="Back to profile"
            className="-mr-2 inline-flex shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
        </div>
        <p className={pageSubtitleClassName}>
          Apply accepted ones through the seed JSON (Copy for agent), push, then mark them applied.
        </p>
      </header>

      <nav className="flex gap-2" aria-label="Filter by status">
        {STATUSES.map((s, index) => (
          <Link
            key={s.value}
            href={`/admin/suggestions?status=${s.value}`}
            aria-current={s.value === status ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              s.value === status ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground"
            )}
          >
            {s.label} <span className="font-mono tabular-nums">{counts[index]?.count ?? 0}</span>
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
          Could not load suggestions.
        </p>
      ) : null}

      {!error && (rows ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : null}

      <ul className="space-y-4">
        {(rows ?? []).map((row) => {
          const course = pickOne(row.courses);
          const layout = pickOne(row.layouts);
          const hole = pickOne(row.holes);
          const sender = pickOne(row.profiles);
          const photoUrls = row.photo_paths.flatMap((p) => {
            const url = urlByPath.get(p);
            return url ? [url] : [];
          });
          const courseLabel = row.kind === "new_course" ? row.course_name : course?.name;

          return (
            <li key={row.id} className="space-y-3 rounded-lg border px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">
                    {course ? (
                      <Link href={`/courses/${course.slug}`} className="underline-offset-4 hover:underline">
                        {courseLabel}
                      </Link>
                    ) : (
                      (courseLabel ?? "Unknown course")
                    )}
                    {layout ? <span className="text-muted-foreground"> · {layout.name}</span> : null}
                    {hole ? <span className="text-muted-foreground"> · Hole {hole.hole_number}</span> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {sender?.display_name ?? "Someone"} · {formatRoundDate(row.created_at)}
                    {row.location ? ` · ${row.location}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {suggestionKindLabel(row.kind)}
                </Badge>
              </div>

              <p className="whitespace-pre-line text-sm">{row.note}</p>

              {photoUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {photoUrls.map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                      <img
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="size-24 rounded-lg border object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : null}

              {row.owner_note ? (
                <p className="text-sm text-muted-foreground">Your note: {row.owner_note}</p>
              ) : null}

              <SuggestionReviewActions
                id={row.id}
                status={row.status as SuggestionStatus}
                agentPrompt={buildAgentPrompt({
                  id: row.id,
                  kind: row.kind,
                  courseName: courseLabel ?? null,
                  courseSlug: course?.slug ?? null,
                  layoutName: layout?.name ?? null,
                  holeNumber: hole?.hole_number ?? null,
                  location: row.location,
                  note: row.note,
                  createdAt: row.created_at,
                  photoUrls,
                })}
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
