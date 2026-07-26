export type PostRoundInsightsPreference = "unset" | "enabled" | "disabled";

const STORAGE_KEY = "discore-post-round-insights-preference";
const PENDING_PREFIX = "discore-post-round-insights-pending:";

function isPreference(value: string): value is PostRoundInsightsPreference {
  return value === "unset" || value === "enabled" || value === "disabled";
}

export function getPostRoundInsightsPreference(): PostRoundInsightsPreference {
  if (typeof window === "undefined") {
    return "unset";
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isPreference(stored)) {
      return stored;
    }
  } catch {
    return "unset";
  }

  return "unset";
}

export function setPostRoundInsightsPreference(
  value: Exclude<PostRoundInsightsPreference, "unset">
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore private-mode / quota errors.
  }
}

/** Default on — only an explicit disable opts out. */
export function isPostRoundInsightsEnabled(): boolean {
  return getPostRoundInsightsPreference() !== "disabled";
}

export function markPostRoundInsightsPending(roundId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(`${PENDING_PREFIX}${roundId}`, "1");
  } catch {
    // Ignore.
  }
}

export function hasPostRoundInsightsPending(roundId: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.sessionStorage.getItem(`${PENDING_PREFIX}${roundId}`) === "1";
  } catch {
    return false;
  }
}

export function clearPostRoundInsightsPending(roundId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(`${PENDING_PREFIX}${roundId}`);
  } catch {
    // Ignore.
  }
}
