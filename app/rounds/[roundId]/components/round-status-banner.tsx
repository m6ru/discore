import type { RoundStatus } from "@/lib/rounds/round-status";

type Props = {
  status: string | null;
  lastSavedLabel: string | null;
  roundStatus: RoundStatus;
};

export function RoundStatusBanner({ status, lastSavedLabel, roundStatus }: Props) {
  return (
    <>
      {status ? (
        <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">{status}</p>
      ) : null}

      {roundStatus === "active" && lastSavedLabel ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          {lastSavedLabel}
        </p>
      ) : null}
    </>
  );
}
