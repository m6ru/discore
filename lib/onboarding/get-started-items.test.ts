import { describe, expect, it } from "vitest";
import { getRemainingGetStartedItems } from "./get-started-items";

describe("getRemainingGetStartedItems", () => {
  it("returns all items for a brand-new user", () => {
    expect(
      getRemainingGetStartedItems({
        historyViewed: false,
        profileOnboardingComplete: false,
      }).map((item) => item.id)
    ).toEqual(["view-history", "complete-profile"]);
  });

  it("drops completed items", () => {
    expect(
      getRemainingGetStartedItems({
        historyViewed: true,
        profileOnboardingComplete: false,
      }).map((item) => item.id)
    ).toEqual(["complete-profile"]);
  });
});
