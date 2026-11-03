"use client";

import { useEffect, useMemo } from "react";
import { Plus, X } from "lucide-react";
import { SUGGESTION_MAX_PHOTOS } from "@/lib/courses/course-suggestions";
import { AVATAR_ACCEPT_ATTR } from "@/lib/profiles/upload-avatar";

type Props = {
  photos: File[];
  onChange: (photos: File[]) => void;
  /** How many this grid may hold (the new course form keeps one slot for the board). */
  max?: number;
  /** Numbers the thumbnails after photos shown elsewhere on the form. */
  firstIndex?: number;
};

/** Square thumbnails with a + tile; the files are uploaded on send. */
export function SuggestionPhotoPicker({ photos, onChange, max = SUGGESTION_MAX_PHOTOS, firstIndex = 1 }: Props) {
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  return (
    <div className="grid grid-cols-4 gap-2">
      {previews.map((src, index) => (
        <div key={src} className="relative aspect-square overflow-hidden rounded-md bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={src} alt={`Photo ${firstIndex + index}`} className="size-full object-cover" />
          <button
            type="button"
            aria-label={`Remove photo ${firstIndex + index}`}
            onClick={() => onChange(photos.filter((_, i) => i !== index))}
            className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-foreground/70 text-background"
          >
            <X className="size-3.5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      ))}
      {photos.length < max ? (
        <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md border border-dashed border-[#b9b8ae] text-primary hover:bg-muted/50">
          <Plus className="size-[22px]" aria-hidden />
          <input
            type="file"
            accept={AVATAR_ACCEPT_ATTR}
            multiple
            className="sr-only"
            aria-label="Add photos"
            onChange={(e) => {
              // Copy now: clearing the input empties the live FileList.
              const added = Array.from(e.target.files ?? []);
              e.target.value = "";
              onChange([...photos, ...added].slice(0, max));
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
