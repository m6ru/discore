"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTabBarVisibilityOverride } from "@/components/layout/tab-bar-visibility";
import {
  addGuestPlayer,
  clearLocalTrial,
  isLocalTrialFullyScored,
  loadLocalTrial,
  removeGuestPlayer,
  saveLocalTrial,
  setScorerName,
  startLocalTrialPlay,
  type LocalTrialHole,
  type LocalTrialPlayer,
  type LocalTrialRound,
  type LocalTrialScore,
} from "@/lib/local-round";
import { buildLeaderboard } from "@/lib/scoring/leaderboard";
import { formatVsPar, getFirstIncompleteHoleIndex } from "@/lib/scoring/stats";
import { makeScoreLookupKey, type HoleScore } from "@/lib/scoring/types";
import {
  pagePrimaryButtonClassName,
  pageSubtitleClassName,
  pageTitleClassName,
} from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { toastError } from "@/lib/ui/toast-notify";
import { cn } from "@/lib/utils";

const STROKE_MIN = 1;
const STROKE_MAX = 25;
const ACTIVE_BOTTOM_INSET = "calc(12rem + env(safe-area-inset-bottom, 0px))";
const COMPLETE_BOTTOM_INSET = "calc(8rem + env(safe-area-inset-bottom, 0px))";

function scoreLookupFrom(scores: LocalTrialScore[]) {
  const map = new Map<string, number>();
  for (const score of scores) {
    map.set(makeScoreLookupKey(score.playerId, score.holeId), score.strokes);
  }
  return map;
}

function toHoleScores(scores: LocalTrialScore[]): HoleScore[] {
  return scores.map((score) => ({
    participant_id: score.playerId,
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

function getNextPlayerId(players: LocalTrialPlayer[], currentId: string): string {
  const index = players.findIndex((player) => player.id === currentId);
  if (index === -1) {
    return players[0]!.id;
  }
  return players[(index + 1) % players.length]!.id;
}

export function TrialSession() {
  const router = useRouter();
  const [trial, setTrial] = useState<LocalTrialRound | null | undefined>(undefined);
  const [readyToComplete, setReadyToComplete] = useState(false);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [draftStrokes, setDraftStrokes] = useState<Record<string, string>>({});
  const [draftOb, setDraftOb] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loaded = loadLocalTrial();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage
    setTrial(loaded);
    if (!loaded) {
      router.replace("/");
      return;
    }
    if (loaded.status === "active") {
      const startIndex = getFirstIncompleteHoleIndex(
        loaded.holes,
        loaded.players,
        toHoleScores(loaded.scores)
      );
      setCurrentHoleIndex(startIndex);
      const hole = loaded.holes[startIndex];
      const first = hole
        ? loaded.players.find(
            (player) =>
              !loaded.scores.some(
                (score) => score.holeId === hole.id && score.playerId === player.id
              )
          )
        : loaded.players[0];
      setSelectedPlayerId(first?.id ?? loaded.players[0]?.id ?? null);
    }
  }, [router]);

  const holes = trial?.holes ?? [];
  const players = trial?.players ?? [];
  const isSetup = trial?.status === "setup";
  const isFinished = trial?.status === "completed";
  useTabBarVisibilityOverride(Boolean(isFinished));

  const activeHole = holes[currentHoleIndex] ?? null;
  const isLastHole = activeHole ? currentHoleIndex === holes.length - 1 : false;

  const getStrokeInputValue = (playerId: string): string => {
    if (!activeHole) {
      return "";
    }
    const draft = draftStrokes[playerId];
    if (draft !== undefined) {
      return draft;
    }
    const saved = trial?.scores.find(
      (score) => score.holeId === activeHole.id && score.playerId === playerId
    );
    return saved ? String(saved.strokes) : "";
  };

  const isObChecked = (playerId: string): boolean => {
    if (!activeHole) {
      return false;
    }
    const draft = draftOb[playerId];
    if (draft !== undefined) {
      return draft;
    }
    return (
      trial?.scores.find(
        (score) => score.holeId === activeHole.id && score.playerId === playerId
      )?.ob ?? false
    );
  };

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? players[0] ?? null;

  const leaderboard = useMemo(() => {
    if (!trial) {
      return [];
    }
    const lookup = scoreLookupFrom(trial.scores);
    return buildLeaderboard(trial.players, trial.holes, lookup, (id) => {
      return trial.players.find((player) => player.id === id)?.name || "Player";
    });
  }, [trial]);

  function persist(next: LocalTrialRound) {
    saveLocalTrial(next);
    setTrial(next);
  }

  function saveCurrentHole(): boolean {
    if (!trial || !activeHole) {
      return false;
    }

    const nextScores: LocalTrialScore[] = trial.scores.filter(
      (score) => score.holeId !== activeHole.id
    );

    for (const player of trial.players) {
      const raw = getStrokeInputValue(player.id);
      const strokes = parseStrokeValue(raw);
      if (strokes === null || strokes < STROKE_MIN || strokes > STROKE_MAX) {
        toastError(`Enter valid strokes (${STROKE_MIN}-${STROKE_MAX}) for every player.`);
        return false;
      }
      nextScores.push({
        holeId: activeHole.id,
        playerId: player.id,
        strokes,
        ob: isObChecked(player.id),
      });
    }

    persist({ ...trial, scores: nextScores });
    setDraftStrokes({});
    setDraftOb({});
    return true;
  }

  function onSaveAndAdvance() {
    const allEntered = players.every((player) => getStrokeInputValue(player.id).trim().length > 0);
    const currentHasScore = selectedPlayer
      ? getStrokeInputValue(selectedPlayer.id).trim().length > 0
      : false;
    const showNextPlayer = players.length > 1 && !allEntered && currentHasScore;

    if (showNextPlayer && selectedPlayer) {
      setSelectedPlayerId(getNextPlayerId(players, selectedPlayer.id));
      return;
    }

    if (!saveCurrentHole()) {
      return;
    }
    if (isLastHole) {
      setReadyToComplete(true);
      return;
    }
    const nextIndex = Math.min(currentHoleIndex + 1, holes.length - 1);
    setCurrentHoleIndex(nextIndex);
    const nextHole = holes[nextIndex];
    const first = nextHole
      ? players.find(
          (player) =>
            !trial?.scores.some(
              (score) => score.holeId === nextHole.id && score.playerId === player.id
            )
        )
      : players[0];
    setSelectedPlayerId(first?.id ?? players[0]?.id ?? null);
  }

  function onPreviousHole() {
    setDraftStrokes({});
    setDraftOb({});
    const nextIndex = Math.max(currentHoleIndex - 1, 0);
    setCurrentHoleIndex(nextIndex);
    setSelectedPlayerId(players[0]?.id ?? null);
  }

  function onComplete() {
    const latest = loadLocalTrial();
    if (!latest || !isLocalTrialFullyScored(latest)) {
      toastError("Score every hole for every player before completing.");
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

  if (trial === undefined || !trial) {
    return null;
  }

  if (isSetup) {
    return <TrialSetup trial={trial} persist={persist} onDiscard={onDiscard} />;
  }

  if (isFinished || readyToComplete) {
    return (
      <main
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
        style={readyToComplete ? { paddingBottom: COMPLETE_BOTTOM_INSET } : undefined}
      >
        {isFinished ? (
          <header className="space-y-1">
            <h1 className={pageTitleClassName}>{trial.courseName}</h1>
            <p className={pageSubtitleClassName}>{trial.layoutName} · trial round</p>
          </header>
        ) : (
          <TrialHeader trial={trial} onDiscard={onDiscard} />
        )}
        <PlayerTotals rows={leaderboard} />
        <CompletedHoleList holes={trial.holes} players={trial.players} scores={trial.scores} />
        {isFinished ? (
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
        ) : (
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
        )}
      </main>
    );
  }

  if (!activeHole || !selectedPlayer) {
    return null;
  }

  const strokeValue = getStrokeInputValue(selectedPlayer.id);
  const obChecked = isObChecked(selectedPlayer.id);
  const parsed = parseStrokeValue(strokeValue);
  const isImplicitPar = parsed === null;
  const displayValue = parsed ?? activeHole.par;
  const canDecrement = isImplicitPar ? activeHole.par > STROKE_MIN : parsed > STROKE_MIN;
  const canIncrement = isImplicitPar ? activeHole.par < STROKE_MAX : parsed < STROKE_MAX;
  const allHoleScoresEntered = players.every(
    (player) => getStrokeInputValue(player.id).trim().length > 0
  );
  const currentPlayerHasScore = strokeValue.trim().length > 0;
  const showNextPlayer = players.length > 1 && !allHoleScoresEntered && currentPlayerHasScore;

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

      {players.length > 1 ? (
        <ul className="space-y-1.5">
          {players.map((player, index) => {
            const holeRaw = getStrokeInputValue(player.id).trim();
            const stats = leaderboard.find((row) => row.participantId === player.id);
            const isSelected = player.id === selectedPlayer.id;
            return (
              <li key={player.id}>
                <button
                  type="button"
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border py-2 pl-3 pr-4 text-left text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-muted/50"
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">
                    <span className="text-muted-foreground tabular-nums">{index + 1}.</span>{" "}
                    {player.name}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                    {holeRaw || "—"}
                    {isObChecked(player.id) ? (
                      <span className="ml-1 text-destructive">OB</span>
                    ) : null}
                  </span>
                  <span className="font-mono text-sm tabular-nums">
                    {stats && stats.thru > 0 ? formatVsPar(stats.vsPar) : "—"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto w-full max-w-3xl space-y-3">
          {players.length > 1 ? (
            <p className="text-center text-sm font-medium text-foreground">{selectedPlayer.name}</p>
          ) : null}
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
                setDraftStrokes((prev) => ({ ...prev, [selectedPlayer.id]: String(next) }));
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
                setDraftStrokes((prev) => ({ ...prev, [selectedPlayer.id]: String(next) }));
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
              aria-label={`Toggle OB for ${selectedPlayer.name}`}
              onClick={() =>
                setDraftOb((prev) => ({ ...prev, [selectedPlayer.id]: !obChecked }))
              }
            >
              OB
            </Button>
            <Button
              type="button"
              variant={showNextPlayer ? "outline" : "default"}
              className="min-h-11 rounded-xl"
              aria-label={
                showNextPlayer
                  ? "Next player"
                  : isLastHole
                    ? "Save scores"
                    : "Save and go to next hole"
              }
              disabled={!showNextPlayer && !allHoleScoresEntered}
              onClick={onSaveAndAdvance}
            >
              {showNextPlayer ? (
                <ChevronDown className="size-5" aria-hidden />
              ) : (
                <ChevronRight className="size-5" aria-hidden />
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function TrialSetup({
  trial,
  persist,
  onDiscard,
}: {
  trial: LocalTrialRound;
  persist: (next: LocalTrialRound) => void;
  onDiscard: () => void;
}) {
  const [guestName, setGuestName] = useState("");
  const scorer = trial.players.find((player) => player.isScorer);
  const guests = trial.players.filter((player) => !player.isScorer);

  function persistPlayers(players: LocalTrialPlayer[]) {
    persist({ ...trial, players });
  }

  function onAddGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addGuestPlayer(trial.players, guestName);
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    persistPlayers(result.players);
    setGuestName("");
  }

  function onStart() {
    const started = startLocalTrialPlay(trial, trial.players);
    if (!started.ok) {
      toastError(started.message);
      return;
    }
    persist(started.round);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <TrialHeader trial={trial} onDiscard={onDiscard} />

      <section className="space-y-3">
        <h2 className={sectionHeadingClassName}>Players</h2>
        <div className="space-y-2">
          <Label htmlFor="trial-scorer-name">Your name</Label>
          <Input
            id="trial-scorer-name"
            value={scorer?.name ?? ""}
            onChange={(event) => persistPlayers(setScorerName(trial.players, event.target.value))}
            maxLength={80}
            autoComplete="given-name"
            placeholder="Your name"
          />
        </div>

        {guests.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {guests.map((guest) => (
              <li key={guest.id} className="flex min-h-11 items-center gap-2 px-3 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{guest.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-muted-foreground"
                  onClick={() => persistPlayers(removeGuestPlayer(trial.players, guest.id))}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        <form onSubmit={onAddGuest} className="flex gap-2">
          <Input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            maxLength={80}
            placeholder="Add a player"
            aria-label="Guest name"
          />
          <Button type="submit" variant="outline" className="shrink-0">
            Add
          </Button>
        </form>
      </section>

      <Button type="button" size="lg" className={pagePrimaryButtonClassName} onClick={onStart}>
        Start round
      </Button>
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

function PlayerTotals({
  rows,
}: {
  rows: { participantId: string; label: string; totalStrokes: number; vsPar: number; thru: number }[];
}) {
  return (
    <ul className="divide-y rounded-lg border">
      {rows.map((row) => (
        <li key={row.participantId} className="flex items-baseline justify-between gap-3 px-4 py-2 text-sm">
          <span className="min-w-0 truncate font-medium">{row.label}</span>
          <span className="font-mono tabular-nums">
            {row.thru > 0 ? row.totalStrokes : "—"}{" "}
            <span className="text-muted-foreground">
              ({row.thru > 0 ? formatVsPar(row.vsPar) : "—"})
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function CompletedHoleList({
  holes,
  players,
  scores,
}: {
  holes: LocalTrialHole[];
  players: LocalTrialPlayer[];
  scores: LocalTrialScore[];
}) {
  return (
    <ul className="divide-y rounded-lg border">
      {holes.map((hole) => (
        <li key={hole.id} className="space-y-1 px-4 py-2 text-sm">
          <p className="text-muted-foreground">
            Hole {hole.hole_number}
            <span className="ml-2">Par {hole.par}</span>
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {players.map((player) => {
              const score = scores.find(
                (row) => row.holeId === hole.id && row.playerId === player.id
              );
              return (
                <span key={player.id} className="font-mono tabular-nums">
                  <span className="font-sans text-muted-foreground">{player.name} </span>
                  {score ? score.strokes : "—"}
                  {score?.ob ? <span className="ml-1 text-destructive">OB</span> : null}
                </span>
              );
            })}
          </div>
        </li>
      ))}
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
