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
import { isSegmentComplete } from "@/lib/scoring/segments";
import { buildLeaderboard } from "@/lib/scoring/leaderboard";
import { buildTeePositionMap } from "@/lib/scoring/tee-order";
import { getParticipantLabel as labelForParticipant } from "@/lib/rounds/participant-labels";
import { buildUnifiedPlayers } from "@/lib/rounds/unified-players";
import type { InviteRow } from "@/lib/rounds/invite-rows";
import {
  ACTIVE_SCORING_BOTTOM_INSET,
  ActiveHoleScoring,
} from "./components/active-hole-scoring";
import { DraftParticipantForm } from "./components/draft-participant-form";
import { RoundResults } from "./components/round-results";
import { ObserverActiveHint } from "./components/observer-active-hint";
import { ParticipantsList } from "./components/participants-list";
import { RoundLifecycleActions } from "./components/round-lifecycle-actions";
import {
  ROUND_COMPLETE_BOTTOM_INSET,
  RoundCompleteActions,
} from "./components/round-complete-actions";
import { RoundSummaries } from "./components/round-summaries";
import { ScorecardSection } from "./components/scorecard-section";
import { RoundHeaderAbandonPortal } from "./components/round-header-abandon-portal";
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
import { cn } from "@/lib/utils";

export function RoundSession({
  roundId,
  roundStatus,
  scorerUserId,
  isScorer,
  currentUserId,
  scorerDisplayName,
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
  const [scorecardExpanded, setScorecardExpanded] = useState(false);
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
    holes,
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

  const canScore =
    liveRoundStatus === "active" && !!activeHole && scoringParticipants.length > 0;

  const sortedHoles = useMemo(
    () => [...holes].sort((a, b) => a.hole_number - b.hole_number),
    [holes]
  );

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

  const showScorecardAtBottom = !showStickySaveBar;
  const isActiveFlatLayout = liveRoundStatus === "active";

  const teePositionByParticipantId = useMemo(
    () =>
      buildTeePositionMap(
        sortedHoles,
        currentHoleIndex,
        scoringParticipants,
        scoreLookup
      ),
    [sortedHoles, currentHoleIndex, scoringParticipants, scoreLookup]
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

  const scorecardSection = (
    <ScorecardSection
      roundStatus={liveRoundStatus}
      sortedHoles={sortedHoles}
      scoreLookup={scoreLookup}
      obLookup={obLookup}
      leaderboardRows={leaderboardRows}
      activeHole={activeHole}
    />
  );

  return (
    <section
      className={cn(
        "space-y-4",
        !isActiveFlatLayout && "rounded-lg border p-4"
      )}
      style={
        showStickySaveBar
          ? { paddingBottom: ACTIVE_SCORING_BOTTOM_INSET }
          : showCompletionUI
            ? { paddingBottom: ROUND_COMPLETE_BOTTOM_INSET }
            : undefined
      }
    >
      <RoundHeaderAbandonPortal
        show={showStickySaveBar || showCompletionUI}
        isSubmitting={isSubmitting}
        isTransitioning={isTransitioning}
        onAbandonRound={() => void onAbandonRound()}
      />
      {liveRoundStatus === "draft" ? (
        <>
          <h3 className="text-base font-semibold">Participants</h3>
          <ParticipantsList
            unifiedPlayers={unifiedPlayers}
            isSubmitting={isSubmitting}
            onRemovePlayer={onRemovePlayer}
          />
        </>
      ) : null}

      {liveRoundStatus === "draft" && isScorer ? (
        <>
          <DraftParticipantForm
            participantName={participantName}
            isSubmitting={isSubmitting}
            isSearching={isSearching}
            searchResults={searchResults}
            selectedProfile={selectedProfile}
            onParticipantNameChange={(value) => {
              setParticipantName(value);
              setSelectedProfile(null);
            }}
            onSelectProfile={(profile) => {
              selectProfile(profile);
              setParticipantName(profile.display_name);
            }}
            onSubmit={(event) => void onAddParticipant(event, selectedProfile, clearSearchSelection)}
          />
          <RoundLifecycleActions
            placement="setup"
            roundStatus={liveRoundStatus}
            isScorer={isScorer}
            isTransitioning={isTransitioning}
            hasPendingInvite={hasPendingInvite}
            onStartRound={() => void onStartRound()}
            onDeleteDraft={() => void onDeleteDraft()}
            onAbandonRound={() => void onAbandonRound()}
          />
        </>
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
              scorecardSlot={
                <div className="space-y-4">
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm"
                      onClick={() => setScorecardExpanded((open) => !open)}
                    >
                      {scorecardExpanded ? "Hide scorecard" : "View scorecard"}
                    </Button>
                  </div>
                  {scorecardExpanded ? scorecardSection : null}
                </div>
              }
            />
            </>
          ) : (
            <ObserverActiveHint activeHole={activeHole} holesLength={holes.length} />
          )}
        </>
      ) : null}

      {(showCompletionUI || (liveRoundStatus !== "draft" && !showStickySaveBar)) ? (
        <RoundResults
          scoringParticipants={scoringParticipants}
          leaderboardByParticipantId={leaderboardByParticipantId}
          getParticipantLabel={getParticipantLabel}
        />
      ) : null}

      {showScorecardAtBottom ? scorecardSection : null}

      {showCompletionUI ? (
        <RoundCompleteActions
          isSubmitting={isSubmitting}
          isTransitioning={isTransitioning}
          onEditScores={() => setIsEditingScores(true)}
          onCompleteRound={onCompleteRound}
        />
      ) : null}
    </section>
  );
}
