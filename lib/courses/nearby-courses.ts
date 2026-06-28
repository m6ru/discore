export type NearbyCoursesPreference = "unset" | "enabled" | "disabled";

const STORAGE_KEY = "discore-nearby-courses-preference";

function isPreference(value: string): value is NearbyCoursesPreference {
  return value === "unset" || value === "enabled" || value === "disabled";
}

export function getNearbyCoursesPreference(): NearbyCoursesPreference {
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

export function setNearbyCoursesPreference(value: NearbyCoursesPreference): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore private-mode / quota errors.
  }
}
