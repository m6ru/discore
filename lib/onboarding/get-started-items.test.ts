import { describe, expect, it } from "vitest";
import { getRemainingGetStartedItems } from "./get-started-items";

describe("getRemainingGetStartedItems", () => {
  it("returns all items for a brand-new player on a phone", () => {
    expect(
      getRemainingGetStartedItems({
        canAddToHomeScreen: true,
        profileOnboardingComplete: false,
      }).map((item) => item.id)
    ).toEqual(["add-to-home-screen", "complete-profile"]);
  });

  it("drops the home-screen row once discbook opens from the home screen, or on a computer", () => {
    expect(
      getRemainingGetStartedItems({
        canAddToHomeScreen: false,
        profileOnboardingComplete: false,
      }).map((item) => item.id)
    ).toEqual(["complete-profile"]);
  });
});
