"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { CircleCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  COURSE_FIX_KINDS,
  SUGGESTION_MAX_PHOTOS,
  uploadSuggestionPhoto,
  type CourseFixKind,
} from "@/lib/courses/course-suggestions";
import { friendlyError } from "@/lib/ui/friendly-error";
import { pagePrimaryButtonClassName, textareaClassName } from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { toastError } from "@/lib/ui/toast-notify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuggestionPhotoPicker } from "@/components/courses/suggestion-photo-picker";

type Props = {
  userId: string;
  /** null = suggesting a new course. */
  course: { id: string; name: string } | null;
  layouts: { id: string; name: string }[];
  backHref: string;
  /** Pre-fills the new course name (e.g. from an empty course search). */
  initialCourseName?: string;
};

const NOTE_PLACEHOLDER: Record<CourseFixKind | "new_course", string> = {
  hole_info: "e.g. Hole 7 is now par 4, 112 m (new tee sign).",
  layout_changed: "What changed? e.g. holes 3–5 moved, new baskets this season.",
  new_layout: "Name of the layout and its holes (number, par, length) — or add a photo of the course board.",
  course_closed: "Since when, and is it permanent?",
  other: "What should we know?",
  new_course:
    "Number of baskets, holes (number, par, length) if you know them, a website… A photo of the course board works too.",
};

export function SuggestionForm({ userId, course, layouts, backHref, initialCourseName = "" }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const isNewCourse = course === null;

  const [kind, setKind] = useState<CourseFixKind>("hole_info");
  const [layoutId, setLayoutId] = useState<string>(layouts.length === 1 ? layouts[0]!.id : "");
  const [courseName, setCourseName] = useState(initialCourseName);
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) {
      toastError("Please add a short note.");
      return;
    }
    if (isNewCourse && !courseName.trim()) {
      toastError("Please add the course name.");
      return;
    }

    setIsSending(true);

    const uploads = await Promise.all(photos.map((file) => uploadSuggestionPhoto(supabase, userId, file)));
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
            location,
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

  if (sent) {
    return (
      <div className="space-y-4 rounded-lg bg-muted/60 px-4 py-6 text-center">
        <CircleCheck className="mx-auto size-8 text-primary" aria-hidden />
        <div className="space-y-1">
          <p className="font-medium">Thanks — we&apos;ll review it.</p>
          <p className="text-sm text-muted-foreground">
            You&apos;ll see a note on Home once it&apos;s in the app.
          </p>
        </div>
        <Button asChild size="lg" variant="outline" className={pagePrimaryButtonClassName}>
          <Link href={backHref}>{isNewCourse ? "Back to courses" : "Back to the course"}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-6">
      {isNewCourse ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="suggest-course-name">Course name</Label>
            <Input
              id="suggest-course-name"
              value={courseName}
              maxLength={200}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. Männiku discgolfipark"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggest-location">Location</Label>
            <Input
              id="suggest-location"
              value={location}
              maxLength={200}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Town or address"
            />
          </div>
        </div>
      ) : (
        <>
          <fieldset className="space-y-2">
            <legend className={sectionHeadingClassName}>What&apos;s wrong?</legend>
            <div className="grid gap-2">
              {COURSE_FIX_KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={kind === option.value}
                  onClick={() => setKind(option.value)}
                  className={cn(
                    "min-h-11 rounded-xl border px-4 text-left text-sm transition-colors",
                    kind === option.value
                      ? "border-primary bg-primary/10 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {layouts.length > 1 && kind !== "course_closed" && kind !== "new_layout" ? (
            <div className="space-y-2">
              <Label htmlFor="suggest-layout">Layout</Label>
              <select
                id="suggest-layout"
                value={layoutId}
                onChange={(e) => setLayoutId(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base md:text-sm"
              >
                <option value="">Not sure / all layouts</option>
                {layouts.map((layout) => (
                  <option key={layout.id} value={layout.id}>
                    {layout.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="suggest-note">{isNewCourse ? "What you know" : "Details"}</Label>
        <textarea
          id="suggest-note"
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          placeholder={NOTE_PLACEHOLDER[isNewCourse ? "new_course" : kind]}
          className={textareaClassName}
        />
      </div>

      <div className="space-y-2">
        <p className={sectionHeadingClassName}>Photos (optional, up to {SUGGESTION_MAX_PHOTOS})</p>
        <SuggestionPhotoPicker photos={photos} onChange={setPhotos} />
        <p className="text-xs text-muted-foreground">
          Tee signs and course boards are the most useful. Only the Discore team sees them.
        </p>
      </div>

      <Button type="submit" size="lg" className={pagePrimaryButtonClassName} disabled={isSending}>
        {isSending ? "Sending…" : "Send suggestion"}
      </Button>
    </form>
  );
}
