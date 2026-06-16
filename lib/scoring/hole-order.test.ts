import { describe, expect, it } from "vitest";
import { orderHolesForPlay, sortHolesByNumber } from "./hole-order";
import type { Hole } from "./types";

const HOLES: Hole[] = [
  { id: "h1", hole_number: 1, par: 3 },
  { id: "h2", hole_number: 2, par: 4 },
  { id: "h3", hole_number: 3, par: 5 },
  { id: "h10", hole_number: 10, par: 3 },
  { id: "h18", hole_number: 18, par: 4 },
];

describe("sortHolesByNumber", () => {
  it("orders by hole_number", () => {
    expect(sortHolesByNumber(HOLES).map((h) => h.hole_number)).toEqual([
      1, 2, 3, 10, 18,
    ]);
  });
});

describe("orderHolesForPlay", () => {
  it("returns numeric order when starting hole is 1", () => {
    expect(orderHolesForPlay(HOLES, 1).map((h) => h.hole_number)).toEqual([
      1, 2, 3, 10, 18,
    ]);
  });

  it("rotates so the chosen hole tees off first", () => {
    expect(orderHolesForPlay(HOLES, 10).map((h) => h.hole_number)).toEqual([
      10, 18, 1, 2, 3,
    ]);
  });

  it("falls back to numeric order for unknown starting hole", () => {
    expect(orderHolesForPlay(HOLES, 99).map((h) => h.hole_number)).toEqual([
      1, 2, 3, 10, 18,
    ]);
  });
});
