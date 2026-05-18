import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { CourseSeedFile } from "./seed-types";
import { validateCourseSeedFile } from "./validate-seed";

export const SEEDS_DIR = resolve(process.cwd(), "supabase/seeds/courses");

export function listSeedFilePaths(): string[] {
  return readdirSync(SEEDS_DIR)
    .filter((name) => name.endsWith(".json") && name !== "_template.json")
    .sort((a, b) => a.localeCompare(b))
    .map((name) => join(SEEDS_DIR, name));
}

export type LoadedSeedFile = {
  filePath: string;
  label: string;
  data: CourseSeedFile;
};

export function loadAndValidateSeedFiles(filePaths: string[]): LoadedSeedFile[] {
  const loaded: LoadedSeedFile[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const filePath of filePaths) {
    const label = basename(filePath);
    const raw: unknown = JSON.parse(readFileSync(filePath, "utf8"));
    const result = validateCourseSeedFile(raw, label);

    for (const warning of result.warnings) {
      warningCount += 1;
      console.warn(`[warn] ${label} ${warning.path}: ${warning.message}`);
    }

    if (result.errors.length > 0) {
      errorCount += result.errors.length;
      for (const issue of result.errors) {
        console.error(`[error] ${label} ${issue.path}: ${issue.message}`);
      }
      continue;
    }

    if (!result.data) {
      errorCount += 1;
      console.error(`[error] ${label}: validation produced no data`);
      continue;
    }

    console.log(
      `[ok] ${label} — ${result.data.holes.length} holes, par ${result.computedTotalPar}, ${result.computedTotalDistanceM}m`,
    );
    loaded.push({ filePath, label, data: result.data });
  }

  if (errorCount > 0) {
    throw new Error(`Validation failed with ${errorCount} error(s)`);
  }

  console.log(`Validated ${filePaths.length} file(s) (${warningCount} warning(s)).`);
  return loaded;
}
