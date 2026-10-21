"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { getFirstIncompleteHoleIndex } from "@/lib/scoring/stats";
import type { PendingScore } from "@/lib/rounds/pending-scores";
import { toastError } from "@/lib/ui/toast-notify";
import type { HoleRow, HoleScoreRow, LastSavedEvent, ParticipantRow } from "../round-types";

type Options = {
  roundId: string;
  isScorer: boolean;
  holes: HoleRow[];
  initialHoleScores: HoleScoreRow[];
  scoringParticipants: ParticipantRow[];
  /** Server scores with unsynced local values on top. */
  holeScores: HoleScoreRow[];
  /** Saves on the device and syncs in the background (useScoreSync). */
  enqueueScores: (rows: PendingScore[]) => void;
  setLastSavedEvent: Dispatch<SetStateAction<LastSavedEvent | null>>;
  setRenderNow: Dispatch<SetStateAction<number>>;
  onFinalHoleSaved?: () => void;
};

export function useActiveScoring({
  roundId,
  isScorer,
  holes,
  initialHoleScores,
  scoringParticipants,
  holeScores,
  enqueueScores,
  setLastSavedEvent,
  setRenderNow,
  onFinalHoleSaved,
}: Options) {
  const [currentHoleIndex, setCurrentHoleIndex] = useState(() =>
    getFirstIncompleteHoleIndex(holes, scoringParticipants, initialHoleScores)
  );
  const [draftStrokeInputs, setDraftStrokeInputs] = useState<Record<string, string>>({});
  const [draftObInputs, setDraftObInputs] = useState<Record<string, boolean>>({});

  const activeHole = holes[currentHoleIndex] ?? null;
  const isLastHole = activeHole ? currentHoleIndex === holes.length - 1 : false;

  const getStrokeInputValue = useCallback(
    (participantId: string): string => {
      if (!activeHole) {
        return "";
      }

      const key = `${activeHole.id}:${participantId}`;
      const draftValue = draftStrokeInputs[key];
      if (draftValue !== undefined) {
        return draftValue;
      }

      const existing = holeScores.find(
        (score) => score.hole_id === activeHole.id && score.participant_id === participantId
      );
      return existing ? String(existing.strokes) : "";
    },
    [activeHole, draftStrokeInputs, holeScores]
  );

  const isObChecked = useCallback(
    (participantId: string): boolean => {
      if (!activeHole) {
        return false;
      }
      const key = `${activeHole.id}:${participantId}`;
      const draftValue = draftObInputs[key];
      if (draftValue !== undefined) {
        return draftValue;
      }
      const existing = holeScores.find(
        (score) => score.hole_id === activeHole.id && score.participant_id === participantId
      );
      return existing?.ob ?? false;
    },
    [activeHole, draftObInputs, holeScores]
  );

  const setStrokeDraft = useCallback(
    (participantId: string, value: string) => {
      if (!activeHole) {
        return;
      }
      setDraftStrokeInputs((prev) => ({
        ...prev,
        [`${activeHole.id}:${participantId}`]: value,
      }));
    },
    [activeHole]
  );

  const setObDraft = useCallback(
    (participantId: string, checked: boolean) => {
      if (!activeHole) {
        return;
      }
      setDraftObInputs((prev) => ({
        ...prev,
        [`${activeHole.id}:${participantId}`]: checked,
      }));
    },
    [activeHole]
  );

  /** Validates the hole and queues it; never waits for the network. */
  const saveCurrentHoleScores = useCallback((): boolean => {
    if (!isScorer || !activeHole) {
      return false;
    }

    type RowInput = { participantId: string; strokes: number; ob: boolean };
    const rowInputs: RowInput[] = [];

    for (const participant of scoringParticipants) {
      const rawValue = getStrokeInputValue(participant.id).trim();
      if (rawValue.length === 0) {
        toastError(
          `Enter a score for every player on hole ${activeHole.hole_number} before continuing.`
        );
        return false;
      }

      const strokes = Number(rawValue);
      if (!Number.isInteger(strokes) || strokes < 1 || strokes > 25) {
        toastError(
          `Enter valid strokes (1-25) for every player on hole ${activeHole.hole_number}.`
        );
        return false;
      }

      rowInputs.push({
        participantId: participant.id,
        strokes,
        ob: isObChecked(participant.id),
      });
    }

    enqueueScores(
      rowInputs.map((r) => ({
        round_id: roundId,
        participant_id: r.participantId,
        hole_id: activeHole.id,
        strokes: r.strokes,
        ob: r.ob,
        fairway_hit: null,
      }))
    );

    setDraftStrokeInputs((prev) => {
      const next = { ...prev };
      for (const participant of scoringParticipants) {
        delete next[`${activeHole.id}:${participant.id}`];
      }
      return next;
    });
    setDraftObInputs((prev) => {
      const next = { ...prev };
      for (const participant of scoringParticipants) {
        delete next[`${activeHole.id}:${participant.id}`];
      }
      return next;
    });

    queueMicrotask(() => {
      const savedAt = Date.now();
      setLastSavedEvent({
        holeId: activeHole.id,
        participantId: scoringParticipants[0]!.id,
        savedAt,
      });
      setRenderNow(savedAt);
    });
    return true;
  }, [
    isScorer,
    activeHole,
    scoringParticipants,
    getStrokeInputValue,
    isObChecked,
    roundId,
    enqueueScores,
    setLastSavedEvent,
    setRenderNow,
  ]);

  const onSaveAndAdvanceHole = useCallback(() => {
    const saved = saveCurrentHoleScores();
    if (!saved || !activeHole) {
      return;
    }

    if (isLastHole) {
      onFinalHoleSaved?.();
      return;
    }

    setCurrentHoleIndex((index) => Math.min(index + 1, holes.length - 1));
  }, [saveCurrentHoleScores, activeHole, isLastHole, holes.length, onFinalHoleSaved]);

  const onPreviousHole = useCallback(() => {
    setCurrentHoleIndex((index) => Math.max(index - 1, 0));
  }, []);

  const onNextHole = useCallback(() => {
    setCurrentHoleIndex((index) => Math.min(index + 1, holes.length - 1));
  }, [holes.length]);

  return {
    currentHoleIndex,
    activeHole,
    isLastHole,
    getStrokeInputValue,
    isObChecked,
    setStrokeDraft,
    setObDraft,
    saveCurrentHoleScores,
    onSaveAndAdvanceHole,
    onPreviousHole,
    onNextHole,
  };
}
