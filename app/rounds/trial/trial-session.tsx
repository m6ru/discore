"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTabBarVisibilityOverride } from "@/components/layout/tab-bar-visibility";
import {
  clearLocalTrial,
  isLocalTrialFullyScored,
  loadLocalTrial,
  saveLocalTrial,
  type LocalTrialHole,
  type LocalTrialRound,
  type LocalTrialScore,
} from "@/lib/local-round";
import { formatVsPar, getFirstIncompleteHoleIndex, segmentPlayerStats } from "@/lib/scoring/stats";
import { makeScoreLookupKey, type HoleScore } from "@/lib/scoring/types";
import { pagePrimaryButtonClassName, pageSubtitleClassName, pageTitleClassName } from "@/lib/ui/page-chrome";
import { toastError } from "@/lib/ui/toast-notify";
import { cn } from "@/lib/utils";

const TRIAL_PARTICIPANT_ID = "trial";
const STROKE_MIN = 1;
const STROKE_MAX = 25;
const ACTIVE_BOTTOM_INSET = "calc(12rem + env(safe-area-inset-bottom, 0px))";
const COMPLETE_BOTTOM_INSET = "calc(8rem + env(safe-area-inset-bottom, 0px))";

function scoreLookupFrom(scores: LocalTrialScore[]) {
  const map = new Map<string, number>();
  for (const score of scores) {
    map.set(makeScoreLookupKey(TRIAL_PARTICIPANT_ID, score.holeId), score.strokes);
  }
  return map;
}

function toHoleScores(scores: LocalTrialScore[]): HoleScore[] {
  return scores.map((score) => ({
    participant_id: TRIAL_PARTICIPANT_ID,
    hole_id: score.holeId,
    strokes: score.strokes,
  }));
}

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

export function TrialSession() {
  const router = useRouter();
  const [trial, setTrial] = useState<LocalTrialRound | null | undefined>(undefined);
  const [readyToComplete, setReadyToComplete] = useState(false);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [draftStrokes, setDraftStrokes] = useState("");
  const [draftOb, setDraftOb] = useState<boolean | null>(null);

  useEffect(() => {
    const loaded = loadLocalTrial();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage
    setTrial(loaded);
    if (!loaded) {
      router.replace("/");
      return;
    }
    if (loaded.status !== "completed") {
      setCurrentHoleIndex(
        getFirstIncompleteHoleIndex(
          loaded.holes,
          [{ id: TRIAL_PARTICIPANT_ID }],
          toHoleScores(loaded.scores)
        )
      );
    }
  }, [router]);

  const holes = trial?.holes ?? [];
  const isFinished = trial?.status === "completed";
  useTabBarVisibilityOverride(Boolean(isFinished));

  const activeHole = holes[currentHoleIndex] ?? null;
  const isLastHole = activeHole ? currentHoleIndex === holes.length - 1 : false;
  const savedScore = activeHole
    ? trial?.scores.find((score) => score.holeId === activeHole.id)
    : undefined;
  const strokeValue =
    draftStrokes !== "" ? draftStrokes : savedScore ? String(savedScore.strokes) : "";
  const obChecked = draftOb ?? savedScore?.ob ?? false;

  const stats = useMemo(() => {
    if (!trial) {
      return null;
    }
    return segmentPlayerStats(TRIAL_PARTICIPANT_ID, trial.holes, scoreLookupFrom(trial.scores));
  }, [trial]);

  function persist(next: LocalTrialRound) {
    saveLocalTrial(next);
    setTrial(next);
  }

  function onStrokeChange(value: string) {
    setDraftStrokes(value);
  }

  function saveCurrentHole(): boolean {
    if (!trial || !activeHole) {
      return false;
    }
    const strokes = parseStrokeValue(strokeValue);
    if (strokes === null || strokes < STROKE_MIN || strokes > STROKE_MAX) {
      toastError(`Enter valid strokes (${STROKE_MIN}-${STROKE_MAX}) before continuing.`);
      return false;
    }

    const nextScores: LocalTrialScore[] = [
      ...trial.scores.filter((score) => score.holeId !== activeHole.id),
      { holeId: activeHole.id, strokes, ob: obChecked },
    ];
    persist({ ...trial, scores: nextScores });
    setDraftStrokes("");
    setDraftOb(null);
    return true;
  }

  function onSaveAndAdvance() {
    if (!saveCurrentHole()) {
      return;
    }
    if (isLastHole) {
      setReadyToComplete(true);
      return;
    }
    setCurrentHoleIndex((index) => Math.min(index + 1, holes.length - 1));
  }

  function onPreviousHole() {
    setDraftStrokes("");
    setDraftOb(null);
    setCurrentHoleIndex((index) => Math.max(index - 1, 0));
  }

  function onComplete() {
    const latest = loadLocalTrial();
    if (!latest || !isLocalTrialFullyScored(latest)) {
      toastError("Score every hole before completing.");
      return;
    }
    persist({
      ...latest,
      status: "completed",
      completedAt: new Date().toISOString(),
    });
    setReadyToComplete(false);
  }

  function onDiscard() {
    clearLocalTrial();
    router.replace("/");
  }

  if (trial === undefined) {
    return null;
  }
  if (!trial) {
    return null;
  }

  if (isFinished) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
        <header className="space-y-1">
          <h1 className={pageTitleClassName}>{trial.courseName}</h1>
          <p className={pageSubtitleClassName}>{trial.layoutName} · trial round</p>
        </header>
        {stats ? (
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {stats.totalStrokes}{" "}
            <span className="text-lg font-medium text-muted-foreground">
              ({formatVsPar(stats.vsPar)})
            </span>
          </p>
        ) : null}
        <CompletedHoleList holes={trial.holes} scores={trial.scores} />
        <div className="space-y-2">
          <Button asChild size="lg" className={pagePrimaryButtonClassName}>
            <Link href="/auth">Create account to save this round</Link>
          </Button>
          <DiscardButton
            title="Discard this round?"
            description="This trial stays on this device until you create an account. Discarding removes it."
            onConfirm={onDiscard}
          />
        </div>
      </main>
    );
  }

  if (readyToComplete) {
    return (
      <main
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
        style={{ paddingBottom: COMPLETE_BOTTOM_INSET }}
      >
        <TrialHeader trial={trial} onDiscard={onDiscard} />
        {stats ? (
          <p className="font-mono text-2xl font-semibold tabular-nums">
            {stats.totalStrokes}{" "}
            <span className="text-lg font-medium text-muted-foreground">
              ({formatVsPar(stats.vsPar)})
            </span>
          </p>
        ) : null}
        <CompletedHoleList holes={trial.holes} scores={trial.scores} />
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11 w-full rounded-xl"
              onClick={() => setReadyToComplete(false)}
            >
              Edit scores
            </Button>
            <Button
              type="button"
              size="lg"
              className="min-h-11 w-full rounded-xl"
              onClick={onComplete}
            >
              Complete round
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!activeHole) {
    return null;
  }

  const parsed = parseStrokeValue(strokeValue);
  const isImplicitPar = parsed === null;
  const displayValue = parsed ?? activeHole.par;
  const canDecrement = isImplicitPar ? activeHole.par > STROKE_MIN : parsed > STROKE_MIN;
  const canIncrement = isImplicitPar ? activeHole.par < STROKE_MAX : parsed < STROKE_MAX;
  const canSave = strokeValue.trim().length > 0;

  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
      style={{ paddingBottom: ACTIVE_BOTTOM_INSET }}
    >
      <TrialHeader trial={trial} onDiscard={onDiscard} />
      <div className="space-y-2 pt-2">
        <p className="text-center text-lg font-medium tabular-nums text-foreground">
          <span className="text-muted-foreground">Hole </span>
          <span className="font-mono text-xl font-semibold">{activeHole.hole_number}</span>
          <span className="text-muted-foreground"> / {holes.length}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="text-muted-foreground">Par </span>
          <span className="font-mono text-lg font-semibold">{activeHole.par}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono text-lg font-semibold">{activeHole.distance_m}</span>
          <span className="text-muted-foreground"> m</span>
        </p>
        {activeHole.notes ? (
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            {activeHole.notes}
          </p>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-14 rounded-xl text-lg"
              aria-label="Decrease strokes"
              disabled={!canDecrement}
              onClick={() => {
                const next = isImplicitPar
                  ? Math.max(STROKE_MIN, activeHole.par - 1)
                  : Math.max(STROKE_MIN, (parsed ?? activeHole.par) - 1);
                onStrokeChange(String(next));
              }}
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
                isImplicitPar
                  ? `Suggested par ${activeHole.par}, tap + or − to set score`
                  : `Score ${displayValue}`
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
              onClick={() => {
                const next = isImplicitPar
                  ? activeHole.par
                  : Math.min(STROKE_MAX, (parsed ?? activeHole.par) + 1);
                onStrokeChange(String(next));
              }}
            >
              <Plus className="size-6" aria-hidden />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl"
              aria-label="Previous hole"
              disabled={currentHoleIndex === 0}
              onClick={onPreviousHole}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
            <Button
              type="button"
              variant={obChecked ? "destructive" : "outline"}
              className="min-h-11 rounded-xl text-sm font-semibold uppercase tracking-wide"
              aria-pressed={obChecked}
              aria-label="Toggle OB"
              onClick={() => setDraftOb(!obChecked)}
            >
              OB
            </Button>
            <Button
              type="button"
              className="min-h-11 rounded-xl"
              aria-label={isLastHole ? "Save scores" : "Save and go to next hole"}
              disabled={!canSave}
              onClick={onSaveAndAdvance}
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function TrialHeader({
  trial,
  onDiscard,
}: {
  trial: LocalTrialRound;
  onDiscard: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h1 className={pageTitleClassName}>{trial.courseName}</h1>
        <p className={pageSubtitleClassName}>{trial.layoutName} · trial</p>
      </div>
      <DiscardButton
        title="Discard this round?"
        description="Scores are only on this device. Discarding cannot be undone."
        onConfirm={onDiscard}
        compact
      />
    </header>
  );
}

function CompletedHoleList({
  holes,
  scores,
}: {
  holes: LocalTrialHole[];
  scores: LocalTrialScore[];
}) {
  const byHole = new Map(scores.map((score) => [score.holeId, score]));
  return (
    <ul className="divide-y rounded-lg border">
      {holes.map((hole) => {
        const score = byHole.get(hole.id);
        return (
          <li key={hole.id} className="flex items-baseline justify-between gap-3 px-4 py-2 text-sm">
            <span className="text-muted-foreground">
              Hole {hole.hole_number}
              <span className="ml-2">Par {hole.par}</span>
            </span>
            <span className="font-mono tabular-nums">
              {score ? score.strokes : "—"}
              {score?.ob ? <span className="ml-2 text-destructive">OB</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DiscardButton({
  title,
  description,
  onConfirm,
  compact = false,
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  compact?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {compact ? (
          <Button type="button" variant="ghost" className="shrink-0 text-muted-foreground">
            Discard
          </Button>
        ) : (
          <Button type="button" variant="outline" size="lg" className={pagePrimaryButtonClassName}>
            Discard round
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
