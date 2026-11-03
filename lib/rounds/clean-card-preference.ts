/**
 * "Clean card by default" (BLUEPRINT §8a): new rounds start with running
 * totals and the player's hole history hidden. Stored per device, like the
 * other Profile switches; the round sheet can still flip it for one round.
 */
const STORAGE_KEY = "discore-clean-card-default";

export function isCleanCardDefault(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function setCleanCardDefault(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  } catch {
    // Ignore private-mode / quota errors.
  }
}
