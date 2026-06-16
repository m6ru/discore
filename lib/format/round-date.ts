export function formatRoundDate(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Prefer completion time; fall back to when the round started. */
export function formatRoundDisplayDate(
  completedAt: string | null | undefined,
  startedAt: string | null | undefined
): string | null {
  return formatRoundDate(completedAt ?? startedAt);
}
