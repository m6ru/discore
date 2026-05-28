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
        <p className="rounded-md border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-700">{status}</p>
      ) : null}

      {roundStatus === "active" && lastSavedLabel ? (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
          {lastSavedLabel}
        </p>
      ) : null}
    </>
  );
}
