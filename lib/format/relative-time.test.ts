import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

describe("formatRelativeTime", () => {
  it("returns 'just now' under 10 seconds", () => {
    expect(formatRelativeTime(0)).toBe("just now");
    expect(formatRelativeTime(9_999)).toBe("just now");
  });

  it("returns seconds between 10s and 60s", () => {
    expect(formatRelativeTime(10_000)).toBe("10s ago");
    expect(formatRelativeTime(59_999)).toBe("59s ago");
  });

  it("returns minutes between 1 and 60 minutes", () => {
    expect(formatRelativeTime(60_000)).toBe("1m ago");
    expect(formatRelativeTime(60 * 60_000 - 1)).toBe("59m ago");
  });

  it("returns hours from 1 hour up", () => {
    expect(formatRelativeTime(60 * 60_000)).toBe("1h ago");
    expect(formatRelativeTime(5 * 60 * 60_000)).toBe("5h ago");
  });

  it("clamps negative inputs to zero", () => {
    expect(formatRelativeTime(-1000)).toBe("just now");
  });
});
