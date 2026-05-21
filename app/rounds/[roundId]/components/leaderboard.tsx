import { formatVsPar } from "@/lib/scoring/stats";
import type { LeaderboardRow } from "../round-types";

type Props = {
  leaderboardRows: LeaderboardRow[];
};

export function Leaderboard({ leaderboardRows }: Props) {
  if (
    leaderboardRows.length === 0 ||
    !leaderboardRows.some((row) => row.thru > 0)
  ) {
    return null;
  }

  return (
    <div className="space-y-3 border-t border-zinc-200 pt-8">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900">Leaderboard</h3>
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Sorted by vs par</p>
      </div>
      <ol className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {leaderboardRows.map((row, index) => {
          const positionLabel = row.thru === 0 ? "—" : String(index + 1);
          const vsParLabel = row.thru > 0 ? formatVsPar(row.vsPar) : "—";
          const vsParTone =
            row.thru === 0
              ? "text-zinc-400"
              : row.vsPar < 0
                ? "text-emerald-700"
                : row.vsPar > 0
                  ? "text-rose-700"
                  : "text-zinc-700";
          return (
            <li key={row.participantId} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-zinc-500">
                {positionLabel}
              </span>
              <span className="flex-1 truncate text-zinc-900">{row.label}</span>
              <span
                className={`w-12 shrink-0 text-right text-sm font-semibold tabular-nums ${vsParTone}`}
              >
                {vsParLabel}
              </span>
              <span className="w-10 shrink-0 text-right text-sm tabular-nums text-zinc-700">
                {row.thru > 0 ? row.totalStrokes : "—"}
              </span>
              <span className="w-16 shrink-0 text-right text-[11px] text-zinc-500">
                thru {row.thru}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
