import type { RoundStatus } from "@/lib/rounds/round-status";
import { Button } from "@/components/ui/button";

type Props = {
  roundStatus: RoundStatus;
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
            <Button
              type="button"
              onClick={onStartRound}
              disabled={isTransitioning || hasPendingInvite}
            >
              {isTransitioning ? "Working..." : "Start round"}
            </Button>
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
