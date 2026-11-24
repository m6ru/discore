/**
 * Which "add to home screen" steps to show. Android Chromium browsers can also
 * open their own install dialog (beforeinstallprompt); iPhone browsers can't,
 * so the player gets the steps instead.
 */
export type HomeScreenPlatform = "ios" | "android" | "android-firefox" | "desktop";

export function homeScreenPlatform(userAgent: string, maxTouchPoints: number): HomeScreenPlatform {
  // iPadOS reports a Mac user agent; touch points give it away.
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/.test(userAgent)) {
    return /Firefox/.test(userAgent) ? "android-firefox" : "android";
  }
  return "desktop";
}

/** True when discore was opened from the home-screen icon. */
export function isOpenedFromHomeScreen(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
}
