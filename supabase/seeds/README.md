# Course seeds

One JSON file per **layout** in `courses/`. Copy `_template.json` when adding a new layout.

- Path: `supabase/seeds/courses/{course-slug}-{layout-slug}.json`
- Hole data is hand-curated; course name/location often come from a Metrix course URL (see `courseurls.md` at repo root).
- `source_url` is optional in JSON — omitted values are stored as `NULL`.
- Skip `_template.json` when generating SQL.

## Legacy migration note

`20260420185200_seed_courses.sql` inserted Järve as course slug `jarve` with layout `pro-18`. The JSON library uses canonical slug `jarve-discgolfipark` and separate layout slugs (e.g. `pro-18-2026`). Generated SQL renames `jarve` → `jarve-discgolfipark` before upserting so the old row is not duplicated. That migration is kept for history; new data is JSON → SQL only.

## Workflow (no service role key)

Course writes go through **Supabase migrations**, using the CLI’s linked-project credentials (same as schema changes). No `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

1. Edit or add JSON under `courses/`.
2. From repo root:

```bash
npm run seed:courses
```

This validates all JSON and writes `supabase/seeds/generated/course_seeds.sql` (gitignored; for local review).

3. When JSON changes need to reach the database, create a **new** migration and apply:

```bash
npx tsx scripts/seed-courses.ts --new-migration
npx supabase db push
```

SQL uses idempotent `ON CONFLICT` upserts on `courses.slug`, `layouts (course_id, slug)`, and `holes (layout_id, hole_number)`. Re-applying the same migration is safe.

## What to edit where

| Data | Edit in | Goes live via |
|------|---------|---------------|
| Holes, layouts, par, distances, hole notes, course name | JSON in `courses/` | `seed:courses --new-migration` → `db push` |
| About copy (fees, phone, operator) — `location`, `details` | **Supabase Table Editor** → `courses` row | Save in dashboard (instant) |
| Course map image | `public/courses/{slug}-map.png` | Git push + deploy |

**Course upsert behaviour:** seed migrations update structural fields (`name`, coords, terrain) and always refresh layouts/holes. They set `location` and `details` only on **first insert** of a new course slug — later hole/layout migrations do **not** overwrite About text already in the database.

To change About after a course exists, use the Supabase dashboard (or a one-off `UPDATE courses SET details = …` migration). JSON `details` / `location` values are bootstrap defaults for new courses.

### Updating course data after a migration is already applied

Generate a new timestamped migration (do not edit migrations that have already run):

```bash
npx tsx scripts/seed-courses.ts --new-migration
npx supabase db push
```

Validate JSON only (no files written):

```bash
npx tsx scripts/seed-courses.ts --validate-only
```

## Verify

Sign in to the app and open `/courses`. Each seeded course should appear with its active layouts; pick a layout and start a draft round.
