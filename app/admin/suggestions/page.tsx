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
import { pageTitleClassName } from "@/lib/ui/page-chrome";
import { cn } from "@/lib/utils";
import { MoveBackToNew, SuggestionReviewActions } from "./review-actions";

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
        "id, kind, note, photo_paths, status, owner_note, created_at, course_name, location, lat, lng, basket_count, courses(name, slug), layouts(name), holes(hole_number), profiles(display_name)"
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

  const items = (rows ?? []).map((row) => {
    const course = pickOne(row.courses);
    const layout = pickOne(row.layouts);
    const hole = pickOne(row.holes);
    const photoUrls = row.photo_paths.flatMap((p) => {
      const url = urlByPath.get(p);
      return url ? [url] : [];
    });
    const courseLabel = (row.kind === "new_course" ? row.course_name : course?.name) ?? "Unknown course";
    const where = [layout?.name, hole ? `Hole ${hole.hole_number}` : null].filter(Boolean).join(" · ");
    return { row, course, layout, hole, photoUrls, courseLabel, where, sender: pickOne(row.profiles) };
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-[18px] p-4 sm:p-8">
      <header className="space-y-2.5">
        <Link
          href="/auth"
          aria-label="Back to profile"
          className="-ml-3 inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
        >
          <ChevronLeft className="size-[22px]" aria-hidden />
        </Link>
        <h1 className={pageTitleClassName}>Course suggestions</h1>
        <p className="text-sm text-muted-foreground">Copy for agent, apply it in a PR, then mark it applied.</p>
      </header>

      <nav className="flex gap-[22px] border-b" aria-label="Filter by status">
        {STATUSES.map((s, index) => {
          const active = s.value === status;
          return (
            <Link
              key={s.value}
              href={`/admin/suggestions?status=${s.value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 flex-col justify-center gap-1.5 pt-1 text-[15px]",
                active ? "font-bold text-foreground" : "font-medium text-muted-foreground"
              )}
            >
              <span>
                {s.label} <span className="font-mono tabular-nums">{counts[index]?.count ?? 0}</span>
              </span>
              <span className={cn("h-[3px] rounded-full", active ? "bg-good" : "bg-transparent")} />
            </Link>
          );
        })}
      </nav>

      {error ? (
        <p className="rounded-lg border bg-muted p-3 text-sm text-muted-foreground">
          Could not load suggestions.
        </p>
      ) : null}

      {!error && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : null}

      {status === "new" ? (
        <ul className="space-y-3.5">
          {items.map(({ row, course, layout, hole, photoUrls, courseLabel, where, sender }) => (
            <li key={row.id} className="space-y-3 rounded-md border border-input p-4">
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-primary">
                  {suggestionKindLabel(row.kind)}
                </span>
                <span className="shrink-0 text-[13px] text-muted-foreground">{shortDate(row.created_at)}</span>
              </div>
              <div className="space-y-1">
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  {course ? (
                    <Link href={`/courses/${course.slug}`} className="underline-offset-4 hover:underline">
                      {courseLabel}
                    </Link>
                  ) : (
                    courseLabel
                  )}
                  {where ? <span className="font-medium text-muted-foreground"> · {where}</span> : null}
                </h2>
                <p className="text-[13px] text-muted-foreground">
                  From {sender?.display_name ?? "someone"}
                  {row.location ? ` · ${row.location}` : ""}
                  {row.basket_count !== null ? (
                    <>
                      {" · "}
                      <span className="font-mono">{row.basket_count}</span> baskets
                    </>
                  ) : null}
                  {row.lat !== null && row.lng !== null ? (
                    <>
                      {" · "}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${row.lat},${row.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary"
                      >
                        Map
                      </a>
                    </>
                  ) : null}
                </p>
              </div>

              {row.note ? <p className="whitespace-pre-line text-[15px] leading-normal">{row.note}</p> : null}

              {photoUrls.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {photoUrls.map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                      <img src={url} alt={`Photo ${index + 1}`} className="size-full rounded-md bg-muted object-cover" />
                    </a>
                  ))}
                </div>
              ) : null}

              <SuggestionReviewActions
                id={row.id}
                agentPrompt={buildAgentPrompt({
                  id: row.id,
                  kind: row.kind,
                  courseName: courseLabel,
                  courseSlug: course?.slug ?? null,
                  layoutName: layout?.name ?? null,
                  holeNumber: hole?.hole_number ?? null,
                  location: row.location,
                  lat: row.lat,
                  lng: row.lng,
                  basketCount: row.basket_count,
                  note: row.note,
                  createdAt: row.created_at,
                  photoUrls,
                })}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="-mt-1">
          {items.map(({ row, courseLabel, where }) => (
            <li key={row.id} className="flex flex-col gap-1 border-b py-3.5">
              <div className="flex items-baseline justify-between gap-2.5">
                <span className="font-semibold">
                  {courseLabel}
                  {where ? <span className="font-medium text-muted-foreground"> · {where}</span> : null}
                </span>
                <span className="shrink-0 text-[13px] text-muted-foreground">{shortDate(row.created_at)}</span>
              </div>
              <span className="text-[13px] text-muted-foreground">
                {suggestionKindLabel(row.kind)}
                {row.owner_note ? ` · “${row.owner_note}”` : ""}
              </span>
              <MoveBackToNew id={row.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
