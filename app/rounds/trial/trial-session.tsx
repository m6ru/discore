"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type LocalTrialRound,
  type LocalTrialScore,
} from "@/lib/local-round";
import { formatRoundDisplayDate } from "@/lib/format/round-date";
import type { ParticipantRow } from "@/lib/rounds/round-rows";
import { orderHolesForPlay } from "@/lib/scoring/hole-order";
import { buildLeaderboard } from "@/lib/scoring/leaderboard";
import { getFirstIncompleteHoleIndex } from "@/lib/scoring/stats";
import { buildTeePositionMap } from "@/lib/scoring/tee-order";
import { makeScoreLookupKey, type HoleScore } from "@/lib/scoring/types";
import { pageTitleClassName } from "@/lib/ui/page-chrome";
import { toastError } from "@/lib/ui/toast-notify";
import {
  ACTIVE_SCORING_BOTTOM_INSET,
  ActiveHoleScoring,
  RoundProgress,
  type HoleProgress,
} from "../[roundId]/components/active-hole-scoring";
import { ConfirmActionDialog } from "../[roundId]/components/confirm-action-dialog";
import { DRAFT_SETUP_BOTTOM_INSET, DraftSetupDeck } from "../[roundId]/components/draft-setup-deck";
import { StartingHoleField } from "../[roundId]/components/draft-starting-hole-field";
import {
  ROUND_COMPLETE_BOTTOM_INSET,
  RoundCompleteActions,
} from "../[roundId]/components/round-complete-actions";
import { RoundResults } from "../[roundId]/components/round-results";
import { RoundScorecardDialog } from "../[roundId]/components/round-scorecard-dialog";
import { ScorecardSection } from "../[roundId]/components/scorecard-section";

/**
 * The signed-out round, kept on the phone (lib/local-round). Same steps and
 * parts as a signed-in round — setup, scoring, review, finished — without
 * invites, the round sheet or stats; signing in saves it (claim_trial).
 */

function toHoleScores(scores: LocalTrialScore[]): HoleScore[] {
  return scores.map((score) => ({
    participant_id: score.playerId,
    hole_id: score.holeId,
    strokes: score.strokes,
  }));
}

/** Trial players in the shape the shared round parts take. */
function toParticipantRows(trial: LocalTrialRound): ParticipantRow[] {
  return trial.players.map((player) => ({
    id: player.id,
    user_id: null,
    guest_name: player.name,
    joined_at: trial.startedAt,
  }));
}

export function TrialSession() {
  const router = useRouter();
  const [trial, setTrial] = useState<LocalTrialRound | null | undefined>(undefined);
  const [isEditingScores, setIsEditingScores] = useState(false);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [draftStrokes, setDraftStrokes] = useState<Record<string, string>>({});
  const [draftOb, setDraftOb] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loaded = loadLocalTrial();
    setTrial(loaded);
    if (!loaded) {
      router.replace("/");
      return;
    }
    if (loaded.status === "active") {
      setCurrentHoleIndex(
        getFirstIncompleteHoleIndex(
          orderHolesForPlay(loaded.holes, loaded.startingHole),
          loaded.players,
          toHoleScores(loaded.scores)
        )
      );
    }
  }, [router]);

  const isFinished = trial?.status === "completed";
  useTabBarVisibilityOverride(Boolean(isFinished));

  const participants = useMemo(() => (trial ? toParticipantRows(trial) : []), [trial]);
  const playHoles = useMemo(
    () => (trial ? orderHolesForPlay(trial.holes, trial.startingHole) : []),
    [trial]
  );
  const scoreLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const score of trial?.scores ?? []) {
      map.set(makeScoreLookupKey(score.playerId, score.holeId), score.strokes);
    }
    return map;
  }, [trial]);
  const obLookup = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const score of trial?.scores ?? []) {
      map.set(makeScoreLookupKey(score.playerId, score.holeId), score.ob);
    }
    return map;
  }, [trial]);
  const labelById = useMemo(
    () => new Map((trial?.players ?? []).map((player) => [player.id, player.name || "Player"])),
    [trial]
  );
  const leaderboardRows = useMemo(
    () =>
      trial
        ? buildLeaderboard(participants, trial.holes, scoreLookup, (id) => labelById.get(id) ?? "Player")
        : [],
    [trial, participants, scoreLookup, labelById]
  );
  const leaderboardById = useMemo(
    () => new Map(leaderboardRows.map((row) => [row.participantId, row])),
    [leaderboardRows]
  );
  // Play order, never sorted by score: casual rounds are not ranked.
  const playOrderRows = participants.flatMap((participant) => {
    const row = leaderboardById.get(participant.id);
    return row ? [row] : [];
  });

  if (trial === undefined || !trial) {
    return null;
  }

  const activeHole = playHoles[currentHoleIndex] ?? null;
  const isLastHole = currentHoleIndex === playHoles.length - 1;
  const allScored = isLocalTrialFullyScored(trial);
  const getParticipantLabel = (participant: ParticipantRow) =>
    labelById.get(participant.id) ?? "Player";

  function persist(next: LocalTrialRound) {
    saveLocalTrial(next);
    setTrial(next);
  }

  function onDiscard() {
    clearLocalTrial();
    router.replace("/");
  }

  const header = (suffix: string) => (
    <header className="-mr-2 -mb-3 flex items-center gap-2">
      <p className="min-w-0 flex-1 truncate text-sm font-semibold">
        {trial.courseName}{" "}
        <span className="font-medium text-muted-foreground">
          · {trial.layoutName} · {suffix}
        </span>
      </p>
      <ConfirmActionDialog
        title="Discard this round?"
        description="The scores are only on this phone. They can't be brought back."
        confirmLabel="Discard"
        cancelLabel="Keep playing"
        sideBySide
        onConfirm={onDiscard}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 text-foreground"
            aria-label="Discard this round"
          >
            <X className="size-[22px]" strokeWidth={2} aria-hidden />
          </Button>
        }
      />
    </header>
  );

  const renderScorecard = (options: { showTitle: boolean; onHoleSelect?: (holeId: string) => void }) => (
    <ScorecardSection
      roundStatus={isFinished ? "completed" : "active"}
      sortedHoles={trial.holes}
      scoreLookup={scoreLookup}
      obLookup={obLookup}
      rows={playOrderRows}
      activeHole={options.onHoleSelect ? null : activeHole}
      showTitle={options.showTitle}
      onHoleSelect={options.onHoleSelect ? (hole) => options.onHoleSelect!(hole.id) : undefined}
    />
  );

  if (trial.status === "setup") {
    return <TrialSetup trial={trial} persist={persist} header={header("trial · setting up")} />;
  }

  if (isFinished) {
    const dateLabel = formatRoundDisplayDate(trial.completedAt, trial.startedAt);
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
        <header className="space-y-1">
          <p className="truncate text-sm font-semibold">
            {trial.courseName}{" "}
            <span className="font-medium text-muted-foreground">· {trial.layoutName}</span>
          </p>
          <h1 className={pageTitleClassName}>Trial round</h1>
          <p className="text-sm text-muted-foreground">
            {[dateLabel, `${participants.length} ${participants.length === 1 ? "player" : "players"}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>
        <RoundResults
          scoringParticipants={participants}
          leaderboardByParticipantId={leaderboardById}
          getParticipantLabel={getParticipantLabel}
        />
        {renderScorecard({ showTitle: true })}
        <section aria-labelledby="save-trial" className="space-y-3 rounded-md border border-foreground p-4">
          <div className="space-y-1">
            <h2 id="save-trial" className="font-display text-lg font-semibold">
              Save this round
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              It&apos;s only on this phone. With an account it goes to your history and counts in your
              stats.
            </p>
          </div>
          <Button asChild className="min-h-13 w-full justify-between px-4 text-base font-semibold">
            <Link href="/auth?mode=sign-up">
              Create an account
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <Link href="/auth" className="flex min-h-11 items-center text-sm font-semibold">
              I have an account
            </Link>
            <ConfirmActionDialog
              title="Discard this round?"
              description="It's only on this phone. Discarding removes it for good."
              confirmLabel="Discard"
              sideBySide
              onConfirm={onDiscard}
              trigger={
                <button type="button" className="min-h-11 text-sm font-semibold text-destructive">
                  Discard
                </button>
              }
            />
          </div>
        </section>
      </main>
    );
  }

  const holeKey = (playerId: string) => `${activeHole?.id}:${playerId}`;

  const getStrokeInputValue = (playerId: string): string => {
    if (!activeHole) {
      return "";
    }
    const draft = draftStrokes[holeKey(playerId)];
    if (draft !== undefined) {
      return draft;
    }
    const saved = scoreLookup.get(makeScoreLookupKey(playerId, activeHole.id));
    return saved !== undefined ? String(saved) : "";
  };

  const isObChecked = (playerId: string): boolean => {
    if (!activeHole) {
      return false;
    }
    return draftOb[holeKey(playerId)] ?? obLookup.get(makeScoreLookupKey(playerId, activeHole.id)) ?? false;
  };

  function onSaveAndAdvanceHole() {
    if (!trial || !activeHole) {
      return;
    }
    const nextScores = trial.scores.filter((score) => score.holeId !== activeHole.id);
    for (const player of trial.players) {
      const strokes = Number(getStrokeInputValue(player.id).trim());
      if (!Number.isInteger(strokes) || strokes < 1 || strokes > 25) {
        toastError(`Enter valid strokes (1-25) for every player on hole ${activeHole.hole_number}.`);
        return;
      }
      nextScores.push({ holeId: activeHole.id, playerId: player.id, strokes, ob: isObChecked(player.id) });
    }
    persist({ ...trial, scores: nextScores });
    const savedKeys = new Set(trial.players.map((player) => holeKey(player.id)));
    const withoutSaved = <T,>(drafts: Record<string, T>) =>
      Object.fromEntries(Object.entries(drafts).filter(([key]) => !savedKeys.has(key)));
    setDraftStrokes(withoutSaved);
    setDraftOb(withoutSaved);

    // From the review (or the last hole) saving goes back to the review.
    if (isLastHole || isEditingScores) {
      setIsEditingScores(false);
      return;
    }
    setCurrentHoleIndex((index) => Math.min(index + 1, playHoles.length - 1));
  }

  function editHoleFromReview(holeId: string) {
    setCurrentHoleIndex(Math.max(0, playHoles.findIndex((hole) => hole.id === holeId)));
    setIsEditingScores(true);
  }

  function onComplete() {
    const latest = loadLocalTrial();
    if (!latest || !isLocalTrialFullyScored(latest)) {
      toastError("Score every hole for every player before completing.");
      return;
    }
    persist({ ...latest, status: "completed", completedAt: new Date().toISOString() });
  }

  const scorecardDialog = (
    <RoundScorecardDialog open={scorecardOpen} onOpenChange={setScorecardOpen}>
      {renderScorecard({ showTitle: false })}
    </RoundScorecardDialog>
  );

  if (allScored && !isEditingScores) {
    const lastHole = playHoles.at(-1);
    return (
      <main
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-[18px] p-4 sm:p-8"
        style={{ paddingBottom: ROUND_COMPLETE_BOTTOM_INSET }}
      >
        {header("trial")}
        <RoundProgress
          progress={playHoles.map(() => "done")}
          onOpenScorecard={() => setScorecardOpen(true)}
        />
        <div className="space-y-1.5">
          <h1 className={pageTitleClassName}>All holes played</h1>
          <p className="text-[15px] text-muted-foreground">
            Check the card. Tap a hole to edit. Scores lock when you confirm the round.
          </p>
        </div>
        {renderScorecard({ showTitle: false, onHoleSelect: editHoleFromReview })}
        <RoundResults
          scoringParticipants={participants}
          leaderboardByParticipantId={leaderboardById}
          getParticipantLabel={getParticipantLabel}
          variant="totals"
        />
        <RoundCompleteActions
          isSubmitting={false}
          isTransitioning={false}
          lastHoleNumber={lastHole?.hole_number ?? playHoles.length}
          onBackToLastHole={() => editHoleFromReview(lastHole?.id ?? "")}
          onCompleteRound={onComplete}
        />
        {scorecardDialog}
      </main>
    );
  }

  if (!activeHole) {
    return null;
  }

  const progress: HoleProgress[] = playHoles.map((hole) => {
    if (hole.id === activeHole.id) {
      return "current";
    }
    return trial.players.every((player) => scoreLookup.has(makeScoreLookupKey(player.id, hole.id)))
      ? "done"
      : "todo";
  });

  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
      style={{ paddingBottom: ACTIVE_SCORING_BOTTOM_INSET }}
    >
      {header("trial")}
      <ActiveHoleScoring
        key={activeHole.id}
        activeHole={activeHole}
        holesLength={playHoles.length}
        progress={progress}
        onOpenScorecard={() => setScorecardOpen(true)}
        scoringParticipants={participants}
        leaderboardRows={leaderboardRows}
        currentHoleIndex={currentHoleIndex}
        isLastHole={isLastHole || isEditingScores}
        isSubmitting={false}
        getParticipantLabel={getParticipantLabel}
        teePositionByParticipantId={buildTeePositionMap(playHoles, currentHoleIndex, participants, scoreLookup)}
        getStrokeInputValue={getStrokeInputValue}
        isObChecked={isObChecked}
        onStrokeChange={(playerId, value) =>
          setDraftStrokes((prev) => ({ ...prev, [holeKey(playerId)]: value }))
        }
        onObToggle={(playerId, checked) =>
          setDraftOb((prev) => ({ ...prev, [holeKey(playerId)]: checked }))
        }
        onPreviousHole={() => setCurrentHoleIndex((index) => Math.max(index - 1, 0))}
        onSaveAndAdvanceHole={onSaveAndAdvanceHole}
      />
      {scorecardDialog}
    </main>
  );
}

function TrialSetup({
  trial,
  persist,
  header,
}: {
  trial: LocalTrialRound;
  persist: (next: LocalTrialRound) => void;
  header: React.ReactNode;
}) {
  const [guestName, setGuestName] = useState("");
  const scorer = trial.players.find((player) => player.isScorer);
  const guests = trial.players.filter((player) => !player.isScorer);

  function onAddGuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = addGuestPlayer(trial.players, guestName);
    if (!result.ok) {
      toastError(result.message);
      return;
    }
    persist({ ...trial, players: result.players });
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
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8"
      style={{ paddingBottom: DRAFT_SETUP_BOTTOM_INSET }}
    >
      {header}
      <div className="space-y-1.5 pt-3">
        <h1 className={pageTitleClassName}>Trial round</h1>
        <p className="text-[15px] text-muted-foreground">
          No account needed. The round stays on this phone until you save it.
        </p>
      </div>

      <section>
        <h2 className="mb-1.5 font-display text-lg font-semibold">Players</h2>
        <label className="flex min-h-13 items-center gap-2.5 border-b">
          <span className="sr-only">Your name</span>
          <input
            value={scorer?.name ?? ""}
            onChange={(event) =>
              persist({ ...trial, players: setScorerName(trial.players, event.target.value) })
            }
            maxLength={80}
            autoComplete="given-name"
            placeholder="Your name"
            aria-label="Your name"
            className="min-w-0 flex-1 bg-transparent text-base font-bold outline-none placeholder:font-semibold placeholder:text-muted-foreground"
          />
          <span className="shrink-0 text-[13px] text-muted-foreground">You · scorer</span>
        </label>
        {guests.map((guest) => (
          <div key={guest.id} className="flex min-h-13 items-center gap-2.5 border-b">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{guest.name}</span>
              <span className="block text-[13px] text-muted-foreground">Guest</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 shrink-0 px-2 font-semibold text-muted-foreground"
              onClick={() => persist({ ...trial, players: removeGuestPlayer(trial.players, guest.id) })}
            >
              Remove
            </Button>
          </div>
        ))}
        <form onSubmit={onAddGuest} className="flex min-h-13 items-center gap-2.5 border-b text-primary">
          <input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            maxLength={80}
            placeholder="+ Add player"
            aria-label="Guest name"
            className="min-w-0 flex-1 bg-transparent text-base font-semibold text-foreground outline-none placeholder:text-primary"
          />
          {guestName.trim() ? (
            <Button type="submit" variant="ghost" className="min-h-11 shrink-0 px-2 font-semibold text-primary">
              Add
            </Button>
          ) : null}
        </form>
      </section>

      <StartingHoleField
        holeNumbers={trial.holes.map((hole) => hole.hole_number)}
        startingHole={trial.startingHole}
        onChange={(hole) => persist({ ...trial, startingHole: hole })}
      />

      <DraftSetupDeck
        roundStatus="draft"
        isScorer
        isTransitioning={false}
        hasPendingInvite={false}
        pendingInviteLabels={[]}
        playerCount={trial.players.length}
        startingHole={trial.startingHole}
        onStartRound={onStart}
      />
    </main>
  );
}
