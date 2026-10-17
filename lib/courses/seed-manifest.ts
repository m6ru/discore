import { createHash } from "node:crypto";
import type { RemovedLayout } from "./generate-sql";
import type { LoadedSeedFile } from "./list-seed-files";
import type { CourseSeedFile } from "./seed-types";

/**
 * What the last seed migration shipped, per JSON file. Committed as
 * `supabase/seeds/applied.json` so `--new-migration` only emits files that
 * changed since, instead of re-sending the whole catalog.
 */
export type SeedManifest = Record<string, { hash: string; course: string; layout: string }>;

export function seedFileHash(data: CourseSeedFile): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 16);
}

export function buildSeedManifest(loaded: LoadedSeedFile[]): SeedManifest {
  const manifest: SeedManifest = {};
  for (const { label, data } of loaded) {
    manifest[label] = { hash: seedFileHash(data), course: data.course.slug, layout: data.layout.slug };
  }
  return manifest;
}

export type SeedDiff = { changed: LoadedSeedFile[]; removed: RemovedLayout[] };

export function diffSeedManifest(loaded: LoadedSeedFile[], applied: SeedManifest): SeedDiff {
  const current = buildSeedManifest(loaded);
  const changed = loaded.filter(({ label }) => current[label].hash !== applied[label]?.hash);

  const currentLayouts = new Set(
    Object.values(current).map(({ course, layout }) => `${course}/${layout}`),
  );
  const removed = Object.entries(applied)
    .filter(([, { course, layout }]) => !currentLayouts.has(`${course}/${layout}`))
    .map(([label, { course, layout }]) => ({ label, courseSlug: course, layoutSlug: layout }));

  return { changed, removed };
}
