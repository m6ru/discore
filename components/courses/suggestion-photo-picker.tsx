"use client";

import { useEffect, useMemo } from "react";
import { ImagePlus, X } from "lucide-react";
import { SUGGESTION_MAX_PHOTOS } from "@/lib/courses/course-suggestions";
import { AVATAR_ACCEPT_ATTR } from "@/lib/profiles/upload-avatar";

type Props = {
  photos: File[];
  onChange: (photos: File[]) => void;
};

/** Up to three photos with thumbnails; the files are uploaded on send. */
export function SuggestionPhotoPicker({ photos, onChange }: Props) {
  const previews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  return (
    <div className="flex flex-wrap gap-2">
      {previews.map((src, index) => (
        <div key={src} className="relative size-20 overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img src={src} alt={`Photo ${index + 1}`} className="size-full object-cover" />
          <button
            type="button"
            aria-label={`Remove photo ${index + 1}`}
            onClick={() => onChange(photos.filter((_, i) => i !== index))}
            className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
      {photos.length < SUGGESTION_MAX_PHOTOS ? (
        <label className="flex size-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
          <ImagePlus className="size-5" aria-hidden />
          Add
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
              onChange([...photos, ...added].slice(0, SUGGESTION_MAX_PHOTOS));
            }}
          />
        </label>
      ) : null}
    </div>
  );
}
