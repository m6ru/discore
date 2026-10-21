@AGENTS.md

# Discore — agent guide

Disc golf scoring PWA for Estonia (Next.js 16 + Supabase). One-person project, worked on from two machines (Windows PC and MacBook). **Git is the only shared memory between sessions and machines** — local agent memory does not sync, so anything a future session needs goes into this repo.

## Session protocol

**Start of a session**
1. `git pull` on `main` (or the branch in progress), then read **`STATUS.md` → Handoff**: state, next step, what is in flight.
2. Read `BLUEPRINT.md` before architectural decisions or new dependencies; `DESIGN-PATTERNS.md` before UI work.
3. Check the machine is ready if you'll run things: `README.md` → *Setting up a machine*.

**End of a session (or when a PR is merged)**
- **Overwrite** `STATUS.md` → Handoff (a few lines: date, state, next, in flight). Never append a log — history is `git log` and the PRs, and a growing file goes stale and costs context. Do it in the same PR as the work, so `main` always describes itself.
- Record new decisions or gotchas in the right doc (rules → BLUEPRINT, workflow → this file, state → STATUS).

## Working with the owner

- The owner is learning the stack as they go and wants to understand it, not just ship it. **Explain concepts before building** (new so far: CI, RLS, Docker, transactions, E2E) and give a recommendation, not a menu.
- Every change goes through a branch + PR. The owner tests the Vercel preview, then Claude squash-merges (`gh pr merge N --squash --delete-branch`). Never push to `main` (branch protection requires `check`, `database`, `e2e`).
- **Production database:** the owner runs `npx supabase db push` themselves in their own terminal. Agents only read production with the owner's help (e.g. a dump the owner runs). When a PR has a migration the app code depends on, push the migration **before** testing the preview (previews use the production database).
- Before a migration that adds constraints, have the owner run read-only queries on production for rows that would violate it.

## Parallel work

When several things are queued, **tell the owner which can run in a parallel session and which belong in this one**, with a ready-to-paste prompt for each parallel task.

- **Good to parallelize:** research and docs, isolated changes in different files, anything that needs neither local Supabase nor the dev server.
- **Keep in one session:** work that needs the owner's design input, changes to the same files or the same migration area, anything that runs DB or E2E tests (one local Supabase, E2E on port 3100).
- Each parallel session gets its own worktree: `git worktree add ../discore-<topic> -b <branch>` (then `npm ci`, copy `.env.local` if it runs the app; `git worktree remove ../discore-<topic>` when done).
- **Only the main session edits `STATUS.md` → Handoff.** Parallel PRs say in their description what the Handoff should note.

## Commands

| What | Command |
|---|---|
| Dev server | `npm run dev` (uses `.env.local` → production Supabase) |
| Type check | `npx tsc --noEmit --incremental false` |
| Lint / unit tests | `npm run lint` · `npm test` |
| Local Supabase (Docker) | `npx supabase start -x studio,edge-runtime,vector,logflare,imgproxy` · `npx supabase stop` |
| Reset local DB (replays all migrations) | `npx supabase db reset` |
| DB tests (pgTAP) | `npx supabase test db` |
| E2E (Playwright) | `npm run test:e2e` — needs local Supabase running |
| Course seeds | `npx tsx scripts/seed-courses.ts --new-migration` (see `supabase/seeds/README.md`) |

## Rules

- **Keep it simple** (BLUEPRINT §2a): prefer one screen file over many `lib/` helpers.
- `.ts` / `.tsx` only in `app/`, `lib/`, `components/`. No `any` in `lib/scoring`.
- Supabase dual client: never mix browser and server clients.
- **Security lives in the database.** All writes go browser → PostgREST, so RLS policies and triggers are the only authorization. Any RLS / trigger / function change ships with pgTAP tests in `supabase/tests/`.
- Multi-step writes that must succeed together go in a Postgres function (`claim_trial`, `accept_invite` are the pattern: `SECURITY INVOKER`, so RLS still applies).
- **Course data:** git (`supabase/seeds/courses/*.json`) is the single source of truth. Never edit courses/layouts/holes in the Supabase dashboard. CI fails if JSON changes without a seed migration.
- Scores store the par they were played at (`hole_scores.par`); stats must use it, not `holes.par`.
- Migrations are history: never edit one that has run; add a new one.
- E2E only ever runs against **local** Supabase (`playwright.config.ts` enforces it).
- No Phase 6 features (ratings, tournaments) until adoption warrants it.
- The repo is **public**: no secrets, no personal data, no real people's names, and no competitor or other scoring-platform names in files, commits or PRs.

## Gotchas

- `next dev` re-adds a generated block to `AGENTS.md` — commit it, don't fight it.
- `next dev` opened as `127.0.0.1` blocks hydration (`allowedDevOrigins`); use `localhost`.
- Windows: Git Bash rewrites `/paths` passed to node scripts — prefix with `MSYS_NO_PATHCONV=1`.
- `INSERT … ON CONFLICT` under RLS also needs SELECT rights on conflicting rows; inside RLS-bound functions check existence first instead.
- `.insert().select()` (RETURNING) also checks the SELECT policy against the new row; `SECURITY DEFINER` helpers can't see a row inserted in the same statement.
- `npx supabase start` on a flaky network: `docker pull` the images first (resumable), then start.
- `lib/database.types.ts` is maintained by hand in the current format; `supabase gen types` output differs in formatting — add new tables/functions in the existing style.
