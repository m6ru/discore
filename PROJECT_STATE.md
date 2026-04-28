# Discore — Project State

## Current Phase
- Phase 2 complete: Database & Auth Foundation.
- App/UI work is minimal and intentionally not feature-complete yet.

## Core Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres + RLS + Realtime)
- npm package manager

## Canonical Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Notes:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is deprecated in this repo and should not be used.

## Canonical Supabase Client Paths
- Browser/client helper: `lib/supabase/client.ts`
- Server helper (factory): `lib/supabase/server.ts`
- Middleware helper: `lib/supabase/middleware.ts`
- Root middleware entry: `middleware.ts`

Notes:
- `utils/supabase/*` has been removed; do not reintroduce duplicate helper trees.

## Supabase Project Link
- Project ref: `uxvrnvsgqyctpxjiziyp`
- Local CLI must be authenticated (`supabase login`) and linked (`supabase link --project-ref ...`) per machine.

## Migrations Applied
In `supabase/migrations/`:
1. `20260420185000_initial_schema.sql`
2. `20260420185100_rls_policies.sql`
3. `20260420185200_seed_courses.sql`
4. `20260420193000_true_history_hardening.sql`
5. `20260420195000_fix_round_participants_rls_recursion.sql`

## Database Status (Verified)
- Required tables exist:
  - `profiles`
  - `courses`
  - `layouts`
  - `holes`
  - `rounds`
  - `round_participants`
  - `hole_scores`
- RLS enabled on all required tables.
- Seed data present:
  - `courses = 1`
  - `layouts = 1`
  - `holes = 18`

## Important Constraints/Locks Implemented
- `hole_scores` update allowed only while parent round status is `active`.
- Round deletion allowed only when round has zero associated `hole_scores`.
- Unique constraints:
  - `layouts (course_id, slug)`
  - `round_participants (round_id, user_id)` (guest rows unaffected due to null semantics)
- Round status supports:
  - `active`
  - `completed`
  - `abandoned`
- Default round status: `active`.

## RLS Recursion Fix
- Added `SECURITY DEFINER` helper:
  - `public.is_round_member(round_id uuid, user_id uuid)`
- Rewrote policies to avoid recursive self-reference:
  - `rounds_select`
  - `round_participants_select`
  - `hole_scores_select`

## Type Generation
- Generated file: `lib/database.types.ts`
- Source of truth for typed DB interfaces.
- Regenerate after schema changes:
  - `npx supabase gen types typescript --linked > lib/database.types.ts`

## Current App Wiring Snapshot
- `app/page.tsx` currently performs a basic server query to `courses` (placeholder verification page).
- Session refresh middleware is in place.

## Product Decision (Confirmed Sidenote)
### Frictionless Onboarding — Option A
- Anonymous-first “Guest Round” flow:
  - Guest scoring remains local-only (no DB writes).
  - Post-round prompt: “Claim this round”.
  - On immediate signup, import guest round as first **completed** true-history round.
- Rationale:
  - Zero-friction onboarding
  - No ghost accounts / DB pollution
  - Preserves true-history integrity

## Cross-Machine Handoff Checklist
1. `git pull`
2. `npm ci`
3. Confirm `.env.local` has required vars
4. `npx supabase login` (if needed)
5. `npx supabase link --project-ref uxvrnvsgqyctpxjiziyp`
6. `npm run lint`
7. `npx supabase migration list`
8. Continue feature work

## Windows + macOS Guardrails
- Repository enforces line ending normalization via `.gitattributes` (`LF` for text by default).
- If Git asks to renormalize after pulling `.gitattributes`, run:
  - `git add --renormalize .`
- Keep type generation command consistent across machines:
  - `npx supabase gen types typescript --linked > lib/database.types.ts`
- If lint ever reports `lib/database.types.ts` as binary, regenerate the file with the command above and rerun `npm run lint`.

