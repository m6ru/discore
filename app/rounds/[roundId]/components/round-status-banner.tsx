import type { RoundStatus } from "@/lib/rounds/round-status";

type Props = {
  lastSavedLabel: string | null;
  roundStatus: RoundStatus;
};

export function RoundStatusBanner({ lastSavedLabel, roundStatus }: Props) {
  if (roundStatus !== "active" || !lastSavedLabel) {
    return null;
  }

  return (
    <p className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
      {lastSavedLabel}
    </p>
  );
}
