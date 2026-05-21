"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFirstIncompleteHoleIndex } from "@/lib/scoring/stats";
import { clearLegacyPendingQueueStorage, mergeHoleScoresByCell } from "@/lib/rounds/hole-scores";
import {
  parseUpsertedHoleScores,
  upsertHoleScores,
  type HoleScoreUpsertRow,
} from "@/lib/rounds/round-active-actions";
import type { Database } from "@/lib/database.types";
import type { HoleRow, HoleScoreRow, LastSavedEvent, ParticipantRow } from "./round-types";

type Client = SupabaseClient<Database>;

type Options = {
  supabase: Client;
  roundId: string;
  isScorer: boolean;
  holes: HoleRow[];
  initialHoleScores: HoleScoreRow[];
  scoringParticipants: ParticipantRow[];
  holeScores: HoleScoreRow[];
  setHoleScores: Dispatch<SetStateAction<HoleScoreRow[]>>;
  setLastSavedEvent: Dispatch<SetStateAction<LastSavedEvent | null>>;
  setRenderNow: Dispatch<SetStateAction<number>>;
  setStatus: (message: string | null) => void;
  setIsSubmitting: (value: boolean) => void;
};

export function useActiveScoring({
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

  const saveCurrentHoleScores = useCallback(async (): Promise<boolean> => {
    if (!isScorer || !activeHole) {
      return false;
    }

    type RowInput = { participantId: string; strokes: number; ob: boolean };
    const rowInputs: RowInput[] = [];

    for (const participant of scoringParticipants) {
      const rawValue = getStrokeInputValue(participant.id).trim();
      const strokes = Number(rawValue);

      if (!Number.isInteger(strokes) || strokes < 1 || strokes > 25) {
        setStatus(
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

    const payload: HoleScoreUpsertRow[] = rowInputs.map((r) => ({
      round_id: roundId,
      participant_id: r.participantId,
      hole_id: activeHole.id,
      strokes: r.strokes,
      ob: r.ob,
      fairway_hit: null,
    }));

    setIsSubmitting(true);
    setStatus(null);

    const { data, error } = await upsertHoleScores(supabase, payload);

    setIsSubmitting(false);

    if (error) {
      setStatus(`Could not save scores: ${error.message}`);
      return false;
    }

    const returned = parseUpsertedHoleScores(data);
    setHoleScores((prev) => {
      const without = prev.filter(
        (score) =>
          !rowInputs.some(
            (r) =>
              r.participantId === score.participant_id && activeHole.id === score.hole_id
          )
      );
      return mergeHoleScoresByCell(without, returned);
    });

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
    supabase,
    setHoleScores,
    setStatus,
    setIsSubmitting,
    setLastSavedEvent,
    setRenderNow,
  ]);

  const onSaveAndAdvanceHole = useCallback(async () => {
    const saved = await saveCurrentHoleScores();
    if (!saved || !activeHole) {
      return;
    }

    if (isLastHole) {
      setStatus("Final hole saved. Review summary and end the round.");
      return;
    }

    setCurrentHoleIndex((index) => Math.min(index + 1, holes.length - 1));
    setStatus(null);
  }, [saveCurrentHoleScores, activeHole, isLastHole, holes.length, setStatus]);

  const onPreviousHole = useCallback(() => {
    setStatus(null);
    setCurrentHoleIndex((index) => Math.max(index - 1, 0));
  }, [setStatus]);

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
    clearLegacyOnTerminal: () => clearLegacyPendingQueueStorage(roundId),
  };
}
