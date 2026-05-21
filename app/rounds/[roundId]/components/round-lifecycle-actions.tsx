type Props = {
  roundStatus: string;
  isScorer: boolean;
  isTransitioning: boolean;
  hasPendingInvite: boolean;
  onStartRound: () => void;
  onDeleteDraft: () => void;
  onAbandonRound: () => void;
};

export function RoundLifecycleActions({
  roundStatus,
  isScorer,
  isTransitioning,
  hasPendingInvite,
  onStartRound,
  onDeleteDraft,
  onAbandonRound,
}: Props) {
  return (
    <>
      <div className="flex flex-wrap gap-2 pt-2">
        {roundStatus === "draft" && isScorer ? (
          <>
            <button
              type="button"
              onClick={onStartRound}
              disabled={isTransitioning || hasPendingInvite}
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isTransitioning ? "Working..." : "Start round"}
            </button>
            <button
              type="button"
              onClick={onDeleteDraft}
              disabled={isTransitioning}
              className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
            >
              Delete draft
            </button>
          </>
        ) : null}

        {roundStatus === "active" && isScorer ? (
          <button
            type="button"
            onClick={onAbandonRound}
            disabled={isTransitioning}
            className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-60"
          >
            Abandon round
          </button>
        ) : null}
      </div>

      {roundStatus === "draft" && hasPendingInvite && isScorer ? (
        <p className="text-xs text-zinc-500">
          Resolve pending invitations (accept or remove) before starting the round.
        </p>
      ) : null}
    </>
  );
}
