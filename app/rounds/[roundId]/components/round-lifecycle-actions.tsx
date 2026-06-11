import type { RoundStatus } from "@/lib/rounds/round-status";
import { Button } from "@/components/ui/button";

type Props = {
  placement: "setup" | "footer";
  roundStatus: RoundStatus;
  isScorer: boolean;
  isTransitioning: boolean;
  hasPendingInvite: boolean;
  onStartRound: () => void;
  onAbandonRound: () => void;
};

export function RoundLifecycleActions({
  placement,
  roundStatus,
  isScorer,
  isTransitioning,
  hasPendingInvite,
  onStartRound,
  onAbandonRound,
}: Props) {
  if (placement === "setup") {
    if (roundStatus !== "draft" || !isScorer) {
      return null;
    }

    return (
      <div className="space-y-2">
        <Button
          type="button"
          size="lg"
          className="min-h-11 w-full"
          onClick={onStartRound}
          disabled={isTransitioning || hasPendingInvite}
        >
          {isTransitioning ? "Working..." : "Start round"}
        </Button>
        {hasPendingInvite ? (
          <p className="text-center text-xs text-muted-foreground">
            Resolve pending invitations before starting.
          </p>
        ) : null}
      </div>
    );
  }

  if (roundStatus !== "active" || !isScorer) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onAbandonRound}
      disabled={isTransitioning}
    >
      {isTransitioning ? "Working..." : "Abandon round"}
    </Button>
  );
}
