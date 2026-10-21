import { CloudOff, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncPhase } from "../hooks/use-score-sync";

type Props = {
  phase: SyncPhase;
  pendingHoleCount: number;
  onRetry: () => void;
};

/**
 * Sits just above a fixed bottom deck (absolute, so it never moves the page).
 * Hidden while everything is synced.
 */
export function SyncStatusBadge({ phase, pendingHoleCount, onRetry }: Props) {
  if (phase === "synced" || pendingHoleCount === 0) {
    return null;
  }

  const holes = `${pendingHoleCount} ${pendingHoleCount === 1 ? "hole" : "holes"}`;
  const failed = phase === "failed";

  return (
    <button
      type="button"
      aria-live="polite"
      onClick={onRetry}
      className={cn(
        "absolute bottom-full right-3 mb-2 flex items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1 text-xs shadow-sm backdrop-blur",
        failed ? "border-destructive/40 text-destructive" : "text-muted-foreground"
      )}
    >
      {failed ? (
        <TriangleAlert className="size-3.5" aria-hidden />
      ) : (
        <CloudOff className="size-3.5" aria-hidden />
      )}
      {failed ? `Not saved · ${holes} · Retry` : `Waiting for signal · ${holes}`}
    </button>
  );
}
