import { describe, expect, it } from "vitest";
import { formatDistanceKm, haversineDistanceKm, mapsSearchUrl } from "./distance";
import {
  formatCourseListMeta,
  formatCourseLocationShort,
  formatLayoutCount,
} from "./format-course-display";
import { attachCoursesWithoutDistance, sortCoursesByProximity } from "./sort-courses";

describe("formatCourseLocationShort", () => {
  it("returns the first comma-separated segment", () => {
    expect(formatCourseLocationShort("Tallinn, Kesklinn, Harjumaa, Estonia")).toBe("Tallinn");
  });

  it("returns the full string when there is no comma", () => {
    expect(formatCourseLocationShort("Keila")).toBe("Keila");
  });
});

describe("formatCourseListMeta", () => {
  it("joins city, layout count, and detail fields", () => {
    expect(
      formatCourseListMeta({
        location: "Tallinn, Harjumaa, Estonia",
        layoutCount: 3,
        terrainType: "wooded",
        difficultyTier: "advanced",
      })
    ).toBe("Tallinn · 3 layouts · wooded · advanced");
  });

  it("omits null detail fields", () => {
    expect(
      formatCourseListMeta({
        location: "Keila",
        layoutCount: 1,
        terrainType: null,
        difficultyTier: null,
      })
    ).toBe("Keila · 1 layout");
  });
});

describe("formatLayoutCount", () => {
  it("uses singular for one layout", () => {
    expect(formatLayoutCount(1)).toBe("1 layout");
  });
});

describe("haversineDistanceKm", () => {
  it("returns zero for identical points", () => {
    expect(haversineDistanceKm({ lat: 59.437, lng: 24.7536 }, { lat: 59.437, lng: 24.7536 })).toBe(
      0
    );
  });
});

describe("formatDistanceKm", () => {
  it("shows one decimal below 10 km", () => {
    expect(formatDistanceKm(8.44)).toBe("8.4 km");
  });

  it("rounds to whole kilometres at 10 km and above", () => {
    expect(formatDistanceKm(12.4)).toBe("12 km");
  });
});

describe("mapsSearchUrl", () => {
  it("builds a Google Maps search URL", () => {
    expect(mapsSearchUrl(59.437, 24.7536)).toBe(
      "https://www.google.com/maps/search/?api=1&query=59.437,24.7536"
    );
  });
});

describe("sortCoursesByProximity", () => {
  const courses = [
    { name: "Far", slug: "far", lat: 59.5, lng: 25.0 },
    { name: "Near", slug: "near", lat: 59.44, lng: 24.75 },
    { name: "Unknown", slug: "unknown", lat: null, lng: null },
  ] as const;

  it("sorts located courses by distance and leaves unknown courses at the end", () => {
    const sorted = sortCoursesByProximity(courses, { lat: 59.437, lng: 24.7536 });
    expect(sorted.map((course) => course.slug)).toEqual(["near", "far", "unknown"]);
    expect(sorted[0]?.distanceKm).not.toBeNull();
    expect(sorted[2]?.distanceKm).toBeNull();
  });
});

describe("attachCoursesWithoutDistance", () => {
  it("sorts alphabetically without distances", () => {
    const sorted = attachCoursesWithoutDistance([
      { name: "Zeta", lat: null, lng: null },
      { name: "Alpha", lat: null, lng: null },
    ]);
    expect(sorted.map((course) => course.name)).toEqual(["Alpha", "Zeta"]);
    expect(sorted.every((course) => course.distanceKm === null)).toBe(true);
  });
});
