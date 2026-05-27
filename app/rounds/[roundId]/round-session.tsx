"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { segmentPlayerStats } from "@/lib/scoring/stats";
import { makeScoreLookupKey } from "@/lib/scoring/types";
import { clearLegacyPendingQueueStorage } from "@/lib/rounds/hole-scores";
import { getParticipantLabel as labelForParticipant } from "@/lib/rounds/participant-labels";
import { buildUnifiedPlayers } from "@/lib/rounds/unified-players";
import type { InviteRow } from "@/lib/rounds/invite-rows";
import { ActiveHoleScoring } from "./components/active-hole-scoring";
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
  LeaderboardRow,
  LastSavedEvent,
  ParticipantRow,
  RoundStatus,
  RoundSessionProps,
} from "./round-types";
import { useActiveScoring } from "./use-active-scoring";
import { useDraftSetup } from "./use-draft-setup";
import { useProfileSearch } from "./use-profile-search";
import { useRoundLifecycle } from "./use-round-lifecycle";
import { useRoundRealtime } from "./use-round-realtime";

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
  const [status, setStatus] = useState<string | null>(null);
  const [liveRoundStatus, setLiveRoundStatus] = useState<RoundStatus>(roundStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [holeScores, setHoleScores] = useState<HoleScoreRow[]>(initialHoleScores);
  const [lastSavedEvent, setLastSavedEvent] = useState<LastSavedEvent | null>(null);
  const [renderNow, setRenderNow] = useState(0);

  const onLoadError = useCallback((message: string) => setStatus(message), []);

  const { loadParticipants, loadInvites } = useRoundRealtime({
    supabase,
    roundId,
    setParticipants,
    setInvites,
    setHoleScores,
    setRoundStatus: setLiveRoundStatus,
    setLastSavedEvent,
    setRenderNow,
    onLoadError,
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
    setLastSavedEvent,
    setRenderNow,
    setStatus,
    setIsSubmitting,
  });

  const { onAbandonRound, onCompleteRound } = useRoundLifecycle({
    supabase,
    roundId,
    isScorer,
    saveCurrentHoleScores,
    setStatus,
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
    setStatus,
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
    onSearchError: setStatus,
  });

  useEffect(() => {
    if (isScorer) {
      clearLegacyPendingQueueStorage(roundId);
    }
  }, [roundId, isScorer]);

  useEffect(() => {
    if (liveRoundStatus === "completed" || liveRoundStatus === "abandoned") {
      clearLegacyPendingQueueStorage(roundId);
    }
  }, [liveRoundStatus, roundId]);

  useEffect(() => {
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
  const holeIds = useMemo(() => holes.map((hole) => hole.id), [holes]);
  const firstNineHoleIds = useMemo(
    () => holes.filter((hole) => hole.hole_number <= 9).map((hole) => hole.id),
    [holes]
  );

  const allScoresComplete = useMemo(() => {
    if (holeIds.length === 0 || scoringParticipants.length === 0) return false;
    return holeIds.every((holeId) =>
      scoringParticipants.every((participant) =>
        holeScores.some(
          (score) => score.hole_id === holeId && score.participant_id === participant.id
        )
      )
    );
  }, [holeIds, scoringParticipants, holeScores]);

  const frontNineComplete = useMemo(() => {
    if (firstNineHoleIds.length === 0 || scoringParticipants.length === 0) return false;
    return firstNineHoleIds.every((holeId) =>
      scoringParticipants.every((participant) =>
        holeScores.some(
          (score) => score.hole_id === holeId && score.participant_id === participant.id
        )
      )
    );
  }, [firstNineHoleIds, scoringParticipants, holeScores]);

  const showFinalSummary =
    liveRoundStatus === "completed" || (liveRoundStatus === "active" && allScoresComplete);
  const showFrontNineSummary =
    liveRoundStatus === "active" && !showFinalSummary && frontNineComplete;

  const sortedHoles = useMemo(
    () => [...holes].sort((a, b) => a.hole_number - b.hole_number),
    [holes]
  );

  const scoreLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of holeScores) {
      map.set(makeScoreLookupKey(row.participant_id, row.hole_id), row.strokes);
    }
    return map;
  }, [holeScores]);

  const holeSegments = useMemo(() => {
    const segments: typeof sortedHoles[] = [];
    for (let i = 0; i < sortedHoles.length; i += 9) {
      segments.push(sortedHoles.slice(i, i + 9));
    }
    return segments;
  }, [sortedHoles]);

  const holeProgressDots = useMemo(
    () =>
      sortedHoles.map((h) => ({
        hole: h,
        allScored:
          scoringParticipants.length > 0 &&
          scoringParticipants.every(
            (p) => scoreLookup.get(makeScoreLookupKey(p.id, h.id)) !== undefined
          ),
        isCurrent: liveRoundStatus === "active" && activeHole?.id === h.id,
      })),
    [sortedHoles, scoringParticipants, scoreLookup, activeHole, liveRoundStatus]
  );

  const lastSavedLabel = useMemo(() => {
    if (!lastSavedEvent || renderNow === 0) return null;
    const hole = sortedHoles.find((h) => h.id === lastSavedEvent.holeId);
    if (!hole) return null;
    const participant = participants.find((p) => p.id === lastSavedEvent.participantId);
    const participantLabel = participant
      ? (unifiedPlayers.find((item) => item.participantId === participant.id)?.label ??
        participant.guest_name ??
        "Player")
      : "Player";
    const cleanLabel = participantLabel.replace(" (pending)", "");
    const diffMs = Math.max(0, renderNow - lastSavedEvent.savedAt);
    let relative: string;
    if (diffMs < 10_000) relative = "just now";
    else if (diffMs < 60_000) relative = `${Math.floor(diffMs / 1000)}s ago`;
    else if (diffMs < 3_600_000) relative = `${Math.floor(diffMs / 60_000)}m ago`;
    else relative = `${Math.floor(diffMs / 3_600_000)}h ago`;
    return `Hole ${hole.hole_number} saved by ${cleanLabel} · ${relative}`;
  }, [lastSavedEvent, renderNow, sortedHoles, participants, unifiedPlayers]);

  const leaderboardRows = useMemo((): LeaderboardRow[] => {
    const rows = scoringParticipants.map((participant) => {
      const stats = segmentPlayerStats(participant.id, sortedHoles, scoreLookup);
      const label =
        unifiedPlayers.find((item) => item.participantId === participant.id)?.label ??
        participant.guest_name ??
        "Player";
      return {
        participantId: participant.id,
        label: label.replace(" (pending)", ""),
        totalStrokes: stats.totalStrokes,
        vsPar: stats.vsPar,
        thru: stats.thru,
      };
    });
    rows.sort((a, b) => {
      if (a.thru === 0 && b.thru === 0) return a.label.localeCompare(b.label);
      if (a.thru === 0) return 1;
      if (b.thru === 0) return -1;
      if (a.vsPar !== b.vsPar) return a.vsPar - b.vsPar;
      if (a.totalStrokes !== b.totalStrokes) return a.totalStrokes - b.totalStrokes;
      return a.label.localeCompare(b.label);
    });
    return rows;
  }, [scoringParticipants, sortedHoles, scoreLookup, unifiedPlayers]);

  const getParticipantLabel = useCallback(
    (participant: ParticipantRow) => labelForParticipant(participant, unifiedPlayers),
    [unifiedPlayers]
  );

  return (
    <section className="space-y-5 rounded-lg border border-zinc-200 p-4">
      <h2 className="text-lg font-semibold">Round</h2>
      <h3 className="text-base font-semibold text-zinc-800">Participants</h3>

      <ParticipantsList
        unifiedPlayers={unifiedPlayers}
        isSubmitting={isSubmitting}
        onRemovePlayer={onRemovePlayer}
      />

      {liveRoundStatus === "draft" && isScorer ? (
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
      ) : null}

      <RoundStatusBanner
        status={status}
        lastSavedLabel={lastSavedLabel}
        roundStatus={liveRoundStatus}
      />

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
          className={`rounded-2xl border shadow-sm ${
            isScorer && canScore
              ? "border-zinc-200/90 bg-gradient-to-b from-white to-zinc-50 p-5 sm:p-6"
              : "border-zinc-200 bg-zinc-50/40 p-4"
          }`}
        >
          {!canScore ? (
            <p className="text-sm text-zinc-500">No participants available for scoring.</p>
          ) : isScorer && activeHole ? (
            <ActiveHoleScoring
              activeHole={activeHole}
              holesLength={holes.length}
              sortedHoles={sortedHoles}
              holeProgressDots={holeProgressDots}
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
              onSaveAndAdvanceHole={onSaveAndAdvanceHole}
            />
          ) : (
            <ObserverActiveHint activeHole={activeHole} holesLength={holes.length} />
          )}
        </div>
      ) : null}

      <RoundLifecycleActions
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
