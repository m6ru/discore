# Discore

Browser-based PWA for disc golf score tracking. Mobile-first; scores save instantly and sync in the background.
One signed-in Scorer per round writes; invited Observers watch live via
Supabase Realtime.

## Read first

- [`STATUS.md`](STATUS.md) — current state, handoff, roadmap
- [`BLUEPRINT.md`](BLUEPRINT.md) — architecture and non-negotiable rules
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how it fits together: system diagram, life of a round, decision records
- [`CLAUDE.md`](CLAUDE.md) — workflow and rules for AI coding agents (with [`AGENTS.md`](AGENTS.md))

## Stack

Next.js (App Router), TypeScript, Tailwind, Supabase (Auth + Postgres + RLS + Realtime).
Tests: Vitest (unit), pgTAP (database), Playwright (E2E). CI: GitHub Actions. Hosting: Vercel.

## Setting up a machine

Needed once per machine (Windows PC or MacBook).

| Tool | Windows | macOS |
|---|---|---|
| Node.js 24 | `winget install OpenJS.NodeJS.LTS` | `brew install node@24 && brew link --force node@24` |
| GitHub CLI | `winget install GitHub.cli` | `brew install gh` |
| Docker Desktop (local Supabase, DB + E2E tests) | `wsl --install` (admin), then `winget install Docker.DockerDesktop` | `brew install --cask docker-desktop` |

Then, in the repo:

```bash
gh auth login                      # once
npm ci
cp .env.example .env.local         # fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                                   # (Supabase dashboard → Project Settings → API, or Vercel env vars)
npx supabase login                 # once; then link the production project:
npx supabase link --project-ref gslzfwbrdbvmnjaxxnms
npx playwright install chromium    # once, for E2E
npm run dev                        # http://localhost:3000 (against production data — careful)
```

`.env.local` is not in git; recreate it on each machine. Line endings are normalized to LF by `.gitattributes`, so both platforms produce identical diffs.

**Switching machines:** commit and push (or open a PR) before you leave one; on the other, `git pull` and read `STATUS.md` → Handoff.

Other scripts:

| Script              | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `npm run lint`      | ESLint (Next config)                            |
| `npm test`          | Vitest run over `lib/**/*.test.ts`              |
| `npx supabase test db` | pgTAP RLS / integrity tests in `supabase/tests/` (needs Docker + `npx supabase start`) |
| `npm run test:watch`| Vitest in watch mode                            |
| `npm run test:e2e`  | Playwright E2E in `e2e/` against local Supabase (needs `npx supabase start`; first time: `npx playwright install chromium`) |
| `npm run seed:courses` | Validate course JSON seeds in `supabase/seeds/courses/` |

Course data is creator-maintained and lives in git — see `supabase/seeds/README.md`.

## Key paths

| Area              | Paths                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Pages             | `app/page.tsx`, `app/auth/`, `app/rounds/`                         |
| Round UI          | `app/rounds/[roundId]/round-session.tsx` (+ `hooks/`, `components/`) |
| Scoring math      | `lib/scoring/` (pure TS, no React/Next/Supabase, no `any`)         |
| Round actions     | `lib/rounds/`                                                      |
| Profiles          | `lib/profiles/`                                                    |
| Supabase clients  | `lib/supabase/{client,server,proxy,select-helpers}.ts`        |
| Migrations        | `supabase/migrations/`                                             |
