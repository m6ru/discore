"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { describeHoleFix, uploadSuggestionPhoto } from "@/lib/courses/course-suggestions";
import { friendlyError } from "@/lib/ui/friendly-error";
import { textareaClassName } from "@/lib/ui/page-chrome";
import { toastError, toastSuccess } from "@/lib/ui/toast-notify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SuggestionPhotoPicker } from "@/components/courses/suggestion-photo-picker";
import type { HoleRow } from "../round-types";

const PAR_MIN = 2;
const PAR_MAX = 7;

type Props = {
  /** The hole being reported; null = closed. */
  hole: HoleRow | null;
  layoutId: string;
  userId: string;
  onClose: () => void;
};

/**
 * "Wrong info?" from the scoring screen: the hole's values pre-filled, the
 * player changes what's different on the tee sign. Opens over the round, so
 * scoring is untouched.
 */
export function HoleFixSheet({ hole, layoutId, userId, onClose }: Props) {
  return (
    <Dialog open={hole !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {hole ? (
          <HoleFixForm key={hole.id} hole={hole} layoutId={layoutId} userId={userId} onDone={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HoleFixForm({
  hole,
  layoutId,
  userId,
  onDone,
}: {
  hole: HoleRow;
  layoutId: string;
  userId: string;
  onDone: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const current = { par: hole.par, distanceM: hole.distance_m, notes: hole.notes ?? "" };
  const [par, setPar] = useState(hole.par);
  const [distance, setDistance] = useState(String(hole.distance_m));
  const [notes, setNotes] = useState(hole.notes ?? "");
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  async function send() {
    const distanceM = Number(distance);
    if (!Number.isInteger(distanceM) || distanceM < 1 || distanceM > 2000) {
      toastError("Enter the length in whole metres.");
      return;
    }
    const note = describeHoleFix(hole.hole_number, current, { par, distanceM, notes }, comment);
    if (note === null && photos.length === 0) {
      toastError("Change a value, add a comment or a photo first.");
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

    const { error } = await supabase.from("course_suggestions").insert({
      kind: "hole_info",
      layout_id: layoutId,
      hole_id: hole.id,
      note: note ?? `Hole ${hole.hole_number}: see photo`,
      photo_paths: uploads.flatMap((u) => (u.ok ? [u.path] : [])),
    });
    setIsSending(false);

    if (error) {
      // Keep the sheet open with everything filled in, so they can retry.
      toastError(
        error.code === "P0001" ? error.message : friendlyError("Could not send the suggestion", error)
      );
      return;
    }
    toastSuccess("Thanks — we'll review it.");
    onDone();
  }

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle>Hole {hole.hole_number} — wrong info?</DialogTitle>
        <DialogDescription>Change whatever is different on the tee sign.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Par</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Lower par"
              disabled={par <= PAR_MIN}
              onClick={() => setPar((p) => Math.max(PAR_MIN, p - 1))}
            >
              <Minus className="size-4" aria-hidden />
            </Button>
            <span
              className={cn(
                "w-6 text-center font-mono text-lg font-semibold tabular-nums",
                par !== current.par && "text-primary"
              )}
              aria-live="polite"
            >
              {par}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Raise par"
              disabled={par >= PAR_MAX}
              onClick={() => setPar((p) => Math.min(PAR_MAX, p + 1))}
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hole-fix-length">Length (m)</Label>
          <Input
            id="hole-fix-length"
            inputMode="numeric"
            value={distance}
            onChange={(e) => setDistance(e.target.value.replace(/\D/g, ""))}
            className="font-mono tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hole-fix-notes">Notes / OB rules</Label>
        <textarea
          id="hole-fix-notes"
          value={notes}
          maxLength={500}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. OB: the road on the left. Mando: left of the tree."
          className={cn(textareaClassName, "min-h-20")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hole-fix-comment">Comment (optional)</Label>
        <textarea
          id="hole-fix-comment"
          value={comment}
          maxLength={800}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything else, e.g. new tee pad, basket moved."
          className={cn(textareaClassName, "min-h-16")}
        />
      </div>

      <div className="space-y-2">
        <Label>Photo of the tee sign (optional)</Label>
        <SuggestionPhotoPicker photos={photos} onChange={setPhotos} />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="button"
          className="min-h-11 flex-1"
          disabled={isSending}
          onClick={() => void send()}
        >
          {isSending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
