export const HISTORY_VIEWED_STORAGE_KEY = "discore:onboarding-history-viewed";

export function markHistoryViewed(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(HISTORY_VIEWED_STORAGE_KEY, "1");
}

export function hasViewedHistory(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(HISTORY_VIEWED_STORAGE_KEY) === "1";
}
