/**
 * Short human-readable label for a past event:
 *
 *   < 10s   → "just now"
 *   < 1m    → "Ns ago"
 *   < 1h    → "Nm ago"
 *   ≥ 1h    → "Nh ago"
 *
 * Negative inputs are clamped to zero so future timestamps don't render as
 * "-3s ago" if clocks drift.
 */
export function formatRelativeTime(diffMs: number): string {
  const ms = Math.max(0, diffMs);
  if (ms < 10_000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}
