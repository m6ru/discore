import { describe, expect, it } from "vitest";
import { filterCoursesByQuery } from "./filter-courses";

const sample = [
  { name: "Järve Discgolfipark", location: "Kohtla-Järve", slug: "a" },
  { name: "Keila Discgolfpark", location: "Keila", slug: "b" },
  { name: "Muraste", location: "Muraste", slug: "c" },
] as const;

describe("filterCoursesByQuery", () => {
  it("returns all courses when query is empty", () => {
    expect(filterCoursesByQuery(sample, "")).toHaveLength(3);
    expect(filterCoursesByQuery(sample, "   ")).toHaveLength(3);
  });

  it("matches name case-insensitively", () => {
    expect(filterCoursesByQuery(sample, "järve")).toEqual([sample[0]]);
  });

  it("matches location", () => {
    expect(filterCoursesByQuery(sample, "keila")).toEqual([sample[1]]);
  });

  it("respects limit", () => {
    expect(filterCoursesByQuery(sample, "e", { limit: 1 })).toHaveLength(1);
  });
});
