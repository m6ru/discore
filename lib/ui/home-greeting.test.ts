import { describe, expect, it } from "vitest";
import { getHomePersonalSubtitle } from "./home-greeting";

describe("getHomePersonalSubtitle", () => {
  it("includes the first name", () => {
    expect(getHomePersonalSubtitle("Kristjan")).toBe(
      "Hei Kristjan, lets throw some discs!"
    );
  });
});
