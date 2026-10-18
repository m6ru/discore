# Course seeds

Git is the single source of truth for course data. One JSON file per **layout** in `courses/`; copy `_template.json` when adding a new layout.

- Path: `supabase/seeds/courses/{course-slug}-{layout-slug}.json`
- Each layout file repeats its course block (`name`, `location`, `details`, coords, …). All files of a course must have an **identical** course block — validation fails otherwise.
- `source_url` is optional — omitted values are stored as `NULL`.
- Do not edit courses, layouts or holes in the Supabase dashboard: the next seed migration overwrites them.

## Workflow

1. Edit or add JSON under `courses/`.
2. Generate a migration with **only the files that changed** and apply it:

```bash
npx tsx scripts/seed-courses.ts --new-migration
npx supabase db push
```

3. Commit the new migration **together with** `supabase/seeds/applied.json`.

`applied.json` records a fingerprint of every layout file as of the last seed migration; that is how `--new-migration` knows what changed. CI runs `--check` and fails if a JSON file was edited without a migration.

Other commands:

```bash
npm run seed:courses                               # validate + write a full snapshot to seeds/generated/ (gitignored, for review)
npx tsx scripts/seed-courses.ts --validate-only    # validate only
npx tsx scripts/seed-courses.ts --check            # what CI runs
```

## What happens to existing data

| Change in JSON | Effect in the database |
|---|---|
| Edit course / layout / hole fields | Upserted (including `location` and `details`) |
| Remove a hole | Hole deleted — **migration fails** if it has scores |
| Delete a layout file or rename its slug | Layout deleted — **migration fails** if it has rounds. Set `"is_active": false` to retire a played layout instead |
| Change a hole's par | Only rounds scored afterwards use the new par. Each score stores the par it was played at (`hole_scores.par`) |

Course map images are not seed data: `public/courses/{slug}-map.png`, deployed with the app.

## Adding a layout with an agent

The owner provides, per layout: **course name**, **layout name** (as it should appear in the app), and the **holes** (hole number, par, distance in metres) from on-course signage or official club material. The agent:

- Copies `_template.json` to `{course-slug}-{layout-slug}.json`; slugs are the slugified names (`Männiku Wakepark` → `manniku-wakepark`).
- If the course already has layouts, copies the **existing course block exactly** (validation fails on any difference).
- Builds `holes[]`; sets `layout.total_par` / `total_distance_m` to the sums; `notes`, `hole_map_url`, `map_url` are `null` unless given; `is_active: true`.
- **Never invents hole data.** If published totals disagree with the owner's table, use the table and say so.
- Runs `npx tsx scripts/seed-courses.ts --new-migration`, commits the JSON + migration + `applied.json` in a PR; the owner runs `npx supabase db push`.

## Legacy notes

- Seed migrations before 2026-10 are full snapshots of every course; they are kept because migrations are history.
- `20260420185200_seed_courses.sql` inserted Järve as slug `jarve`; generated SQL renames it to `jarve-discgolfipark` before upserting (`LEGACY_COURSE_SLUG_ALIASES`).
