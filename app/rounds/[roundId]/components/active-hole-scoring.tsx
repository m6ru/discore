import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HoleRow, ParticipantRow } from "../round-types";

const STROKE_MIN = 1;
const STROKE_MAX = 25;

/** Bottom inset for fixed save bar (button + padding + safe area). */
export const ACTIVE_SCORING_BOTTOM_INSET =
  "calc(5.5rem + env(safe-area-inset-bottom, 0px))";

type Props = {
  activeHole: HoleRow;
  holesLength: number;
  scoringParticipants: ParticipantRow[];
  currentHoleIndex: number;
  isLastHole: boolean;
  isSubmitting: boolean;
  getParticipantLabel: (participant: ParticipantRow) => string;
  getStrokeInputValue: (participantId: string) => string;
  isObChecked: (participantId: string) => boolean;
  onStrokeChange: (participantId: string, value: string) => void;
  onObToggle: (participantId: string, checked: boolean) => void;
  onPreviousHole: () => void;
  onNextHole: () => void;
  onSaveAndAdvanceHole: () => void;
};

function parseStrokeValue(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const strokes = Number(trimmed);
  if (!Number.isInteger(strokes)) {
    return null;
  }
  return strokes;
}

type StrokeStepperProps = {
  participantId: string;
  par: number;
  value: string;
  disabled: boolean;
  onStrokeChange: (participantId: string, value: string) => void;
};

function StrokeStepper({
  participantId,
  par,
  value,
  disabled,
  onStrokeChange,
}: StrokeStepperProps) {
  const parsed = parseStrokeValue(value);
  const canDecrement = !disabled && parsed !== null && parsed > STROKE_MIN;
  const canIncrement = !disabled && (parsed === null || parsed < STROKE_MAX);

  const handleDecrement = () => {
    if (parsed === null || parsed <= STROKE_MIN) {
      return;
    }
    onStrokeChange(participantId, String(parsed - 1));
  };

  const handleIncrement = () => {
    if (parsed === null) {
      onStrokeChange(participantId, String(par));
      return;
    }
    if (parsed < STROKE_MAX) {
      onStrokeChange(participantId, String(parsed + 1));
    }
  };

  return (
    <div className="flex min-h-11 flex-1 items-stretch gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="min-h-11 min-w-11 shrink-0 rounded-xl"
        aria-label="Decrease strokes"
        disabled={!canDecrement}
        onClick={handleDecrement}
      >
        <Minus className="size-5" aria-hidden />
      </Button>
      <div
        className={cn(
          "flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 bg-background px-2",
          "font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground"
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {parsed !== null ? parsed : "—"}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        className="min-h-11 min-w-11 shrink-0 rounded-xl"
        aria-label="Increase strokes"
        disabled={!canIncrement}
        onClick={handleIncrement}
      >
        <Plus className="size-5" aria-hidden />
      </Button>
    </div>
  );
}

export function ActiveHoleScoring({
  activeHole,
  holesLength,
  scoringParticipants,
  currentHoleIndex,
  isLastHole,
  isSubmitting,
  getParticipantLabel,
  getStrokeInputValue,
  isObChecked,
  onStrokeChange,
  onObToggle,
  onPreviousHole,
  onNextHole,
  onSaveAndAdvanceHole,
}: Props) {
  const canGoBack = currentHoleIndex > 0;
  const canGoForward = currentHoleIndex < holesLength - 1;

  return (
    <>
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Enter scores
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="min-h-11 min-w-11 shrink-0 rounded-xl"
              aria-label="Previous hole"
              disabled={!canGoBack || isSubmitting}
              onClick={onPreviousHole}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>

            <div className="min-w-0 flex-1 px-1">
              <p className="font-mono text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {activeHole.hole_number}
                <span className="text-xl font-normal text-muted-foreground">
                  {" "}
                  / {holesLength}
                </span>
              </p>
              <p className="mt-1 text-base text-muted-foreground">
                Par{" "}
                <span className="font-semibold text-foreground">{activeHole.par}</span>
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="min-h-11 min-w-11 shrink-0 rounded-xl"
              aria-label="Next hole"
              disabled={!canGoForward || isSubmitting}
              onClick={onNextHole}
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="space-y-5">
          {scoringParticipants.map((participant) => {
            const obChecked = isObChecked(participant.id);
            const label = getParticipantLabel(participant);

            return (
              <div key={participant.id} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <div className="flex items-stretch gap-2">
                  <StrokeStepper
                    participantId={participant.id}
                    par={activeHole.par}
                    value={getStrokeInputValue(participant.id)}
                    disabled={isSubmitting}
                    onStrokeChange={onStrokeChange}
                  />
                  <Button
                    type="button"
                    variant={obChecked ? "destructive" : "outline"}
                    className="h-auto min-h-11 w-16 shrink-0 rounded-xl text-sm font-semibold uppercase tracking-wide"
                    aria-pressed={obChecked}
                    aria-label={`Toggle OB for ${label}`}
                    disabled={isSubmitting}
                    onClick={() => onObToggle(participant.id, !obChecked)}
                  >
                    OB
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto w-full max-w-3xl">
          <Button
            type="button"
            size="lg"
            className="min-h-11 w-full"
            disabled={isSubmitting}
            onClick={() => void onSaveAndAdvanceHole()}
          >
            {isSubmitting ? "Saving…" : isLastHole ? "Save scores" : "Save & next hole"}
          </Button>
        </div>
      </div>
    </>
  );
}
