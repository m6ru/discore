// Scores the scorer has saved on this device but the server hasn't confirmed
// yet. Not a log: one entry per participant × hole, the latest value wins, so
// re-sending is always safe (the server upserts on the same key).

export type PendingScore = {
  round_id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: boolean;
  fairway_hit: boolean | null;
};

export type PendingScores = Readonly<Record<string, PendingScore>>;

type ScoreCell = {
  id: string;
  participant_id: string;
  hole_id: string;
  strokes: number;
  ob: boolean;
  fairway_hit: boolean | null;
};

const STORAGE_PREFIX = "discore:pending-scores:";

export function pendingScoreKey(participantId: string, holeId: string): string {
  return `${participantId}:${holeId}`;
}

export function addPendingScores(pending: PendingScores, rows: PendingScore[]): PendingScores {
  const next: Record<string, PendingScore> = { ...pending };
  for (const row of rows) {
    next[pendingScoreKey(row.participant_id, row.hole_id)] = row;
  }
  return next;
}

/**
 * Drops the rows the server confirmed — but only if they weren't changed again
 * while the request was in flight (a newer value must still be sent).
 */
export function removeSyncedScores(pending: PendingScores, sent: PendingScore[]): PendingScores {
  const next: Record<string, PendingScore> = { ...pending };
  for (const row of sent) {
    const key = pendingScoreKey(row.participant_id, row.hole_id);
    const current = next[key];
    if (current && current.strokes === row.strokes && current.ob === row.ob) {
      delete next[key];
    }
  }
  return next;
}

/** Server rows with unconfirmed local values on top: local always wins until synced. */
export function overlayPendingScores<T extends ScoreCell>(
  server: T[],
  pending: PendingScores
): (T | ScoreCell)[] {
  const entries = Object.entries(pending);
  if (entries.length === 0) {
    return server;
  }
  const keys = new Set(entries.map(([key]) => key));
  const result: (T | ScoreCell)[] = server.filter(
    (row) => !keys.has(pendingScoreKey(row.participant_id, row.hole_id))
  );
  for (const [key, row] of entries) {
    const existing = server.find(
      (s) => s.participant_id === row.participant_id && s.hole_id === row.hole_id
    );
    result.push({
      id: existing?.id ?? `pending:${key}`,
      participant_id: row.participant_id,
      hole_id: row.hole_id,
      strokes: row.strokes,
      ob: row.ob,
      fairway_hit: row.fairway_hit,
    });
  }
  return result;
}

export function countPendingHoles(pending: PendingScores): number {
  return new Set(Object.values(pending).map((row) => row.hole_id)).size;
}

/**
 * Network trouble (status 0: offline, timeout, aborted), auth refresh, rate
 * limits and server errors are worth retrying. Any other 4xx is the database
 * refusing the write (RLS, trigger, check) and will fail again the same way.
 */
export function isRetryableSaveError(status: number): boolean {
  return status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;
}

function isPendingScore(value: unknown): value is PendingScore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.round_id === "string" &&
    typeof row.participant_id === "string" &&
    typeof row.hole_id === "string" &&
    typeof row.strokes === "number" &&
    typeof row.ob === "boolean" &&
    (row.fairway_hit === null || typeof row.fairway_hit === "boolean")
  );
}

export function readPendingScores(roundId: string): PendingScores {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + roundId);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return {};
    }
    const rows = parsed.filter(isPendingScore).filter((row) => row.round_id === roundId);
    return addPendingScores({}, rows);
  } catch {
    return {};
  }
}

export function writePendingScores(roundId: string, pending: PendingScores): void {
  try {
    const rows = Object.values(pending);
    if (rows.length === 0) {
      window.localStorage.removeItem(STORAGE_PREFIX + roundId);
    } else {
      window.localStorage.setItem(STORAGE_PREFIX + roundId, JSON.stringify(rows));
    }
  } catch {
    // Private mode / quota: the in-memory queue still syncs while the page is open.
  }
}
