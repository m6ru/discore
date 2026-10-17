import { describe, expect, it } from "vitest";
import { generateCourseSeedSql } from "./generate-sql";
import { findCourseBlockConflicts, type LoadedSeedFile } from "./list-seed-files";
import { buildSeedManifest, diffSeedManifest } from "./seed-manifest";
import type { CourseSeedFile } from "./seed-types";

function seedFile(label: string, overrides: { course?: Partial<CourseSeedFile["course"]>; layoutSlug?: string; par?: number } = {}): LoadedSeedFile {
  const data: CourseSeedFile = {
    course: {
      name: "Test Park",
      location: "Testville",
      slug: "test-park",
      lat: null,
      lng: null,
      details: null,
      terrain_type: null,
      difficulty_tier: null,
      ...overrides.course,
    },
    layout: {
      name: "Main",
      slug: overrides.layoutSlug ?? "main",
      total_par: overrides.par ?? 3,
      total_distance_m: 100,
      map_url: null,
      is_active: true,
    },
    holes: [{ hole_number: 1, par: overrides.par ?? 3, distance_m: 100, notes: null, hole_map_url: null }],
  };
  return { filePath: label, label, data };
}

describe("diffSeedManifest", () => {
  it("reports nothing when the JSON matches the last migration", () => {
    const files = [seedFile("a.json"), seedFile("b.json", { layoutSlug: "short" })];
    expect(diffSeedManifest(files, buildSeedManifest(files))).toEqual({ changed: [], removed: [] });
  });

  it("emits only the files that changed", () => {
    const before = [seedFile("a.json"), seedFile("b.json", { layoutSlug: "short" })];
    const after = [seedFile("a.json", { par: 4 }), before[1]];
    const { changed, removed } = diffSeedManifest(after, buildSeedManifest(before));
    expect(changed.map(({ label }) => label)).toEqual(["a.json"]);
    expect(removed).toEqual([]);
  });

  it("treats a new file as changed", () => {
    const before = [seedFile("a.json")];
    const after = [...before, seedFile("b.json", { layoutSlug: "short" })];
    expect(diffSeedManifest(after, buildSeedManifest(before)).changed.map(({ label }) => label)).toEqual(["b.json"]);
  });

  it("reports deleted files and renamed layout slugs as removed layouts", () => {
    const before = [seedFile("a.json"), seedFile("b.json", { layoutSlug: "short" })];
    const after = [seedFile("a.json", { layoutSlug: "main-2026" })];
    expect(diffSeedManifest(after, buildSeedManifest(before)).removed).toEqual([
      { label: "a.json", courseSlug: "test-park", layoutSlug: "main" },
      { label: "b.json", courseSlug: "test-park", layoutSlug: "short" },
    ]);
  });
});

describe("findCourseBlockConflicts", () => {
  it("accepts identical course blocks across layouts", () => {
    expect(findCourseBlockConflicts([seedFile("a.json"), seedFile("b.json", { layoutSlug: "short" })])).toEqual([]);
  });

  it("names the files and fields that disagree", () => {
    const issues = findCourseBlockConflicts([
      seedFile("a.json"),
      seedFile("b.json", { layoutSlug: "short", course: { details: "Fee 5 EUR", lat: 58.1 } }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("b.json");
    expect(issues[0]).toContain("a.json");
    expect(issues[0]).toContain("lat, details");
  });
});

describe("generateCourseSeedSql", () => {
  it("writes About text from the JSON and deletes holes no longer listed", () => {
    const sql = generateCourseSeedSql([seedFile("a.json", { course: { details: "Fee 5 EUR" } })]);
    expect(sql).toContain("details = excluded.details");
    expect(sql).toContain("and h.hole_number not in (1);");
  });

  it("deletes removed layouts", () => {
    const sql = generateCourseSeedSql([], [{ label: "b.json", courseSlug: "test-park", layoutSlug: "short" }]);
    expect(sql).toContain("delete from public.layouts l");
    expect(sql).toContain("l.slug = 'short'");
  });
});
