import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { detectImageKind, prepareJpegBlob } from "@/lib/profiles/upload-avatar";
import { friendlyError } from "@/lib/ui/friendly-error";

type Client = SupabaseClient<Database>;

export const SUGGESTION_PHOTO_BUCKET = "course-suggestion-photos";
export const SUGGESTION_MAX_PHOTOS = 3;
const PHOTO_MAX_DIMENSION = 1600;

/** Kinds offered on a course page ("Something's wrong?"). */
export const COURSE_FIX_KINDS = [
  { value: "hole_info", label: "Hole par or length" },
  { value: "layout_changed", label: "Layout changed or re-set" },
  { value: "new_layout", label: "New layout" },
  { value: "course_closed", label: "Course closed" },
  { value: "other", label: "Something else" },
] as const;

export type CourseFixKind = (typeof COURSE_FIX_KINDS)[number]["value"];
export type SuggestionKind = CourseFixKind | "new_course";
export type SuggestionStatus = "new" | "applied" | "rejected";

export function suggestionKindLabel(kind: string): string {
  if (kind === "new_course") {
    return "New course";
  }
  return COURSE_FIX_KINDS.find((k) => k.value === kind)?.label ?? kind;
}

/** Converts to a ≤1600 px JPEG and uploads into the sender's own folder. */
export async function uploadSuggestionPhoto(
  supabase: Client,
  userId: string,
  file: File
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const kind = detectImageKind(file);
  if (kind === null) {
    return { ok: false, message: "Photos must be JPEG, PNG, or HEIC images." };
  }

  let blob: Blob;
  try {
    blob = await prepareJpegBlob(file, kind, PHOTO_MAX_DIMENSION);
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not process the photo." };
  }

  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(SUGGESTION_PHOTO_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) {
    return { ok: false, message: friendlyError("Could not upload the photo", error) };
  }
  return { ok: true, path };
}

export type HoleValues = { par: number; distanceM: number; notes: string };

/**
 * The note for a "Wrong info?" suggestion from the scoring screen: what changed
 * on the hole, plus the player's comment. null when there's nothing to send.
 */
export function describeHoleFix(
  holeNumber: number,
  current: HoleValues,
  proposed: HoleValues,
  comment: string
): string | null {
  const changes: string[] = [];
  if (proposed.par !== current.par) {
    changes.push(`Par ${current.par} → ${proposed.par}`);
  }
  if (proposed.distanceM !== current.distanceM) {
    changes.push(`Length ${current.distanceM} → ${proposed.distanceM} m`);
  }
  const notesChanged = proposed.notes.trim() !== current.notes.trim();
  const trimmedComment = comment.trim();
  if (changes.length === 0 && !notesChanged && !trimmedComment) {
    return null;
  }

  const lines = [`Hole ${holeNumber}${changes.length > 0 ? `: ${changes.join(" · ")}` : ""}`];
  if (notesChanged) {
    lines.push(`Notes: "${current.notes.trim() || "(none)"}" → "${proposed.notes.trim() || "(none)"}"`);
  }
  if (trimmedComment) {
    lines.push("", trimmedComment);
  }
  return lines.join("\n");
}

export type AgentPromptInput = {
  id: string;
  kind: string;
  courseName: string | null;
  courseSlug: string | null;
  layoutName: string | null;
  holeNumber: number | null;
  location: string | null;
  note: string;
  createdAt: string;
  photoUrls: string[];
};

/**
 * Ready-to-paste prompt for a Claude Code session in the repo. Leaves out who
 * sent it: the result lands in a public repo.
 */
export function buildAgentPrompt(s: AgentPromptInput): string {
  const where =
    s.kind === "new_course"
      ? `New course: ${s.courseName ?? "?"}${s.location ? ` (${s.location})` : ""}`
      : `Course: ${s.courseName ?? "?"}${s.courseSlug ? ` (slug ${s.courseSlug})` : ""}` +
        (s.layoutName ? ` · Layout: ${s.layoutName}` : " · Layout: not specified") +
        (s.holeNumber !== null ? ` · Hole ${s.holeNumber}` : "");

  const lines = [
    `Apply this course suggestion from the Discore review page (id ${s.id}).`,
    `Follow supabase/seeds/README.md ("Adding a layout with an agent"): edit the seed JSON, generate the seed migration, open a PR. Never invent hole data — use only the note and photos; ask me if something is unclear. Load the disc-golf skill first.`,
    "",
    `Type: ${suggestionKindLabel(s.kind)}`,
    where,
    `Sent: ${s.createdAt.slice(0, 10)}`,
    "",
    "Note:",
    s.note,
  ];

  if (s.photoUrls.length > 0) {
    lines.push("", "Photos (download links valid for 1 hour):", ...s.photoUrls.map((url) => `- ${url}`));
  }
  return lines.join("\n");
}
