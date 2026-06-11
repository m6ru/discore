const DEFAULT_ROUND_TITLE = "Practice round";

export function formatRoundDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_ROUND_TITLE;
}
