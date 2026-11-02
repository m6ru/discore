import { useState, type ReactNode } from "react";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LeaderboardRow, HoleRow, ParticipantRow } from "../round-types";
import { ScoringPlayerRoster } from "./scoring-player-roster";
import { ActiveHoleStatus } from "./active-hole-status";

const STROKE_MIN = 1;
const STROKE_MAX = 25;

/** Scroll padding so content clears the fixed bottom scoring deck. */
export const ACTIVE_SCORING_BOTTOM_INSET =
  "calc(13rem + env(safe-area-inset-bottom, 0px))";

/** One entry per hole in play order (a round started on hole 7 still fills left to right). */
export type HoleProgress = "done" | "current" | "todo";

type Props = {
  activeHole: HoleRow;
  holesLength: number;
  progress: HoleProgress[];
  onOpenScorecard: () => void;
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
  hideRunningScores?: boolean;
  /** Rendered just above the bottom deck. */
  syncBadge?: ReactNode;
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

function getNextParticipantId(participants: ParticipantRow[], currentId: string): string {
  const index = participants.findIndex((participant) => participant.id === currentId);
  if (index === -1) {
    return participants[0]!.id;
  }
  return participants[(index + 1) % participants.length]!.id;
}

/** "4 of 18 played" over a slim bar; tapping it opens the scorecard. */
function RoundProgress({
  progress,
  onOpenScorecard,
}: {
  progress: HoleProgress[];
  onOpenScorecard: () => void;
}) {
  const played = progress.filter((state) => state === "done").length;

  return (
    <button
      type="button"
      onClick={onOpenScorecard}
      aria-label={`${played} of ${progress.length} holes played. Open the scorecard`}
      className="flex min-h-11 w-full flex-col justify-center gap-2 text-left"
    >
      <span className="text-[13px] text-muted-foreground">
        <span className="font-mono font-semibold text-foreground">{played}</span> of{" "}
        <span className="font-mono font-semibold text-foreground">{progress.length}</span> played
      </span>
      <span
        className="grid w-full gap-0.5"
        style={{ gridTemplateColumns: `repeat(${progress.length}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {progress.map((state, index) => (
          <span
            key={index}
            className={cn(
              "h-1 rounded-[1px]",
              state === "done" ? "bg-primary" : state === "current" ? "bg-primary/45" : "bg-border"
            )}
          />
        ))}
      </span>
    </button>
  );
}

type StepperProps = {
  playerLabel: string;
  par: number;
  value: string;
  disabled: boolean;
  onStrokeChange: (value: string) => void;
};

function Stepper({ playerLabel, par, value, disabled, onStrokeChange }: StepperProps) {
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

  // The score column only needs room for two digits; the buttons share the rest.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_100px_minmax(0,1fr)] items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-18 border-[1.5px] border-foreground shadow-none"
        aria-label="Decrease strokes"
        disabled={!canDecrement}
        onClick={handleDecrement}
      >
        <Minus className="size-7" aria-hidden />
      </Button>
      <div className="flex min-w-0 flex-col items-center gap-0.5">
        <span className="max-w-full truncate text-[13px] font-semibold text-muted-foreground">
          {playerLabel}
        </span>
        <span
          className={cn(
            "font-display text-[52px] font-semibold leading-none tabular-nums",
            isImplicitPar ? "text-muted-foreground/35" : "text-foreground"
          )}
          aria-live="polite"
          aria-atomic="true"
          aria-label={
            isImplicitPar ? `Suggested par ${par}, tap + or − to set score` : `Score ${displayValue}`
          }
        >
          {displayValue}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        className="h-18 border-[1.5px] border-foreground bg-accent shadow-none"
        aria-label="Increase strokes"
        disabled={!canIncrement}
        onClick={handleIncrement}
      >
        <Plus className="size-7" aria-hidden />
      </Button>
    </div>
  );
}

export function ActiveHoleScoring({
  activeHole,
  holesLength,
  progress,
  onOpenScorecard,
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
  hideRunningScores = false,
  syncBadge,
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
  const currentPlayerHasScore = getStrokeInputValue(selectedParticipant.id).trim().length > 0;
  const showNextPlayer =
    scoringParticipants.length > 1 && !allHoleScoresEntered && currentPlayerHasScore;
  const nextParticipantId = getNextParticipantId(scoringParticipants, selectedParticipant.id);
  const nextParticipant = scoringParticipants.find((p) => p.id === nextParticipantId);

  const forwardLabel = showNextPlayer
    ? `Next: ${nextParticipant ? getParticipantLabel(nextParticipant) : "player"}`
    : isLastHole
      ? "Save scores"
      : "Next hole";

  const handleForwardClick = () => {
    if (showNextPlayer) {
      setSelectedParticipantId(nextParticipantId);
      return;
    }
    void onSaveAndAdvanceHole();
  };

  return (
    <>
      <div className="space-y-4">
        <RoundProgress progress={progress} onOpenScorecard={onOpenScorecard} />
        <ActiveHoleStatus activeHole={activeHole} holesLength={holesLength} />
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
          hideRunningScores={hideRunningScores}
        />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background px-5 pt-3.5"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))" }}
      >
        {syncBadge}
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <Stepper
            playerLabel={selectedLabel}
            par={activeHole.par}
            value={getStrokeInputValue(selectedParticipant.id)}
            disabled={isSubmitting}
            onStrokeChange={(value) => onStrokeChange(selectedParticipant.id, value)}
          />
          <div className="grid grid-cols-[72px_72px_minmax(0,1fr)] gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-12 border-input shadow-none"
              aria-label="Previous hole"
              disabled={!canGoBack || isSubmitting}
              onClick={onPreviousHole}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant={obChecked ? "destructive" : "outline"}
              className={cn(
                "min-h-12 text-sm font-bold tracking-wider shadow-none",
                !obChecked && "border-input"
              )}
              aria-pressed={obChecked}
              aria-label={`Toggle OB for ${selectedLabel}`}
              disabled={isSubmitting}
              onClick={() => onObToggle(selectedParticipant.id, !obChecked)}
            >
              OB
            </Button>
            <Button
              type="button"
              className="min-h-12 min-w-0 text-[15px] font-semibold"
              disabled={isSubmitting || (!showNextPlayer && !allHoleScoresEntered)}
              onClick={handleForwardClick}
            >
              <span className="truncate">{isSubmitting ? "Saving…" : forwardLabel}</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
