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
  ACTIVE_SCORING_BOTTOM_INSET,
  ActiveHoleScoring,
} from "./components/active-hole-scoring";
import { DraftPlayersPanel } from "./components/draft-players-panel";
import { DraftSetupDeck, DRAFT_SETUP_BOTTOM_INSET } from "./components/draft-setup-deck";
import { DraftStartingHoleField } from "./components/draft-starting-hole-field";
import { DraftHeaderActionsPortal } from "./components/draft-header-actions-portal";
import { DraftRoundTitlePortal } from "./components/draft-round-title-portal";
import { RoundResults } from "./components/round-results";
import { ActiveHoleStatus } from "./components/active-hole-status";
import {
  ROUND_COMPLETE_BOTTOM_INSET,
  RoundCompleteActions,
} from "./components/round-complete-actions";
import { RoundSummaries } from "./components/round-summaries";
import { ScorecardSection } from "./components/scorecard-section";
import { RoundHeaderMenuPortal } from "./components/round-header-menu-portal";
import { RoundInfoDialog } from "./components/round-info-dialog";
import { RoundScorecardDialog } from "./components/round-scorecard-dialog";
import { Button } from "@/components/ui/button";
import type {
  HoleScoreRow,
  LastSavedEvent,
  ParticipantRow,
  RoundStatus,
  RoundSessionProps,
} from "./round-types";
import { useActiveScoring } from "./hooks/use-active-scoring";
import { useDraftSetup } from "./hooks/use-draft-setup";
import { useProfileSearch } from "./hooks/use-profile-search";
import { useRoundLifecycle } from "./hooks/use-round-lifecycle";
import { useRoundRealtime } from "./hooks/use-round-realtime";
import { useTabBarVisibilityOverride } from "@/components/layout/tab-bar-visibility";
import { cn } from "@/lib/utils";

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
  layoutName,
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
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [roundInfoOpen, setRoundInfoOpen] = useState(false);
  const [isEditingScores, setIsEditingScores] = useState(false);
  const ignoreRenderNow: Dispatch<SetStateAction<number>> = useCallback(() => {}, []);
  const ignoreLastSavedEvent: Dispatch<SetStateAction<LastSavedEvent | null>> =
    useCallback(() => {}, []);

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
    supabase,
    roundId,
    isScorer,
    holes: playOrderedHoles,
    initialHoleScores,
    scoringParticipants,
    holeScores,
    setHoleScores,
    setLastSavedEvent: ignoreLastSavedEvent,
    setRenderNow: ignoreRenderNow,
    setIsSubmitting,
    onFinalHoleSaved: () => setIsEditingScores(false),
  });

  const { onAbandonRound, onCompleteRound } = useRoundLifecycle({
    supabase,
    roundId,
    isScorer,
    saveCurrentHoleScores,
    setIsTransitioning,
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

  const showDraftSetupDeck = liveRoundStatus === "draft" && isScorer;

  const canScore =
    liveRoundStatus === "active" && !!activeHole && scoringParticipants.length > 0;

  const holeIds = useMemo(() => sortedHoles.map((hole) => hole.id), [sortedHoles]);
  const firstNineHoleIds = useMemo(
    () => sortedHoles.filter((hole) => hole.hole_number <= 9).map((hole) => hole.id),
    [sortedHoles]
  );

  const scoreLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of holeScores) {
      map.set(makeScoreLookupKey(row.participant_id, row.hole_id), row.strokes);
    }
    return map;
  }, [holeScores]);

  const allScoresComplete = useMemo(
    () => isSegmentComplete(holeIds, scoringParticipants, scoreLookup),
    [holeIds, scoringParticipants, scoreLookup]
  );
  const frontNineComplete = useMemo(
    () => isSegmentComplete(firstNineHoleIds, scoringParticipants, scoreLookup),
    [firstNineHoleIds, scoringParticipants, scoreLookup]
  );

  const showCompletionUI =
    liveRoundStatus === "active" && isScorer && allScoresComplete && !isEditingScores;
  const showScoringUI =
    liveRoundStatus === "active" && (!allScoresComplete || isEditingScores);
  const showFrontNineSummary =
    liveRoundStatus === "active" && !allScoresComplete && frontNineComplete;

  useEffect(() => {
    if (!allScoresComplete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- exit review when scores become incomplete
      setIsEditingScores(false);
    }
  }, [allScoresComplete]);

  const obLookup = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const row of holeScores) {
      map.set(makeScoreLookupKey(row.participant_id, row.hole_id), row.ob);
    }
    return map;
  }, [holeScores]);

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
  const isFlatLayout =
    liveRoundStatus === "active" ||
    liveRoundStatus === "draft" ||
    liveRoundStatus === "completed";
  const showPoolResults =
    (liveRoundStatus === "active" &&
      isScorer &&
      (showCompletionUI || !showStickySaveBar)) ||
    liveRoundStatus === "completed";
  const showAbandonedResults =
    liveRoundStatus === "abandoned" && !showStickySaveBar;

  useTabBarVisibilityOverride(!isScorer || liveRoundStatus === "completed");

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
      holeScores
    );
    return playOrderedHoles[observedIndex] ?? null;
  }, [
    liveRoundStatus,
    isScorer,
    activeHole,
    playOrderedHoles,
    scoringParticipants,
    holeScores,
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

  const renderScorecard = (options: { showTitle: boolean; showBorder?: boolean }) => {
    const displayScoreLookup = buildDisplayScoreLookup();
    const displayLeaderboardRows = buildLeaderboard(
      scoringParticipants,
      sortedHoles,
      displayScoreLookup,
      labelForParticipantId
    );

    return (
      <ScorecardSection
        roundStatus={liveRoundStatus}
        sortedHoles={sortedHoles}
        scoreLookup={displayScoreLookup}
        obLookup={buildDisplayObLookup()}
        leaderboardRows={displayLeaderboardRows}
        activeHole={scorecardActiveHole}
        showTitle={options.showTitle}
        showBorder={options.showBorder}
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
        onDeleteDraft={() => void onDeleteDraft()}
      />
    <section
      className={cn(
        "space-y-4",
        !isFlatLayout && "rounded-lg border p-4"
      )}
      style={
        showStickySaveBar
          ? { paddingBottom: ACTIVE_SCORING_BOTTOM_INSET }
          : showCompletionUI
            ? { paddingBottom: ROUND_COMPLETE_BOTTOM_INSET }
            : showDraftSetupDeck
              ? { paddingBottom: DRAFT_SETUP_BOTTOM_INSET }
              : undefined
      }
    >
      <RoundHeaderMenuPortal
        show={showHeaderMenu}
        isSubmitting={isSubmitting}
        isTransitioning={isTransitioning}
        onAbandonRound={() => void onAbandonRound()}
        onViewScorecard={() => setScorecardOpen(true)}
        onViewInfo={() => setRoundInfoOpen(true)}
        scorecardDialog={
          <RoundScorecardDialog open={scorecardOpen} onOpenChange={setScorecardOpen}>
            {renderScorecard({ showTitle: false, showBorder: false })}
          </RoundScorecardDialog>
        }
        infoDialog={
          <RoundInfoDialog
            open={roundInfoOpen}
            onOpenChange={setRoundInfoOpen}
            roundName={roundName}
            courseName={courseName}
            layoutName={layoutName}
            holeCount={holes.length}
            layoutTotalPar={layoutTotalPar}
            startingHole={startingHole}
            roundStatus={liveRoundStatus}
          />
        }
      />
      {liveRoundStatus === "draft" ? (
        <div className="space-y-4">
          <DraftPlayersPanel
            unifiedPlayers={unifiedPlayers}
            isScorer={isScorer}
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
            <DraftStartingHoleField
              supabase={supabase}
              roundId={roundId}
              holeNumbers={holeNumbers}
              startingHole={startingHole}
              disabled={isSubmitting || isTransitioning}
              onStartingHoleChange={setStartingHole}
            />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Waiting for {scorerDisplayName} to start the round.
            </p>
          )}
        </div>
      ) : null}

      <RoundSummaries
        showFrontNineSummary={showFrontNineSummary}
        scoringParticipants={scoringParticipants}
        holeScores={holeScores}
        firstNineHoleIds={firstNineHoleIds}
        getParticipantLabel={getParticipantLabel}
      />

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
            />
            </>
          ) : (
            <ActiveHoleStatus activeHole={scorecardActiveHole} holesLength={holes.length} />
          )}
        </>
      ) : null}

      {showPoolResults || showAbandonedResults ? (
        <RoundResults
          scoringParticipants={scoringParticipants}
          leaderboardByParticipantId={leaderboardByParticipantId}
          getParticipantLabel={getParticipantLabel}
        />
      ) : null}

      {showScorecardAtBottom ? renderScorecard({ showTitle: true }) : null}

      {showCompletionUI ? (
        <RoundCompleteActions
          isSubmitting={isSubmitting}
          isTransitioning={isTransitioning}
          onEditScores={() => setIsEditingScores(true)}
          onCompleteRound={onCompleteRound}
        />
      ) : null}
    </section>
    <DraftSetupDeck
      roundStatus={liveRoundStatus}
      isScorer={isScorer}
      isTransitioning={isTransitioning}
      hasPendingInvite={hasPendingInvite}
      pendingInviteLabels={pendingInviteLabels}
      onStartRound={() => void onStartRound()}
    />
    </>
  );
}
