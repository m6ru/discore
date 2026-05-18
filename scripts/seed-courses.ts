import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateCourseSeedSql } from "../lib/courses/generate-sql";
import { listSeedFilePaths, loadAndValidateSeedFiles } from "../lib/courses/list-seed-files";

const GENERATED_SQL = resolve(process.cwd(), "supabase/seeds/generated/course_seeds.sql");

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

function main(): void {
  const writeNewMigration = process.argv.includes("--new-migration");
  const validateOnly = process.argv.includes("--validate-only");

  const filePaths = listSeedFilePaths();
  if (filePaths.length === 0) {
    throw new Error("No seed JSON files found in supabase/seeds/courses/");
  }

  console.log(`Validating ${filePaths.length} layout seed file(s)...`);
  const loaded = loadAndValidateSeedFiles(filePaths);

  if (validateOnly) {
    return;
  }

  const sql = generateCourseSeedSql(loaded);

  mkdirSync(resolve(process.cwd(), "supabase/seeds/generated"), { recursive: true });
  writeFileSync(GENERATED_SQL, sql, "utf8");
  console.log(`Wrote ${GENERATED_SQL}`);

  if (writeNewMigration) {
    const migrationPath = resolve(process.cwd(), migrationFilename());
    writeFileSync(migrationPath, sql, "utf8");
    console.log(`Wrote new migration ${migrationPath}`);
    console.log("Apply with: npx supabase db push");
    return;
  }

  console.log("Review generated SQL, then create a migration when ready:");
  console.log("  npx tsx scripts/seed-courses.ts --new-migration");
}

main();
