"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { makeScoreLookupKey } from "@/lib/scoring/types";
import { isSegmentComplete } from "@/lib/scoring/segments";
import { buildLeaderboard } from "@/lib/scoring/leaderboard";
import { formatRelativeTime } from "@/lib/format/relative-time";
import { getParticipantLabel as labelForParticipant } from "@/lib/rounds/participant-labels";
import { buildUnifiedPlayers } from "@/lib/rounds/unified-players";
import type { InviteRow } from "@/lib/rounds/invite-rows";
import {
  ACTIVE_SCORING_BOTTOM_INSET,
  ActiveHoleScoring,
} from "./components/active-hole-scoring";
import { DraftParticipantForm } from "./components/draft-participant-form";
import { Leaderboard } from "./components/leaderboard";
import { ObserverActiveHint } from "./components/observer-active-hint";
import { ParticipantsList } from "./components/participants-list";
import { RoundLifecycleActions } from "./components/round-lifecycle-actions";
import { RoundStatusBanner } from "./components/round-status-banner";
import { RoundSummaries } from "./components/round-summaries";
import { ScorecardSection } from "./components/scorecard-section";
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
  const [lastSavedEvent, setLastSavedEvent] = useState<LastSavedEvent | null>(null);
  // `renderNow` is the clock value the relative-time label reads. We start at
  // 0 to keep SSR output stable (no Date.now() during render), then bump it
  // post-mount via the useLayoutEffect below and every 15s while a save event
  // is on-screen.
  const [renderNow, setRenderNow] = useState(0);

  const { loadParticipants, loadInvites } = useRoundRealtime({
    supabase,
    roundId,
    setParticipants,
    setInvites,
    setHoleScores,
    setRoundStatus: setLiveRoundStatus,
    setLastSavedEvent,
    setRenderNow,
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
    onNextHole,
  } = useActiveScoring({
    supabase,
    roundId,
    isScorer,
    holes,
    initialHoleScores,
    scoringParticipants,
    holeScores,
    setHoleScores,
    setLastSavedEvent,
    setRenderNow,
    setIsSubmitting,
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

  // Pick up server-rendered status changes after `router.refresh()`. Realtime
  // events also write to `liveRoundStatus`, so the mirror is intentional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync server prop into client state
    setLiveRoundStatus(roundStatus);
  }, [roundStatus]);

  useLayoutEffect(() => {
    queueMicrotask(() => {
      setRenderNow(Date.now());
    });
  }, [roundId]);

  useEffect(() => {
    if (!lastSavedEvent) {
      return;
    }
    const interval = setInterval(() => setRenderNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, [lastSavedEvent]);

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

  const showFinalSummary =
    liveRoundStatus === "completed" || (liveRoundStatus === "active" && allScoresComplete);
  const showFrontNineSummary =
    liveRoundStatus === "active" && !showFinalSummary && frontNineComplete;

  const holeSegments = useMemo(() => {
    const segments: typeof sortedHoles[] = [];
    for (let i = 0; i < sortedHoles.length; i += 9) {
      segments.push(sortedHoles.slice(i, i + 9));
    }
    return segments;
  }, [sortedHoles]);

  const labelByParticipantId = useMemo(() => {
    const map = new Map<string, string>();
    for (const participant of participants) {
      map.set(participant.id, labelForParticipant(participant, unifiedPlayers));
    }
    return map;
  }, [participants, unifiedPlayers]);

  const showStickySaveBar =
    liveRoundStatus === "active" && isScorer && canScore && !showFinalSummary;

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedEvent || renderNow === 0) return null;
    const hole = sortedHoles.find((h) => h.id === lastSavedEvent.holeId);
    if (!hole) return null;
    const participantLabel = labelByParticipantId.get(lastSavedEvent.participantId) ?? "Player";
    const relative = formatRelativeTime(renderNow - lastSavedEvent.savedAt);
    return `Hole ${hole.hole_number} saved by ${participantLabel} · ${relative}`;
  }, [lastSavedEvent, renderNow, sortedHoles, labelByParticipantId]);

  const leaderboardRows = useMemo(
    () =>
      buildLeaderboard(
        scoringParticipants,
        sortedHoles,
        scoreLookup,
        (id) => labelByParticipantId.get(id) ?? "Player",
      ),
    [scoringParticipants, sortedHoles, scoreLookup, labelByParticipantId]
  );

  const getParticipantLabel = useCallback(
    (participant: ParticipantRow) =>
      labelByParticipantId.get(participant.id) ?? "Player",
    [labelByParticipantId]
  );

  return (
    <section
      className="space-y-5 rounded-lg border p-4"
      style={showStickySaveBar ? { paddingBottom: ACTIVE_SCORING_BOTTOM_INSET } : undefined}
    >
      <h3 className="text-base font-semibold">Participants</h3>

      <ParticipantsList
        unifiedPlayers={unifiedPlayers}
        isSubmitting={isSubmitting}
        onRemovePlayer={onRemovePlayer}
      />

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

      <RoundStatusBanner lastSavedLabel={lastSavedLabel} roundStatus={liveRoundStatus} />

      <RoundSummaries
        showFrontNineSummary={showFrontNineSummary}
        showFinalSummary={showFinalSummary}
        roundStatus={liveRoundStatus}
        isScorer={isScorer}
        isSubmitting={isSubmitting}
        isTransitioning={isTransitioning}
        scoringParticipants={scoringParticipants}
        holeScores={holeScores}
        firstNineHoleIds={firstNineHoleIds}
        holeIds={holeIds}
        getParticipantLabel={getParticipantLabel}
        onCompleteRound={onCompleteRound}
      />

      {liveRoundStatus === "active" && !showFinalSummary ? (
        <div
          className={cn(
            "rounded-2xl border bg-card shadow-sm",
            isScorer && canScore ? "p-5 sm:p-6" : "bg-muted/40 p-4"
          )}
        >
          {!canScore ? (
            <p className="text-sm text-muted-foreground">No participants available for scoring.</p>
          ) : isScorer && activeHole ? (
            <ActiveHoleScoring
              activeHole={activeHole}
              holesLength={holes.length}
              scoringParticipants={scoringParticipants}
              currentHoleIndex={currentHoleIndex}
              isLastHole={isLastHole}
              isSubmitting={isSubmitting}
              getParticipantLabel={getParticipantLabel}
              getStrokeInputValue={getStrokeInputValue}
              isObChecked={isObChecked}
              onStrokeChange={setStrokeDraft}
              onObToggle={setObDraft}
              onPreviousHole={onPreviousHole}
              onNextHole={onNextHole}
              onSaveAndAdvanceHole={onSaveAndAdvanceHole}
            />
          ) : (
            <ObserverActiveHint activeHole={activeHole} holesLength={holes.length} />
          )}
        </div>
      ) : null}

      <RoundLifecycleActions
        placement="footer"
        roundStatus={liveRoundStatus}
        isScorer={isScorer}
        isTransitioning={isTransitioning}
        hasPendingInvite={hasPendingInvite}
        onStartRound={() => void onStartRound()}
        onDeleteDraft={() => void onDeleteDraft()}
        onAbandonRound={() => void onAbandonRound()}
      />

      {liveRoundStatus !== "draft" ? <Leaderboard leaderboardRows={leaderboardRows} /> : null}

      <ScorecardSection
        roundStatus={liveRoundStatus}
        holeSegments={holeSegments}
        sortedHoles={sortedHoles}
        scoreLookup={scoreLookup}
        scoringParticipants={scoringParticipants}
        getParticipantLabel={getParticipantLabel}
        activeHole={activeHole}
      />
    </section>
  );
}
