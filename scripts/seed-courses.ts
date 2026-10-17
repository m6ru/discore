import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateCourseSeedSql } from "../lib/courses/generate-sql";
import { listSeedFilePaths, loadAndValidateSeedFiles } from "../lib/courses/list-seed-files";
import { buildSeedManifest, diffSeedManifest, type SeedManifest } from "../lib/courses/seed-manifest";

const GENERATED_SQL = resolve(process.cwd(), "supabase/seeds/generated/course_seeds.sql");
const MANIFEST = resolve(process.cwd(), "supabase/seeds/applied.json");

function migrationFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join("");
  return `supabase/migrations/${stamp}_seed_courses_from_json.sql`;
}

function readManifest(): SeedManifest {
  return existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, "utf8")) as SeedManifest) : {};
}

function writeManifest(manifest: SeedManifest): void {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function main(): void {
  const writeNewMigration = process.argv.includes("--new-migration");
  const validateOnly = process.argv.includes("--validate-only");
  const check = process.argv.includes("--check");

  const filePaths = listSeedFilePaths();
  if (filePaths.length === 0) {
    throw new Error("No seed JSON files found in supabase/seeds/courses/");
  }

  console.log(`Validating ${filePaths.length} layout seed file(s)...`);
  const loaded = loadAndValidateSeedFiles(filePaths);

  if (validateOnly) {
    return;
  }

  const { changed, removed } = diffSeedManifest(loaded, readManifest());
  const pending = [...changed.map(({ label }) => label), ...removed.map(({ label }) => `${label} (removed)`)];

  if (check) {
    if (pending.length > 0) {
      console.error(`Course JSON changed without a seed migration:\n  ${pending.join("\n  ")}`);
      console.error("Run: npx tsx scripts/seed-courses.ts --new-migration");
      process.exit(1);
    }
    console.log("Seed migrations are up to date with the JSON.");
    return;
  }

  if (writeNewMigration) {
    if (pending.length === 0) {
      console.log("No course changes since the last seed migration; nothing to write.");
      return;
    }
    const migrationPath = resolve(process.cwd(), migrationFilename());
    writeFileSync(migrationPath, generateCourseSeedSql(changed, removed), "utf8");
    writeManifest(buildSeedManifest(loaded));
    console.log(`Wrote new migration ${migrationPath} (${pending.length} file(s)):\n  ${pending.join("\n  ")}`);
    console.log("Commit it together with supabase/seeds/applied.json, then: npx supabase db push");
    return;
  }

  // Full snapshot for local review only (gitignored).
  mkdirSync(resolve(process.cwd(), "supabase/seeds/generated"), { recursive: true });
  writeFileSync(GENERATED_SQL, generateCourseSeedSql(loaded), "utf8");
  console.log(`Wrote ${GENERATED_SQL}`);
  console.log(
    pending.length > 0
      ? `${pending.length} file(s) changed since the last seed migration. Create one with:\n  npx tsx scripts/seed-courses.ts --new-migration`
      : "No course changes since the last seed migration.",
  );
}

main();
