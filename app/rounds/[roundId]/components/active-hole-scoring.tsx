import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeaderboardRow, HoleRow, ParticipantRow } from "../round-types";
import { ScoringPlayerRoster } from "./scoring-player-roster";

const STROKE_MIN = 1;
const STROKE_MAX = 25;

/** Scroll padding so content clears the fixed bottom scoring deck. */
export const ACTIVE_SCORING_BOTTOM_INSET =
  "calc(12rem + env(safe-area-inset-bottom, 0px))";

type Props = {
  activeHole: HoleRow;
  holesLength: number;
  scoringParticipants: ParticipantRow[];
  leaderboardRows: LeaderboardRow[];
  currentHoleIndex: number;
  isLastHole: boolean;
  isSubmitting: boolean;
  getParticipantLabel: (participant: ParticipantRow) => string;
  teePositionByParticipantId: ReadonlyMap<string, number>;
  getStrokeInputValue: (participantId: string) => string;
  isObChecked: (participantId: string) => boolean;
  onStrokeChange: (participantId: string, value: string) => void;
  onObToggle: (participantId: string, checked: boolean) => void;
  onPreviousHole: () => void;
  onSaveAndAdvanceHole: () => void;
  scorecardSlot: ReactNode;
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
  const isImplicitPar = parsed === null;
  const displayValue = parsed ?? par;

  const handleDecrement = () => {
    const next = isImplicitPar
      ? Math.max(STROKE_MIN, par - 1)
      : Math.max(STROKE_MIN, parsed - 1);
    onStrokeChange(String(next));
  };

  const handleIncrement = () => {
    const next = isImplicitPar ? par : Math.min(STROKE_MAX, parsed + 1);
    onStrokeChange(String(next));
  };

  const canDecrement = !disabled && (isImplicitPar ? par > STROKE_MIN : parsed > STROKE_MIN);
  const canIncrement = !disabled && (isImplicitPar ? par < STROKE_MAX : parsed < STROKE_MAX);

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
          "font-mono text-4xl font-semibold tabular-nums tracking-tight",
          isImplicitPar ? "text-muted-foreground/35" : "text-foreground"
        )}
        aria-live="polite"
        aria-atomic="true"
        aria-label={
          isImplicitPar ? `Suggested par ${par}, tap + or − to set score` : `Score ${displayValue}`
        }
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
  getParticipantLabel,
  teePositionByParticipantId,
  getStrokeInputValue,
  isObChecked,
  onStrokeChange,
  onObToggle,
  onPreviousHole,
  onSaveAndAdvanceHole,
  scorecardSlot,
}: Props) {
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    () => firstParticipantWithoutHoleScore(scoringParticipants, getStrokeInputValue)
  );

  const selectedParticipant =
    scoringParticipants.find((p) => p.id === selectedParticipantId) ??
    scoringParticipants[0] ??
    null;

  const canGoBack = currentHoleIndex > 0;

  if (!selectedParticipant) {
    return (
      <p className="text-sm text-muted-foreground">No participants available for scoring.</p>
    );
  }

  const selectedLabel = getParticipantLabel(selectedParticipant);
  const obChecked = isObChecked(selectedParticipant.id);
  const allHoleScoresEntered = scoringParticipants.every(
    (participant) => getStrokeInputValue(participant.id).trim().length > 0
  );

  return (
    <>
      <div className="space-y-5">
        <div className="text-center">
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

        <ScoringPlayerRoster
          scoringParticipants={scoringParticipants}
          leaderboardRows={leaderboardRows}
          selectedParticipantId={selectedParticipant.id}
          getParticipantLabel={getParticipantLabel}
          teePositionByParticipantId={teePositionByParticipantId}
          getStrokeInputValue={getStrokeInputValue}
          isObChecked={isObChecked}
          onSelectParticipant={setSelectedParticipantId}
          disabled={isSubmitting}
        />

        {scorecardSlot}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <p className="text-center text-sm font-medium text-foreground">{selectedLabel}</p>
          <CompactStepper
            par={activeHole.par}
            value={getStrokeInputValue(selectedParticipant.id)}
            disabled={isSubmitting}
            onStrokeChange={(value) => onStrokeChange(selectedParticipant.id, value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl"
              aria-label="Previous hole"
              disabled={!canGoBack || isSubmitting}
              onClick={onPreviousHole}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant={obChecked ? "destructive" : "outline"}
              className="min-h-11 rounded-xl text-sm font-semibold uppercase tracking-wide"
              aria-pressed={obChecked}
              aria-label={`Toggle OB for ${selectedLabel}`}
              disabled={isSubmitting}
              onClick={() => onObToggle(selectedParticipant.id, !obChecked)}
            >
              OB
            </Button>
            <Button
              type="button"
              variant="default"
              className="min-h-11 rounded-xl"
              aria-label={isLastHole ? "Save scores" : "Save and go to next hole"}
              disabled={isSubmitting || !allHoleScoresEntered}
              onClick={() => void onSaveAndAdvanceHole()}
            >
              {isSubmitting ? (
                <span className="text-sm">…</span>
              ) : (
                <ChevronRight className="size-5" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
