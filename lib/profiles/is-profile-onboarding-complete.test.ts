import { describe, expect, it } from "vitest";
import { isProfileOnboardingComplete } from "./is-profile-onboarding-complete";

describe("isProfileOnboardingComplete", () => {
  it("is incomplete with empty optional fields", () => {
    expect(isProfileOnboardingComplete({ avatar_url: null, city: null })).toBe(false);
    expect(isProfileOnboardingComplete({ avatar_url: "", city: "  " })).toBe(false);
  });

  it("completes when avatar is set", () => {
    expect(
      isProfileOnboardingComplete({
        avatar_url: "https://example.com/a.jpg",
        city: null,
      })
    ).toBe(true);
  });

  it("completes when city is set", () => {
    expect(
      isProfileOnboardingComplete({
        avatar_url: null,
        city: "Tallinn",
      })
    ).toBe(true);
  });
});
