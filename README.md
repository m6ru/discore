# Discore

Browser-based PWA for disc golf score tracking. Mobile-first, online-first.
One signed-in Scorer per round writes; invited Observers watch live via
Supabase Realtime.

## Read first

- [`BLUEPRINT.md`](BLUEPRINT.md) — architecture and non-negotiable rules
- [`STATUS.md`](STATUS.md) — what is built, field MVP checklist, what is next
- [`AGENTS.md`](AGENTS.md) — note for AI coding agents

## Stack

Next.js (App Router), TypeScript, Tailwind, Supabase (Auth + Postgres + RLS + Realtime).

## Local development

```bash
npm ci
cp .env.example .env.local   # fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev                  # http://localhost:3000
```

Other scripts:

| Script              | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `npm run lint`      | ESLint (Next config)                            |
| `npm test`          | Vitest run over `lib/**/*.test.ts`              |
| `npm run test:watch`| Vitest in watch mode                            |
| `npm run seed:courses` | Validate course JSON seeds in `supabase/seeds/courses/` |

Course data is creator-maintained — see `supabase/seeds/README.md`.

## Key paths

| Area              | Paths                                                              |
| ----------------- | ------------------------------------------------------------------ |
| Pages             | `app/page.tsx`, `app/auth/`, `app/rounds/`                         |
| Round UI          | `app/rounds/[roundId]/round-session.tsx` (+ `hooks/`, `components/`) |
| Scoring math      | `lib/scoring/` (pure TS, no React/Next/Supabase, no `any`)         |
| Round actions     | `lib/rounds/`                                                      |
| Profiles          | `lib/profiles/`                                                    |
| Supabase clients  | `lib/supabase/{client,server,middleware,select-helpers}.ts`        |
| Migrations        | `supabase/migrations/`                                             |
