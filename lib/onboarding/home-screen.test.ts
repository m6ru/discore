import { describe, expect, it } from "vitest";
import { homeScreenPlatform } from "./home-screen";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const ANDROID_FIREFOX = "Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

describe("homeScreenPlatform", () => {
  it("knows iPhones, and iPads that pose as a Mac", () => {
    expect(homeScreenPlatform(IPHONE, 5)).toBe("ios");
    expect(homeScreenPlatform(IPAD, 5)).toBe("ios");
  });

  it("tells Firefox apart from other Android browsers", () => {
    expect(homeScreenPlatform(ANDROID_CHROME, 5)).toBe("android");
    expect(homeScreenPlatform(ANDROID_FIREFOX, 5)).toBe("android-firefox");
  });

  it("treats a Mac without touch and Windows as a computer", () => {
    expect(homeScreenPlatform(IPAD, 0)).toBe("desktop");
    expect(homeScreenPlatform(WINDOWS, 0)).toBe("desktop");
  });
});
