/** Lifecycle states for a round, mirroring the `rounds.status` CHECK constraint. */
export const ROUND_STATUSES = ["draft", "active", "completed", "abandoned"] as const;

export type RoundStatus = (typeof ROUND_STATUSES)[number];

export function isRoundStatus(value: string): value is RoundStatus {
  return (ROUND_STATUSES as readonly string[]).includes(value);
}

/** Terminal states that share the post-round results + scorecard layout. */
export function isFinishedRoundStatus(status: RoundStatus): boolean {
  return status === "completed" || status === "abandoned";
}

/** Round history list: active plus finished rounds. */
export const HISTORY_ROUND_STATUSES = ["active", "completed", "abandoned"] as const;
