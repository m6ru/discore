import type { HoleRow, ParticipantRow } from "../round-types";

type HoleProgressDot = {
  hole: HoleRow;
  allScored: boolean;
  isCurrent: boolean;
};

type Props = {
  activeHole: HoleRow;
  holesLength: number;
  sortedHoles: HoleRow[];
  holeProgressDots: HoleProgressDot[];
  scoringParticipants: ParticipantRow[];
  currentHoleIndex: number;
  isLastHole: boolean;
  isSubmitting: boolean;
  getParticipantLabel: (participant: ParticipantRow) => string;
  getStrokeInputValue: (participantId: string) => string;
  isObChecked: (participantId: string) => boolean;
  onStrokeChange: (participantId: string, value: string) => void;
  onObToggle: (participantId: string, checked: boolean) => void;
  onPreviousHole: () => void;
  onSaveAndAdvanceHole: () => void;
};

export function ActiveHoleScoring({
  activeHole,
  holesLength,
  sortedHoles,
  holeProgressDots,
  scoringParticipants,
  currentHoleIndex,
  isLastHole,
  isSubmitting,
  getParticipantLabel,
  getStrokeInputValue,
  isObChecked,
  onStrokeChange,
  onObToggle,
  onPreviousHole,
  onSaveAndAdvanceHole,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center sm:text-left">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Enter scores</p>
        </div>
        <div className="mt-2 flex flex-col items-center gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <p className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-900">
            {activeHole.hole_number}
            <span className="text-xl font-normal text-zinc-400"> / {holesLength}</span>
          </p>
          <span className="hidden h-6 w-px bg-zinc-200 sm:inline-block" aria-hidden />
          <p className="text-base text-zinc-500">
            Par <span className="font-semibold text-zinc-800">{activeHole.par}</span>
          </p>
        </div>
      </div>

      {sortedHoles.length > 0 ? (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-start" aria-hidden>
          {holeProgressDots.map(({ hole, allScored, isCurrent }) => (
            <span
              key={hole.id}
              title={`Hole ${hole.hole_number}${allScored ? " — saved" : ""}${isCurrent ? " — current" : ""}`}
              className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors ${
                isCurrent
                  ? "bg-amber-400 ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white"
                  : allScored
                    ? "bg-emerald-500"
                    : "bg-zinc-300"
              }`}
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-4">
        {scoringParticipants.map((participant) => {
          const obChecked = isObChecked(participant.id);
          return (
            <div key={participant.id} className="space-y-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-500">
                  {getParticipantLabel(participant)}
                </span>
                <div className="flex items-stretch gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={25}
                    value={getStrokeInputValue(participant.id)}
                    onChange={(event) => onStrokeChange(participant.id, event.target.value)}
                    className="h-14 flex-1 rounded-xl border-2 border-zinc-200 bg-white px-4 text-center text-2xl font-semibold tabular-nums text-zinc-900 shadow-inner outline-none transition-colors placeholder:text-zinc-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15"
                    placeholder="—"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={obChecked}
                    aria-label={`Toggle OB for ${getParticipantLabel(participant)}`}
                    onClick={() => onObToggle(participant.id, !obChecked)}
                    className={`h-14 w-16 shrink-0 rounded-xl border-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                      obChecked
                        ? "border-rose-500 bg-rose-500 text-white shadow-sm"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-rose-200 hover:text-rose-600"
                    }`}
                  >
                    OB
                  </button>
                </div>
              </label>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
        {currentHoleIndex > 0 ? (
          <button
            type="button"
            onClick={onPreviousHole}
            disabled={isSubmitting}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Back
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void onSaveAndAdvanceHole()}
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : isLastHole ? "Save scores" : "Save & next hole"}
        </button>
      </div>
    </div>
  );
}
