import { describe, expect, it, vi } from "vitest";
import { errorReason, friendlyError } from "./friendly-error";

describe("errorReason", () => {
  it("recognises network failures (Chrome and Safari wording)", () => {
    expect(errorReason({ message: "TypeError: Failed to fetch", code: "" })).toMatch(/No connection/);
    expect(errorReason({ message: "TypeError: Load failed", code: "" })).toMatch(/No connection/);
    expect(errorReason({ message: "FetchError: The user aborted a request.", code: "" })).toMatch(/No connection/);
  });

  it("maps expired sessions, permissions and duplicates", () => {
    expect(errorReason({ message: "JWT expired", code: "PGRST301" })).toMatch(/session expired/);
    expect(errorReason({ message: "new row violates row-level security policy", code: "42501" })).toMatch(/permission/);
    expect(errorReason({ message: "duplicate key value", code: "23505" })).toMatch(/already exists/);
  });

  it("never shows raw database text", () => {
    expect(errorReason({ message: "Hole does not belong to this round's layout", code: "P0001" })).toBe("Please try again.");
    expect(errorReason(null)).toBe("Please try again.");
  });
});

describe("friendlyError", () => {
  it("joins the action and the reason", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(friendlyError("Could not start the round", { message: "Failed to fetch", code: "" })).toBe(
      "Could not start the round. No connection — check your signal and try again."
    );
  });
});
