"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, Camera, Check, ChevronDown, ChevronLeft, MapPin, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  COURSE_FIX_KINDS,
  SUGGESTION_MAX_PHOTOS,
  uploadSuggestionPhoto,
  type CourseFixKind,
} from "@/lib/courses/course-suggestions";
import { distanceKm, formatDistanceKm, readDeviceLocation, type UserCoords } from "@/lib/courses/distance";
import { AVATAR_ACCEPT_ATTR } from "@/lib/profiles/upload-avatar";
import { friendlyError } from "@/lib/ui/friendly-error";
import { pageTitleClassName, textareaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { toastError } from "@/lib/ui/toast-notify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SuggestionPhotoPicker } from "@/components/courses/suggestion-photo-picker";

export type NearbyCandidate = { name: string; slug: string; location: string; lat: number; lng: number };

type Props = {
  userId: string;
  /** null = suggesting a new course. */
  course: { id: string; name: string } | null;
  layouts: { id: string; name: string }[];
  /** Courses with coordinates, for "Is it one of these?" (new course only). */
  knownCourses: NearbyCandidate[];
  backHref: string;
  /** Pre-fills the new course name (e.g. from an empty course search). */
  initialCourseName?: string;
};

const NOTE_PLACEHOLDER: Record<CourseFixKind, string> = {
  hole_info: "e.g. Hole 7 is now par 4, 112 m (new tee sign).",
  layout_changed: "What changed? e.g. holes 3–5 moved, new baskets this season.",
  new_layout: "Name of the layout and its holes (number, par, length) — or add a photo of the course board.",
  course_closed: "Since when, and is it permanent?",
  other: "What should we know?",
};

/** Same-course duplicates are usually within a couple of km; the county is named within 15. */
const NEARBY_KM = 3;
const REGION_KM = 15;
const BASKETS_MIN = 1;
const BASKETS_MAX = 99;

/** Seed locations read "<place>, <county>, Estonia"; the county is the useful part. */
function countyOf(location: string): string {
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 ? parts[parts.length - 2]! : (parts[0] ?? "");
}

const fieldClassName = "h-12 bg-card text-base";
const labelClassName = "text-sm font-semibold";
const dividedClassName = "border-t pt-4";

export function SuggestionForm({ userId, course, layouts, knownCourses, backHref, initialCourseName = "" }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const isNewCourse = course === null;

  const [kind, setKind] = useState<CourseFixKind>("hole_info");
  const [layoutId, setLayoutId] = useState<string>(layouts.length === 1 ? layouts[0]!.id : "");
  const [courseName, setCourseName] = useState(initialCourseName);
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [typeTown, setTypeTown] = useState(false);
  const [town, setTown] = useState("");
  const [baskets, setBaskets] = useState(18);
  const [board, setBoard] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const nearby = useMemo(() => {
    if (!coords) {
      return [];
    }
    return knownCourses
      .map((c) => ({ ...c, km: distanceKm(coords, c) }))
      .sort((a, b) => a.km - b.km);
  }, [coords, knownCourses]);
  const region = nearby[0] && nearby[0].km <= REGION_KM ? countyOf(nearby[0].location) : "";
  const lookalikes = nearby.filter((c) => c.km <= NEARBY_KM).slice(0, 3);

  const allPhotos = board ? [board, ...photos] : photos;

  async function locateMe() {
    setIsLocating(true);
    try {
      setCoords(await readDeviceLocation());
      setTypeTown(false);
    } catch {
      toastError("Couldn't get your location. Type the town instead.");
      setTypeTown(true);
    } finally {
      setIsLocating(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (isNewCourse) {
      if (!courseName.trim()) {
        toastError("Please add the course name.");
        return;
      }
      if (!coords && !town.trim()) {
        toastError("Please add where the course is.");
        return;
      }
      if (allPhotos.length === 0) {
        toastError("Please add a photo of the course board or a layout map.");
        return;
      }
    } else if (!note.trim()) {
      toastError("Please add a short note.");
      return;
    }

    setIsSending(true);

    const uploads = await Promise.all(allPhotos.map((file) => uploadSuggestionPhoto(supabase, userId, file)));
    const failed = uploads.find((u) => !u.ok);
    if (failed && !failed.ok) {
      toastError(failed.message);
      setIsSending(false);
      return;
    }
    const photoPaths = uploads.flatMap((u) => (u.ok ? [u.path] : []));

    const { error } = await supabase.from("course_suggestions").insert(
      isNewCourse
        ? {
            kind: "new_course",
            course_name: courseName,
            location: coords ? region || null : town,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            basket_count: baskets,
            note,
            photo_paths: photoPaths,
          }
        : {
            kind,
            course_id: course.id,
            layout_id: layoutId || null,
            note,
            photo_paths: photoPaths,
          }
    );

    setIsSending(false);
    if (error) {
      // Trigger messages (e.g. the daily limit) are written for users.
      toastError(
        error.code === "P0001" ? error.message : friendlyError("Could not send the suggestion", error)
      );
      return;
    }
    setSent(true);
  }

  const backLink = (
    <Link
      href={backHref}
      aria-label={isNewCourse ? "Back to courses" : "Back to the course"}
      className="-ml-3 inline-flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
    >
      <ChevronLeft className="size-[22px]" aria-hidden />
    </Link>
  );

  if (sent) {
    return (
      <div className="flex flex-1 flex-col">
        {backLink}
        <div className="mt-20 flex flex-col items-start gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-good text-primary">
            <Check className="size-7" strokeWidth={2.5} aria-hidden />
          </span>
          <h1 className={pageTitleClassName}>Thanks, got it</h1>
          <p className="text-[15px] leading-normal text-foreground/80">
            {isNewCourse
              ? `We'll check it and add ${courseName.trim()}.`
              : `We'll check it and fix ${course.name}.`}{" "}
            You&apos;ll see a note on Home when it&apos;s in the app.
          </p>
        </div>
        <div className="flex-1" />
        <Button asChild variant="outline" className="min-h-14 w-full border-foreground text-base font-semibold">
          <Link href={backHref}>{isNewCourse ? "Back to courses" : "Back to the course"}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-7"
      style={{ paddingBottom: "calc(9rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <header className="space-y-2.5">
        {backLink}
        <h1 className={pageTitleClassName}>{isNewCourse ? "Suggest a course" : "Suggest a fix"}</h1>
        <p className="text-[15px] text-foreground/80">
          {isNewCourse ? "Tell us where it is. A photo of the course board or map does the rest." : course.name}
        </p>
      </header>

      {isNewCourse ? (
        <>
          <div className="space-y-1.5">
            <label htmlFor="suggest-course-name" className={labelClassName}>
              Course name
            </label>
            <Input
              id="suggest-course-name"
              value={courseName}
              maxLength={200}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Männiku discgolfipark"
              className={fieldClassName}
            />
          </div>

          <section className="space-y-2.5">
            {typeTown && !coords ? (
              <>
                <label htmlFor="suggest-town" className={labelClassName}>
                  Where is it?
                </label>
                <Input
                  id="suggest-town"
                  value={town}
                  maxLength={200}
                  onChange={(e) => setTown(e.target.value)}
                  placeholder="Town or address"
                  className={fieldClassName}
                />
                <p className="text-[13px] text-muted-foreground">
                  At the course?{" "}
                  <button
                    type="button"
                    onClick={() => void locateMe()}
                    className="font-semibold text-primary"
                  >
                    Use where you are now
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className={labelClassName}>Where is it?</p>
                {coords ? (
                  <div className="flex items-center gap-3 rounded-md border border-input bg-card p-3.5">
                    <LocationDot />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-semibold">Where you are now</span>
                      <span className="text-[13px] text-muted-foreground">
                        {region ? `${region} · ` : null}
                        <span className="font-mono">
                          {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoords(null)}
                      className="min-h-11 px-1 text-sm font-semibold text-muted-foreground"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void locateMe()}
                    disabled={isLocating}
                    className="flex w-full items-center gap-3 rounded-md border border-input bg-card p-3.5 text-left"
                  >
                    <LocationDot />
                    <span className="font-semibold">{isLocating ? "Finding you…" : "Use where you are now"}</span>
                  </button>
                )}
                <p className="text-[13px] text-muted-foreground">
                  Not at the course?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setCoords(null);
                      setTypeTown(true);
                    }}
                    className="font-semibold text-primary"
                  >
                    Type the town instead
                  </button>
                </p>
              </>
            )}
          </section>

          {lookalikes.length > 0 ? (
            <section aria-label="Already in the app nearby" className="space-y-2 border-l-[3px] border-good py-0.5 pl-3.5">
              <p className="text-sm font-semibold">Is it one of these?</p>
              {lookalikes.map((c) => (
                <Link
                  key={c.slug}
                  href={`/courses/${c.slug}`}
                  className="flex min-h-11 items-center justify-between gap-2.5"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">{c.name}</span>
                    <span className="text-[13px] text-muted-foreground">
                      <span className="font-mono">{formatDistanceKm(c.km).replace(" km", "")}</span> km away
                      {countyOf(c.location) ? ` · ${countyOf(c.location)}` : null}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-primary">Open</span>
                </Link>
              ))}
              <p className="text-[13px] text-muted-foreground">Not it? Carry on below.</p>
            </section>
          ) : null}

          <section className={cn(dividedClassName, "flex items-center justify-between gap-3")}>
            <span className={labelClassName} id="suggest-baskets">
              Baskets
            </span>
            <span className="flex items-center gap-1" role="group" aria-labelledby="suggest-baskets">
              <StepButton
                label="Fewer baskets"
                disabled={baskets <= BASKETS_MIN}
                onClick={() => setBaskets((n) => Math.max(BASKETS_MIN, n - 1))}
              >
                −
              </StepButton>
              <span className="min-w-11 text-center font-mono text-xl font-semibold" aria-live="polite">
                {baskets}
              </span>
              <StepButton
                label="More baskets"
                disabled={baskets >= BASKETS_MAX}
                onClick={() => setBaskets((n) => Math.min(BASKETS_MAX, n + 1))}
              >
                +
              </StepButton>
            </span>
          </section>

          <section className={cn(dividedClassName, "space-y-3")}>
            <h2 className={sectionHeadingClassName}>Photos</h2>
            <BoardSlot file={board} onChange={setBoard} />
            <div className="space-y-2">
              <p className="text-[13px] font-semibold text-foreground/80">More photos · tee signs, a second board</p>
              <SuggestionPhotoPicker
                photos={photos}
                onChange={setPhotos}
                max={SUGGESTION_MAX_PHOTOS - 1}
                firstIndex={board ? 2 : 1}
              />
            </div>
          </section>

          <div className={cn(dividedClassName, "space-y-1.5")}>
            <label htmlFor="suggest-note" className={labelClassName}>
              Anything else
            </label>
            <textarea
              id="suggest-note"
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A website, layouts, who looks after it…"
              className={cn(textareaClassName, "min-h-24 bg-card text-base md:text-base")}
            />
          </div>
        </>
      ) : (
        <>
          <fieldset>
            <legend className={cn(sectionHeadingClassName, "mb-1.5")}>What&apos;s wrong?</legend>
            {COURSE_FIX_KINDS.map((option) => (
              <label
                key={option.value}
                className="flex min-h-[52px] cursor-pointer items-center gap-3 border-b py-1.5"
              >
                <input
                  type="radio"
                  name="suggest-kind"
                  value={option.value}
                  checked={kind === option.value}
                  onChange={() => setKind(option.value)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "size-5 shrink-0 rounded-full peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50",
                    kind === option.value ? "border-[6px] border-primary" : "border-2 border-[#b9b8ae]"
                  )}
                />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className={kind === option.value ? "font-bold" : "font-semibold"}>{option.question}</span>
                  {option.hint ? <span className="text-[13px] text-muted-foreground">{option.hint}</span> : null}
                </span>
              </label>
            ))}
          </fieldset>

          {layouts.length > 1 && kind !== "course_closed" && kind !== "new_layout" ? (
            <div className="space-y-1.5">
              <label htmlFor="suggest-layout" className={labelClassName}>
                Layout
              </label>
              <span className="relative flex items-center">
                <select
                  id="suggest-layout"
                  value={layoutId}
                  onChange={(e) => setLayoutId(e.target.value)}
                  className="h-12 w-full appearance-none rounded-md border border-input bg-card pr-10 pl-3.5 text-base"
                >
                  <option value="">Not sure / all layouts</option>
                  {layouts.map((layout) => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 size-4 text-muted-foreground" aria-hidden />
              </span>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="suggest-note" className={labelClassName}>
              What&apos;s changed?
            </label>
            <textarea
              id="suggest-note"
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder={NOTE_PLACEHOLDER[kind]}
              className={cn(textareaClassName, "min-h-24 bg-card text-base md:text-base")}
            />
          </div>

          <section className="space-y-2.5">
            <div className="space-y-0.5">
              <h2 className={sectionHeadingClassName}>Photos</h2>
              <p className="text-[13px] text-muted-foreground">A photo of the tee sign helps most.</p>
            </div>
            <SuggestionPhotoPicker photos={photos} onChange={setPhotos} />
          </section>
        </>
      )}

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background px-5 pt-3.5"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto w-full max-w-3xl space-y-2">
          <Button
            type="submit"
            className="min-h-14 w-full justify-between px-[18px] text-base font-semibold"
            disabled={isSending}
          >
            {isSending ? "Sending…" : "Send suggestion"}
            <ArrowRight className="size-5" aria-hidden />
          </Button>
          <p className="text-center text-[13px] text-muted-foreground">
            {isNewCourse
              ? allPhotos.length > 0
                ? `${allPhotos.length} ${allPhotos.length === 1 ? "photo" : "photos"} · we'll let you know when it's added`
                : "We'll let you know when it's added"
              : "We'll let you know when it's fixed"}
          </p>
        </div>
      </div>
    </form>
  );
}

function LocationDot() {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e8efd0] text-primary">
      <MapPin className="size-5" aria-hidden />
    </span>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="size-11 rounded-md border border-input text-xl disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** The one photo that matters most for a new course. */
function BoardSlot({ file, onChange }: { file: File | null; onChange: (file: File | null) => void }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
  }, [preview]);

  if (file && preview) {
    return (
      <div className="flex min-h-[72px] items-center gap-3 rounded-md border border-input bg-card p-2.5 pr-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
        <img src={preview} alt="Photo 1" className="size-14 shrink-0 rounded object-cover" />
        <span className="flex-1 font-semibold">Course board or map</span>
        <button
          type="button"
          aria-label="Remove the course board photo"
          onClick={() => onChange(null)}
          className="flex size-11 items-center justify-center text-muted-foreground"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <label className="flex min-h-[72px] cursor-pointer items-center gap-3 rounded-md border border-dashed border-primary bg-[#f1f4e6] px-3.5 py-3">
      <Camera className="size-[22px] shrink-0 text-primary" aria-hidden />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">Course board or map</span>
        <span className="text-[13px] text-foreground/80">The board at the first tee, or a screenshot of the layout. This helps most.</span>
      </span>
      <input
        type="file"
        accept={AVATAR_ACCEPT_ATTR}
        className="sr-only"
        aria-label="Add the course board photo"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null;
          e.target.value = "";
          onChange(picked);
        }}
      />
    </label>
  );
}
