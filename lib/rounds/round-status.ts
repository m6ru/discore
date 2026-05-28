/** Lifecycle states for a round, mirroring the `rounds.status` CHECK constraint. */
export const ROUND_STATUSES = ["draft", "active", "completed", "abandoned"] as const;

export type RoundStatus = (typeof ROUND_STATUSES)[number];

export function isRoundStatus(value: string): value is RoundStatus {
  return (ROUND_STATUSES as readonly string[]).includes(value);
}
