# Discore — Project State

> Companion docs: `BLUEPRINT.md` (fixed rules) and `ROADMAP.md` (slice plan and
> what's next). When starting a new chat, read all three in that order.

## Current Phase
- Phase 2 complete: Database & Auth Foundation.
- Phase 3 in progress: Draft-first lifecycle, invite flow, active-round scorer workflow, observer read-only round visibility, **online-first** hole-score writes (Blueprint §3a: awaited batched upserts, drafts retained in React on failure), round history, resume-active-round on the home hub, enriched invite cards, the `round_participants` scorer-self-heal, boolean OB capture (putts dropped for MVP), a ranked leaderboard pane, a Realtime-fed "last saved" indicator, and in-place Realtime payload merges. Remaining for Phase 3 is `fairway_hit` capture (intentionally deferred) and Phase 4 PWA polish.

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
6. `20260428192554_enforce_single_active_round_per_scorer.sql`
7. `20260429102000_round_invitations.sql`
8. `20260429103500_fix_round_invitation_policy_recursion.sql`
9. `20260429105500_round_participants_draft_only.sql`
10. `20260429113000_round_participants_delete_draft.sql`
11. `20260507093000_remove_round_join_code.sql`
12. `20260511125000_profile_account_fields_and_avatar_storage.sql`
13. `20260515160047_hole_scores_ob_boolean.sql`
14. `20260518143000_seed_courses_from_json.sql` (generated from `supabase/seeds/courses/*.json`)
15. `20260518150000_drop_legacy_jarve_pro_18.sql`

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
- Seed data: JSON library under `supabase/seeds/courses/` (6 layouts); `npm run
  seed:courses` generates SQL migration, apply with `npx supabase db push` (see
  `supabase/seeds/README.md`). Legacy `pro-18` layout removed in
  `20260518150000_drop_legacy_jarve_pro_18.sql`.

## Important Constraints/Locks Implemented
- `hole_scores` update allowed only while parent round status is `active`.
- Round deletion allowed only when round has zero associated `hole_scores`.
- Unique constraints:
  - `layouts (course_id, slug)`
  - `round_participants (round_id, user_id)` (guest rows unaffected due to null semantics)
- Round status supports:
  - `draft`
  - `active`
  - `completed`
  - `abandoned`
- Default round status: `draft`.
- Single active round per scorer is enforced via partial unique index:
  - `rounds_one_active_per_scorer_idx` on `rounds (scorer_id)` where `status = 'active'`

## RLS Recursion Fix
- Added `SECURITY DEFINER` helper:
  - `public.is_round_member(round_id uuid, user_id uuid)`
- Added `SECURITY DEFINER` helper:
  - `public.can_manage_round_invitation(invitation_round_id uuid, invitation_user_id uuid)`
- Rewrote policies to avoid recursive self-reference:
  - `rounds_select`
  - `round_participants_select`
  - `hole_scores_select`
  - `round_invitations_select`
  - `round_invitations_insert`
  - `round_invitations_update`

## Type Generation
- Generated file: `lib/database.types.ts`
- Source of truth for typed DB interfaces.
- Regenerate after schema changes:
  - `npx supabase gen types typescript --linked > lib/database.types.ts`

## Current App Wiring Snapshot
- `app/page.tsx` is the hub entry page for signed-in/signed-out users. For signed-in users it surfaces, in order:
  - A "Resume your round" section listing every `active` round the user participates in (joined to layouts + courses, role badge: `Scorer` vs `Observer`).
  - Pending invites with enriched context (course, layout, inviter display name, timestamp).
  - Primary actions (Start round, Round history, Account/Sign in).
- `app/rounds/page.tsx` is the round history page: lists all `active` / `completed` / `abandoned` rounds the user participated in, joined to layout + course, ordered by `started_at` desc. Each row links to `/rounds/[id]`.
- Session refresh middleware is in place.
- Round create flow:
  - `app/rounds/new/page.tsx`
  - `app/rounds/new/create-round-form.tsx`
  - Creates rounds as `draft`, auto-adds scorer as participant, redirects to `/rounds/[roundId]`.
- Round setup/session flow:
  - `app/rounds/[roundId]/page.tsx`
  - `app/rounds/[roundId]/round-session.tsx`
  - Round page access is available to scorer and accepted participants; non-participants are redirected.
  - Server-side invariant: the scorer is guaranteed to be in `round_participants`. If absent, the page inserts the missing row and refetches before rendering. The old `scorer-self` synthetic injection has been removed.
  - Displays course/layout/holes/par and one unified participants list (scorer + guests + invited users); pending invited users are shown inline as `(pending)`.
  - Observer mode is read-only and hides scorer controls.
  - Join code has been removed from app flow and schema; participation is invite/draft based.
  - Add-participant input is visible only in `draft`.
  - Draft actions: Start round, Delete draft, remove non-scorer participants/invites.
  - Start round is blocked while pending invites exist.
  - Active scoring: scorer enters strokes per hole; **Save** awaits a batched `hole_scores` upsert for all players on the hole, then advances (or shows an error while keeping drafts). Scorer can navigate back to previous holes for corrections.
  - Each active-hole card has a per-player OB toggle pill rendered inline with the strokes input. OB is a boolean flag (default `false`), sent in the same upsert as strokes; the pill turns rose-red when active and will drive the scorecard's OB marker in a future polish slice.
  - The previous integer `ob` count and the `putts` column have been retired (see `20260515160047_hole_scores_ob_boolean.sql`). The future advanced-stats slice will reintroduce per-attempt C1 / C2 inputs and Driving Accuracy (`fairway_hit`) behind a per-round opt-in toggle.
  - A ranked leaderboard pane sits above the scorecard whenever the round is not `draft` and at least one hole has been scored. Rows show position, label, vs-par badge (color-coded), total strokes, and `thru N`, sorted by vs-par asc, then strokes asc, then label.
  - A "last saved" indicator (`Hole X saved by Y · just now`) is rendered below the round status whenever Realtime delivers a `hole_scores` INSERT/UPDATE. Relative time is refreshed by a state-backed ticker every 15 s; no `Date.now` calls occur during render.
  - Realtime handlers merge payloads in place: `hole_scores` INSERT/UPDATE replace the matching `(participant_id, hole_id)` row; `round_participants` INSERT/UPDATE/DELETE apply payload-driven mutations; `round_invitations` still triggers a refetch because the payload omits the joined profile. `loadHoleScores` / `loadParticipants` remain as defensive fallbacks for malformed payloads.
  - Midpoint UX: front-9 read-only summary appears once holes 1-9 are fully scored.
  - End UX: final read-only round summary appears after all holes are scored, with explicit confirmation to end round; completing the round runs a final save if needed, then marks the round completed. Completed rounds are read-only.
  - Terminal transitions (complete / abandon / delete draft) redirect to the hub `/`, not `/rounds/new`.
  - Active action: Abandon round (also clears legacy `discore_pending_queue:<roundId>` in `localStorage` if present).
- Round invitations flow:
  - Pending invites are surfaced inline on the home hub (`app/page.tsx`) via `app/home-invites.tsx`, with course / layout / inviter / time pulled in via a single joined query.
  - Invitee accepts/declines directly from hub.
  - Accept path inserts `round_participants` first, then updates invitation status to preserve consistency.

## Scoring Module (`/lib/scoring`)
- `lib/scoring/types.ts` — domain types (`Hole`, `Participant`, `HoleScore`, `SegmentStats`, `ScoreLookup`) plus the shared `makeScoreLookupKey` helper. No `any`.
- `lib/scoring/stats.ts` — pure scoring math: `formatVsPar`, `segmentPlayerStats`, `getFirstIncompleteHoleIndex`, `getTotalStrokes`. No React, no Supabase.
- Legacy `discore_pending_queue:<roundId>` `localStorage` keys are cleared from `round-session.tsx` on mount / complete / abandon so old outbox data cannot interfere.

## Online-first scorer writes (Blueprint §3a)
- `saveCurrentHoleScores` **awaits** a single batched `hole_scores` upsert (all scoring participants on the active hole) via the browser Supabase client, then merges returned rows into `holeScores`. On failure, an error is shown and stroke / OB **drafts stay** on screen for retry.
- No `localStorage` write queue, no `pending:` client ids for persistence, and no "N pending" / background flush loop.
- Realtime continues to merge server `hole_scores` rows for observers and multi-tab consistency.
- `onCompleteRound` saves the current hole if needed, then updates the round to `completed`.
- `onAbandonRound`, `onDeleteDraft`, successful `onCompleteRound`, round mount (scorer), and `completed` / `abandoned` status still clear that legacy storage key for hygiene.

## Near-Term Product Direction
- Registered-user participation uses invite + confirm flow with pending invitations handled directly from the home hub.
- Guest add in setup remains supported.
- Slice D-courses complete: JSON seeds + `npm run seed:courses` migration pipeline.
  Slice D-guest (anonymous guest round + claim on signup) is deferred; see
  `ROADMAP.md`.
- Advanced stats (Driving Accuracy via `fairway_hit`, Circle 1 / Circle 2 putting %s via per-attempt counters, derived scrambling rate) are deliberately parked. They will be reintroduced as their own slice after Slice D, gated by a per-round "Track advanced stats" toggle set during draft setup.

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

