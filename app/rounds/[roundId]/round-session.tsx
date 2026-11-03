"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { makeScoreLookupKey } from "@/lib/scoring/types";
import { getFirstIncompleteHoleIndex } from "@/lib/scoring/stats";
import { isSegmentComplete } from "@/lib/scoring/segments";
import { orderHolesForPlay, sortHolesByNumber } from "@/lib/scoring/hole-order";
import { buildLeaderboard } from "@/lib/scoring/leaderboard";
import { buildTeePositionMap } from "@/lib/scoring/tee-order";
import { getParticipantLabel as labelForParticipant } from "@/lib/rounds/participant-labels";
import { buildUnifiedPlayers } from "@/lib/rounds/unified-players";
import type { InviteRow } from "@/lib/rounds/invite-rows";
import {
  loadPlayerHoleHistory,
  loadPostRoundInsights,
  type PostRoundInsights,
} from "@/lib/rounds/load-player-stats";
import {
  clearPostRoundInsightsPending,
  hasPostRoundInsightsPending,
  isPostRoundInsightsEnabled,
  markPostRoundInsightsPending,
} from "@/lib/rounds/post-round-insights-preference";
import {
  ACTIVE_SCORING_BOTTOM_INSET,
  ActiveHoleScoring,
  type HoleProgress,
} from "./components/active-hole-scoring";
import { DraftPlayersPanel } from "./components/draft-players-panel";
import { DRAFT_SETUP_BOTTOM_INSET, DraftSetupDeck } from "./components/draft-setup-deck";
import { DraftStartingHoleField } from "./components/draft-starting-hole-field";
import { DraftHeaderActionsPortal } from "./components/draft-header-actions-portal";
import { DraftRoundTitlePortal } from "./components/draft-round-title-portal";
import { RoundResults } from "./components/round-results";
import { ActiveHoleStatus } from "./components/active-hole-status";
import {
  ROUND_COMPLETE_BOTTOM_INSET,
  RoundCompleteActions,
} from "./components/round-complete-actions";
import { ScorecardSection } from "./components/scorecard-section";
import { RoundHeaderMenuPortal } from "./components/round-header-menu-portal";
import { RoundScorecardDialog } from "./components/round-scorecard-dialog";
import { YourRound } from "@/components/stats/post-round-insights";
import { isCleanCardDefault } from "@/lib/rounds/clean-card-preference";
import { formatHoleHistory, pickWhereItWent, type HoleHistory } from "@/lib/scoring/hole-history";
import { Button } from "@/components/ui/button";
import { isFinishedRoundStatus } from "@/lib/rounds/round-status";
import type {
  HoleRow,
  HoleScoreRow,
  LastSavedEvent,
  ParticipantRow,
  RoundStatus,
  RoundSessionProps,
} from "./round-types";
import { mergeHoleScoresByCell } from "@/lib/rounds/hole-scores";
import { overlayPendingScores } from "@/lib/rounds/pending-scores";
import { SyncStatusBadge } from "./components/sync-status-badge";
import { HoleFixSheet } from "./components/hole-fix-sheet";
import { useActiveScoring } from "./hooks/use-active-scoring";
import { useScoreSync } from "./hooks/use-score-sync";
import { useDraftSetup } from "./hooks/use-draft-setup";
import { useProfileSearch } from "./hooks/use-profile-search";
import { useRoundLifecycle } from "./hooks/use-round-lifecycle";
import { useRoundRealtime } from "./hooks/use-round-realtime";
import { useTabBarVisibilityOverride } from "@/components/layout/tab-bar-visibility";

export function RoundSession({
  roundId,
  roundName: initialRoundName,
  startingHole: initialStartingHole,
  roundStatus,
  scorerUserId,
  isScorer,
  currentUserId,
  scorerDisplayName,
  courseName,
  courseSlug,
  layoutId,
  layoutName,
  layoutSlug,
  layoutTotalPar,
  initialParticipants,
  initialInvites,
  holes,
  initialHoleScores,
}: RoundSessionProps) {
  const supabase = useMemo(() => createClient(), []);
  const [participants, setParticipants] = useState<ParticipantRow[]>(initialParticipants);
  const [invites, setInvites] = useState<InviteRow[]>(initialInvites);
  const [liveRoundStatus, setLiveRoundStatus] = useState<RoundStatus>(roundStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [holeScores, setHoleScores] = useState<HoleScoreRow[]>(initialHoleScores);
  const [roundName, setRoundName] = useState<string | null>(initialRoundName);
  const [startingHole, setStartingHole] = useState(initialStartingHole);
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  const [scoresHidden, setScoresHidden] = useState(false);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [isEditingScores, setIsEditingScores] = useState(false);
  const [holeFixTarget, setHoleFixTarget] = useState<HoleRow | null>(null);
  const [postRoundInsights, setPostRoundInsights] = useState<PostRoundInsights | null>(null);
  const [showPostRoundInsights, setShowPostRoundInsights] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return (
      isScorer &&
      isFinishedRoundStatus(roundStatus) &&
      isPostRoundInsightsEnabled() &&
      hasPostRoundInsightsPending(roundId)
    );
  });
  const [holeHistory, setHoleHistory] = useState<ReadonlyMap<string, HoleHistory> | null>(null);
  const ignoreRenderNow: Dispatch<SetStateAction<number>> = useCallback(() => {}, []);

  // Clean card by default (Profile): read after mount, localStorage is client-only.
  useEffect(() => {
    if (isCleanCardDefault()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage
      setScoresHidden(true);
    }
  }, []);
  const ignoreLastSavedEvent: Dispatch<SetStateAction<LastSavedEvent | null>> =
    useCallback(() => {}, []);

  const onRoundCompleted = useCallback(() => {
    setLiveRoundStatus("completed");
    if (!isScorer || !isPostRoundInsightsEnabled()) {
      return;
    }
    markPostRoundInsightsPending(roundId);
    setShowPostRoundInsights(true);
  }, [isScorer, roundId]);

  useEffect(() => {
    if (
      !showPostRoundInsights ||
      !isScorer ||
      !courseSlug ||
      !layoutSlug ||
      !isFinishedRoundStatus(liveRoundStatus)
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { insights } = await loadPostRoundInsights(supabase, {
        roundId,
        layoutId,
        courseSlug,
        layoutSlug,
      });
      if (cancelled) {
        return;
      }
      if (!insights) {
        clearPostRoundInsightsPending(roundId);
        setShowPostRoundInsights(false);
        setPostRoundInsights(null);
        return;
      }
      // Shown once: a reload of the finished round no longer carries the moment.
      clearPostRoundInsightsPending(roundId);
      setPostRoundInsights(insights);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    showPostRoundInsights,
    isScorer,
    courseSlug,
    layoutSlug,
    liveRoundStatus,
    supabase,
    roundId,
    layoutId,
  ]);

  // The viewer's own per-hole history (BLUEPRINT §8a): the scorer's "Usually"
  // line while scoring, and "Where it went" once the round is finished.
  const viewerParticipantId =
    participants.find((participant) => participant.user_id === currentUserId)?.id ?? null;
  const historyMode =
    !viewerParticipantId
      ? null
      : isFinishedRoundStatus(liveRoundStatus)
        ? "finished"
        : liveRoundStatus === "active" && isScorer
          ? "active"
          : null;

  useEffect(() => {
    if (!historyMode) {
      return;
    }
    let cancelled = false;
    void loadPlayerHoleHistory(
      supabase,
      layoutId,
      historyMode === "finished" ? roundId : undefined
    ).then((history) => {
      if (!cancelled) {
        setHoleHistory(history);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [historyMode, supabase, layoutId, roundId]);

  const { loadParticipants, loadInvites } = useRoundRealtime({
    supabase,
    roundId,
    setParticipants,
    setInvites,
    setHoleScores,
    setRoundStatus: setLiveRoundStatus,
    setLastSavedEvent: ignoreLastSavedEvent,
    setRenderNow: ignoreRenderNow,
  });

  const scoreSync = useScoreSync({
    supabase,
    roundId,
    enabled: isScorer && liveRoundStatus === "active",
    onSynced: (rows) => setHoleScores((prev) => mergeHoleScoresByCell(prev, rows)),
  });
  const { discard: discardPendingScores } = scoreSync;

  // `holeScores` is what the server has; everything on screen uses this view,
  // where the scorer's unsynced saves win until the server confirms them.
  const displayHoleScores = useMemo(
    () => overlayPendingScores(holeScores, scoreSync.pending),
    [holeScores, scoreSync.pending]
  );

  useEffect(() => {
    if (isFinishedRoundStatus(liveRoundStatus)) {
      discardPendingScores();
    }
  }, [liveRoundStatus, discardPendingScores]);

  const syncBadge = (
    <SyncStatusBadge
      phase={scoreSync.phase}
      pendingHoleCount={scoreSync.pendingHoleCount}
      onRetry={() => void scoreSync.flush()}
    />
  );

  const scoringParticipants = participants;

  const sortedHoles = useMemo(() => sortHolesByNumber(holes), [holes]);
  const playOrderedHoles = useMemo(
    () => orderHolesForPlay(holes, startingHole),
    [holes, startingHole]
  );
  const holeNumbers = useMemo(
    () => sortedHoles.map((hole) => hole.hole_number),
    [sortedHoles]
  );

  const {
    activeHole,
    currentHoleIndex,
    isLastHole,
    getStrokeInputValue,
    isObChecked,
    setStrokeDraft,
    setObDraft,
    saveCurrentHoleScores,
    onSaveAndAdvanceHole,
    onPreviousHole,
  } = useActiveScoring({
    roundId,
    isScorer,
    holes: playOrderedHoles,
    initialHoleScores,
    scoringParticipants,
    holeScores: displayHoleScores,
    enqueueScores: scoreSync.enqueue,
    setLastSavedEvent: ignoreLastSavedEvent,
    setRenderNow: ignoreRenderNow,
    onFinalHoleSaved: () => setIsEditingScores(false),
  });

  const { onAbandonRound, onCompleteRound } = useRoundLifecycle({
    supabase,
    roundId,
    isScorer,
    saveCurrentHoleScores,
    flushScores: scoreSync.flush,
    discardPendingScores,
    setIsTransitioning,
    onCompleted: onRoundCompleted,
  });

  const {
    participantName,
    setParticipantName,
    onAddParticipant,
    onRemovePlayer,
    onStartRound,
    onDeleteDraft,
  } = useDraftSetup({
    supabase,
    roundId,
    roundStatus: liveRoundStatus,
    isScorer,
    currentUserId,
    courseSlug,
    loadParticipants,
    loadInvites,
    setIsSubmitting,
    setIsTransitioning,
  });

  const {
    searchResults,
    isSearching,
    selectedProfile,
    setSelectedProfile,
    clearSearchSelection,
    selectProfile,
  } = useProfileSearch({
    supabase,
    roundStatus: liveRoundStatus,
    currentUserId,
    participantName,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server prop into client state
    setLiveRoundStatus(roundStatus);
  }, [roundStatus]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server prop into client state
    setRoundName(initialRoundName);
  }, [initialRoundName]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server prop into client state
    setStartingHole(initialStartingHole);
  }, [initialStartingHole]);

  const unifiedPlayers = useMemo(
    () =>
      buildUnifiedPlayers({
        participants,
        invites,
        scorerUserId,
        scorerDisplayName,
        roundStatus: liveRoundStatus,
        isScorer,
      }),
    [participants, invites, scorerUserId, scorerDisplayName, liveRoundStatus, isScorer]
  );

  const hasPendingInvite = useMemo(
    () => unifiedPlayers.some((player) => player.isPending),
    [unifiedPlayers]
  );

  const pendingInviteLabels = useMemo(
    () => unifiedPlayers.filter((player) => player.isPending).map((player) => player.label),
    [unifiedPlayers]
  );

  const canScore =
    liveRoundStatus === "active" && !!activeHole && scoringParticipants.length > 0;

  const holeIds = useMemo(() => sortedHoles.map((hole) => hole.id), [sortedHoles]);

  const scoreLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of displayHoleScores) {
      map.set(makeScoreLookupKey(row.participant_id, row.hole_id), row.strokes);
    }
    return map;
  }, [displayHoleScores]);

  const allScoresComplete = useMemo(
    () => isSegmentComplete(holeIds, scoringParticipants, scoreLookup),
    [holeIds, scoringParticipants, scoreLookup]
  );

  const showCompletionUI =
    liveRoundStatus === "active" && isScorer && allScoresComplete && !isEditingScores;
  const showScoringUI =
    liveRoundStatus === "active" && (!allScoresComplete || isEditingScores);

  useEffect(() => {
    if (!allScoresComplete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- exit review when scores become incomplete
      setIsEditingScores(false);
    }
  }, [allScoresComplete]);

  const obLookup = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of displayHoleScores) {
      map.set(makeScoreLookupKey(row.participant_id, row.hole_id), row.ob);
    }
    return map;
  }, [displayHoleScores]);

  const labelByParticipantId = useMemo(() => {
    const map = new Map<string, string>();
    for (const participant of participants) {
      map.set(participant.id, labelForParticipant(participant, unifiedPlayers));
    }
    return map;
  }, [participants, unifiedPlayers]);

  const showStickySaveBar =
    liveRoundStatus === "active" && isScorer && canScore && showScoringUI;

  const showScorecardAtBottom = !showStickySaveBar && liveRoundStatus !== "draft";
  const isFinishedRound = isFinishedRoundStatus(liveRoundStatus);
  const showPoolResults =
    isFinishedRound ||
    (liveRoundStatus === "active" &&
      isScorer &&
      (showCompletionUI || !showStickySaveBar));

  useTabBarVisibilityOverride(!isScorer || isFinishedRound);

  const whereItWent = useMemo(() => {
    if (!holeHistory || !viewerParticipantId || !isFinishedRound) {
      return [];
    }
    const holeNumberById = new Map(holes.map((hole) => [hole.id, hole.hole_number]));
    return pickWhereItWent(
      holeScores
        .filter((score) => score.participant_id === viewerParticipantId)
        .map((score) => ({
          holeId: score.hole_id,
          holeNumber: holeNumberById.get(score.hole_id) ?? 0,
          strokes: score.strokes,
          ob: score.ob,
        })),
      holeHistory
    );
  }, [holeHistory, viewerParticipantId, isFinishedRound, holes, holeScores]);

  const newBestParticipantId =
    showPostRoundInsights && postRoundInsights?.isNewBest
      ? (participants.find((participant) => participant.user_id === currentUserId)?.id ?? null)
      : null;

  const teePositionByParticipantId = useMemo(
    () =>
      buildTeePositionMap(
        playOrderedHoles,
        currentHoleIndex,
        scoringParticipants,
        scoreLookup
      ),
    [playOrderedHoles, currentHoleIndex, scoringParticipants, scoreLookup]
  );

  const labelForParticipantId = useCallback(
    (id: string) => labelByParticipantId.get(id) ?? "Player",
    [labelByParticipantId]
  );

  const leaderboardRows = useMemo(
    () =>
      buildLeaderboard(
        scoringParticipants,
        sortedHoles,
        scoreLookup,
        labelForParticipantId
      ),
    [scoringParticipants, sortedHoles, scoreLookup, labelForParticipantId]
  );

  const leaderboardByParticipantId = useMemo(() => {
    const map = new Map<string, (typeof leaderboardRows)[number]>();
    for (const row of leaderboardRows) {
      map.set(row.participantId, row);
    }
    return map;
  }, [leaderboardRows]);

  const getParticipantLabel = useCallback(
    (participant: ParticipantRow) =>
      labelByParticipantId.get(participant.id) ?? "Player",
    [labelByParticipantId]
  );

  const scorecardActiveHole = useMemo(() => {
    if (liveRoundStatus !== "active") {
      return activeHole;
    }
    if (isScorer && activeHole) {
      return activeHole;
    }
    const observedIndex = getFirstIncompleteHoleIndex(
      playOrderedHoles,
      scoringParticipants,
      displayHoleScores
    );
    return playOrderedHoles[observedIndex] ?? null;
  }, [
    liveRoundStatus,
    isScorer,
    activeHole,
    playOrderedHoles,
    scoringParticipants,
    displayHoleScores,
  ]);

  const buildDisplayScoreLookup = useCallback(() => {
    const map = new Map(scoreLookup);
    if (isScorer && activeHole && liveRoundStatus === "active") {
      for (const participant of scoringParticipants) {
        const raw = getStrokeInputValue(participant.id).trim();
        if (!raw) {
          continue;
        }
        const strokes = Number(raw);
        if (!Number.isInteger(strokes) || strokes < 1) {
          continue;
        }
        map.set(makeScoreLookupKey(participant.id, activeHole.id), strokes);
      }
    }
    return map;
  }, [
    scoreLookup,
    isScorer,
    activeHole,
    liveRoundStatus,
    scoringParticipants,
    getStrokeInputValue,
  ]);

  const buildDisplayObLookup = useCallback(() => {
    const map = new Map(obLookup);
    if (isScorer && activeHole && liveRoundStatus === "active") {
      for (const participant of scoringParticipants) {
        const raw = getStrokeInputValue(participant.id).trim();
        if (!raw) {
          continue;
        }
        map.set(
          makeScoreLookupKey(participant.id, activeHole.id),
          isObChecked(participant.id)
        );
      }
    }
    return map;
  }, [
    obLookup,
    isScorer,
    activeHole,
    liveRoundStatus,
    scoringParticipants,
    getStrokeInputValue,
    isObChecked,
  ]);

  // Progress line on the scoring screen: holes in play order, done when every
  // player has a score, so a round started on hole 7 still fills left to right.
  const holeProgress = useMemo<HoleProgress[]>(
    () =>
      playOrderedHoles.map((hole) => {
        if (hole.id === activeHole?.id) {
          return "current";
        }
        const done =
          scoringParticipants.length > 0 &&
          scoringParticipants.every((participant) =>
            scoreLookup.has(makeScoreLookupKey(participant.id, hole.id))
          );
        return done ? "done" : "todo";
      }),
    [playOrderedHoles, activeHole, scoringParticipants, scoreLookup]
  );

  const renderScorecard = (options: { showTitle: boolean }) => {
    const displayScoreLookup = buildDisplayScoreLookup();
    const rowsById = new Map(
      buildLeaderboard(
        scoringParticipants,
        sortedHoles,
        displayScoreLookup,
        labelForParticipantId
      ).map((row) => [row.participantId, row])
    );
    // Play order, never sorted by score: casual rounds are not ranked.
    const playOrderRows = scoringParticipants.flatMap((participant) => {
      const row = rowsById.get(participant.id);
      return row ? [row] : [];
    });

    return (
      <ScorecardSection
        roundStatus={liveRoundStatus}
        sortedHoles={sortedHoles}
        scoreLookup={displayScoreLookup}
        obLookup={buildDisplayObLookup()}
        rows={playOrderRows}
        activeHole={scorecardActiveHole}
        showTitle={options.showTitle}
      />
    );
  };

  const showHeaderMenu = isScorer && (showStickySaveBar || showCompletionUI);

  return (
    <>
      <DraftRoundTitlePortal
        show={liveRoundStatus === "draft" && isScorer}
        supabase={supabase}
        roundId={roundId}
        roundName={roundName}
        disabled={isSubmitting || isTransitioning}
        onNameChange={setRoundName}
      />
      <DraftHeaderActionsPortal
        show={liveRoundStatus === "draft" && isScorer}
        isTransitioning={isTransitioning}
        courseName={courseName}
        layoutName={layoutName}
        layoutTotalPar={layoutTotalPar}
        holeCount={holes.length}
        onDeleteDraft={() => void onDeleteDraft()}
      />
    <section
      className="space-y-4"
      style={
        showStickySaveBar
          ? { paddingBottom: ACTIVE_SCORING_BOTTOM_INSET }
          : showCompletionUI
            ? { paddingBottom: ROUND_COMPLETE_BOTTOM_INSET }
            : liveRoundStatus === "draft" && isScorer
              ? { paddingBottom: DRAFT_SETUP_BOTTOM_INSET }
              : undefined
      }
    >
      <RoundHeaderMenuPortal
        show={showHeaderMenu}
        isSubmitting={isSubmitting}
        isTransitioning={isTransitioning}
        courseName={courseName}
        layoutName={layoutName}
        layoutTotalPar={layoutTotalPar}
        holeCount={holes.length}
        startingHole={startingHole}
        currentHoleNumber={showStickySaveBar ? (activeHole?.hole_number ?? null) : null}
        scoresHidden={scoresHidden}
        onToggleScoresHidden={() => setScoresHidden((hidden) => !hidden)}
        onAbandonRound={() => void onAbandonRound()}
        onViewScorecard={() => setScorecardOpen(true)}
        onSuggestFix={() => setHoleFixTarget(activeHole)}
        scorecardDialog={
          <RoundScorecardDialog open={scorecardOpen} onOpenChange={setScorecardOpen}>
            {renderScorecard({ showTitle: false })}
          </RoundScorecardDialog>
        }
      />
      {liveRoundStatus === "draft" ? (
        <div className="space-y-4">
          <DraftPlayersPanel
            unifiedPlayers={unifiedPlayers}
            isScorer={isScorer}
            scorerUserId={scorerUserId}
            currentUserId={currentUserId}
            isSubmitting={isSubmitting}
            showAddForm={showAddPlayerForm}
            participantName={participantName}
            isSearching={isSearching}
            searchResults={searchResults}
            selectedProfile={selectedProfile}
            onRemovePlayer={onRemovePlayer}
            onShowAddForm={() => setShowAddPlayerForm(true)}
            onParticipantNameChange={(value) => {
              setParticipantName(value);
              setSelectedProfile(null);
            }}
            onSelectProfile={(profile) => {
              selectProfile(profile);
              setParticipantName(profile.display_name);
            }}
            onSubmit={(event) => {
              void (async () => {
                const added = await onAddParticipant(
                  event,
                  selectedProfile,
                  clearSearchSelection
                );
                if (added) {
                  setShowAddPlayerForm(false);
                }
              })();
            }}
            onCancelAdd={() => {
              setShowAddPlayerForm(false);
              setParticipantName("");
              clearSearchSelection();
            }}
          />

          {isScorer ? (
            <>
              <DraftStartingHoleField
                supabase={supabase}
                roundId={roundId}
                holeNumbers={holeNumbers}
                startingHole={startingHole}
                disabled={isSubmitting || isTransitioning}
                onStartingHoleChange={setStartingHole}
              />
              <DraftSetupDeck
                roundStatus={liveRoundStatus}
                isScorer={isScorer}
                isTransitioning={isTransitioning}
                hasPendingInvite={hasPendingInvite}
                pendingInviteLabels={pendingInviteLabels}
                playerCount={unifiedPlayers.length}
                startingHole={startingHole}
                onStartRound={() => void onStartRound()}
              />
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Waiting for {scorerDisplayName} to start the round.
            </p>
          )}
        </div>
      ) : null}

      {showScoringUI ? (
        <>
          {!canScore ? (
            <p className="text-sm text-muted-foreground">No participants available for scoring.</p>
          ) : isScorer && activeHole ? (
            <>
              {isEditingScores && allScoresComplete ? (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => setIsEditingScores(false)}
                  >
                    Done editing
                  </Button>
                </div>
              ) : null}
              <ActiveHoleScoring
              key={activeHole.id}
              activeHole={activeHole}
              holesLength={holes.length}
              progress={holeProgress}
              onOpenScorecard={() => setScorecardOpen(true)}
              scoringParticipants={scoringParticipants}
              leaderboardRows={leaderboardRows}
              currentHoleIndex={currentHoleIndex}
              isLastHole={isLastHole}
              isSubmitting={isSubmitting}
              getParticipantLabel={getParticipantLabel}
              teePositionByParticipantId={teePositionByParticipantId}
              getStrokeInputValue={getStrokeInputValue}
              isObChecked={isObChecked}
              onStrokeChange={setStrokeDraft}
              onObToggle={setObDraft}
              onPreviousHole={onPreviousHole}
              onSaveAndAdvanceHole={onSaveAndAdvanceHole}
              hideRunningScores={scoresHidden}
              historyLine={scoresHidden ? null : formatHoleHistory(holeHistory?.get(activeHole.id))}
              syncBadge={syncBadge}
            />
            </>
          ) : (
            <ActiveHoleStatus
              activeHole={scorecardActiveHole}
              holesLength={holes.length}
              onSuggestFix={() => setHoleFixTarget(scorecardActiveHole)}
            />
          )}
        </>
      ) : null}

      {showPoolResults ? (
        <RoundResults
          scoringParticipants={scoringParticipants}
          leaderboardByParticipantId={leaderboardByParticipantId}
          getParticipantLabel={getParticipantLabel}
          newBestParticipantId={newBestParticipantId}
        />
      ) : null}

      {showScorecardAtBottom ? renderScorecard({ showTitle: true }) : null}

      {isFinishedRound && courseSlug && layoutSlug ? (
        <YourRound
          insights={showPostRoundInsights ? postRoundInsights : null}
          whereItWent={whereItWent}
          courseSlug={courseSlug}
          layoutSlug={layoutSlug}
          layoutName={layoutName}
        />
      ) : null}

      {showCompletionUI ? (
        <RoundCompleteActions
          isSubmitting={isSubmitting}
          isTransitioning={isTransitioning}
          onEditScores={() => setIsEditingScores(true)}
          onCompleteRound={onCompleteRound}
          syncBadge={syncBadge}
        />
      ) : null}
    </section>
      <HoleFixSheet
        hole={holeFixTarget}
        layoutId={layoutId}
        userId={currentUserId}
        onClose={() => setHoleFixTarget(null)}
      />
    </>
  );
}
