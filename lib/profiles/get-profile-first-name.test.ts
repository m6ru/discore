import { describe, expect, it } from "vitest";
import { getProfileFirstName } from "./get-profile-first-name";

describe("getProfileFirstName", () => {
  it("prefers first_name", () => {
    expect(
      getProfileFirstName({ firstName: "Kristjan", displayName: "Other Name" })
    ).toBe("Kristjan");
  });

  it("falls back to first token of display_name", () => {
    expect(getProfileFirstName({ firstName: null, displayName: "Jane Doe" })).toBe("Jane");
  });

  it("falls back to there when empty", () => {
    expect(getProfileFirstName({ firstName: null, displayName: null })).toBe("there");
  });
});
