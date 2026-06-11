import { useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeaderboardRow, HoleRow, ParticipantRow } from "../round-types";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { ScoringPlayerRoster } from "./scoring-player-roster";

const STROKE_MIN = 1;
const STROKE_MAX = 25;

/** Bottom inset for fixed save bar (abandon link + button + padding + safe area). */
export const ACTIVE_SCORING_BOTTOM_INSET =
  "calc(7rem + env(safe-area-inset-bottom, 0px))";

type Props = {
  activeHole: HoleRow;
  holesLength: number;
  scoringParticipants: ParticipantRow[];
  leaderboardRows: LeaderboardRow[];
  currentHoleIndex: number;
  isLastHole: boolean;
  isSubmitting: boolean;
  isTransitioning: boolean;
  getParticipantLabel: (participant: ParticipantRow) => string;
  getStrokeInputValue: (participantId: string) => string;
  isObChecked: (participantId: string) => boolean;
  onStrokeChange: (participantId: string, value: string) => void;
  onObToggle: (participantId: string, checked: boolean) => void;
  onPreviousHole: () => void;
  onNextHole: () => void;
  onSaveAndAdvanceHole: () => void;
  onAbandonRound: () => void;
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

function firstParticipantWithoutHoleScore(
  participants: ParticipantRow[],
  getStrokeInputValue: (id: string) => string
): string | null {
  for (const participant of participants) {
    if (!getStrokeInputValue(participant.id).trim()) {
      return participant.id;
    }
  }
  return participants[0]?.id ?? null;
}

type CompactStepperProps = {
  par: number;
  value: string;
  disabled: boolean;
  onStrokeChange: (value: string) => void;
};

function CompactStepper({ par, value, disabled, onStrokeChange }: CompactStepperProps) {
  const parsed = parseStrokeValue(value);
  const displayValue = parsed ?? par;

  const handleDecrement = () => {
    const next = parsed === null ? Math.max(STROKE_MIN, par - 1) : Math.max(STROKE_MIN, parsed - 1);
    onStrokeChange(String(next));
  };

  const handleIncrement = () => {
    const next = parsed === null ? Math.min(STROKE_MAX, par + 1) : Math.min(STROKE_MAX, parsed + 1);
    onStrokeChange(String(next));
  };

  const canDecrement = !disabled && displayValue > STROKE_MIN;
  const canIncrement = !disabled && displayValue < STROKE_MAX;

  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        type="button"
        variant="outline"
        className="min-h-14 rounded-xl text-lg"
        aria-label="Decrease strokes"
        disabled={!canDecrement}
        onClick={handleDecrement}
      >
        <Minus className="size-6" aria-hidden />
      </Button>
      <div
        className={cn(
          "flex min-h-14 items-center justify-center rounded-xl border-2 bg-background",
          "font-mono text-4xl font-semibold tabular-nums tracking-tight text-foreground"
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {displayValue}
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-14 rounded-xl text-lg"
        aria-label="Increase strokes"
        disabled={!canIncrement}
        onClick={handleIncrement}
      >
        <Plus className="size-6" aria-hidden />
      </Button>
    </div>
  );
}

export function ActiveHoleScoring({
  activeHole,
  holesLength,
  scoringParticipants,
  leaderboardRows,
  currentHoleIndex,
  isLastHole,
  isSubmitting,
  isTransitioning,
  getParticipantLabel,
  getStrokeInputValue,
  isObChecked,
  onStrokeChange,
  onObToggle,
  onPreviousHole,
  onNextHole,
  onSaveAndAdvanceHole,
  onAbandonRound,
}: Props) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    () => firstParticipantWithoutHoleScore(scoringParticipants, getStrokeInputValue)
  );

  const selectedParticipant =
    scoringParticipants.find((p) => p.id === selectedParticipantId) ??
    scoringParticipants[0] ??
    null;

  const canGoBack = currentHoleIndex > 0;
  const canGoForward = currentHoleIndex < holesLength - 1;

  const selectParticipant = (participantId: string) => {
    setSelectedParticipantId(participantId);
  };

  if (!selectedParticipant) {
    return (
      <p className="text-sm text-muted-foreground">No participants available for scoring.</p>
    );
  }

  const selectedLabel = getParticipantLabel(selectedParticipant);
  const obChecked = isObChecked(selectedParticipant.id);

  return (
    <>
      <div className="space-y-5">
        <ScoringPlayerRoster
          scoringParticipants={scoringParticipants}
          leaderboardRows={leaderboardRows}
          selectedParticipantId={selectedParticipant.id}
          getParticipantLabel={getParticipantLabel}
          getStrokeInputValue={getStrokeInputValue}
          onSelectParticipant={selectParticipant}
          disabled={isSubmitting}
        />

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
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

        <div className="space-y-3">
          <p className="text-center text-sm font-medium text-foreground">{selectedLabel}</p>
          <CompactStepper
            par={activeHole.par}
            value={getStrokeInputValue(selectedParticipant.id)}
            disabled={isSubmitting}
            onStrokeChange={(value) => onStrokeChange(selectedParticipant.id, value)}
          />
          <div className="flex justify-center">
            <Button
              type="button"
              variant={obChecked ? "destructive" : "outline"}
              className="min-h-11 min-w-[5.5rem] rounded-xl text-sm font-semibold uppercase tracking-wide"
              aria-pressed={obChecked}
              aria-label={`Toggle OB for ${selectedLabel}`}
              disabled={isSubmitting}
              onClick={() => onObToggle(selectedParticipant.id, !obChecked)}
            >
              OB
            </Button>
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto w-full max-w-3xl space-y-2">
          <div className="text-center">
            <ConfirmActionDialog
              title="Abandon this round?"
              description="Scores won't be saved to history. You can always start a new round later."
              confirmLabel="Abandon round"
              onConfirm={onAbandonRound}
              disabled={isSubmitting || isTransitioning}
              trigger={
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs text-muted-foreground"
                  disabled={isSubmitting || isTransitioning}
                >
                  {isTransitioning ? "Working..." : "Abandon round"}
                </Button>
              }
            />
          </div>
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
