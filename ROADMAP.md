# Discore — Roadmap

This document captures the agreed product/architecture strategy and the slice
plan. It is the forward-looking companion to:

- `BLUEPRINT.md` — fixed architectural rules. Never contradict; never amend
  without an explicit decision.
- `PROJECT_STATE.md` — live implementation state and migration list. Update
  this whenever behaviour changes.

Update `ROADMAP.md` whenever a slice scope changes, a new slice is agreed, or
priorities shift.

## Where we are

- Phase 1 (infrastructure) and Phase 2 (schema + RLS + seeding) complete.
- Phase 3 (core scoring) is mid-flight:
  - Lifecycle (draft → active → completed/abandoned), invite + accept,
    scorer-only writes, observer read-only view, and Realtime subscriptions
    are implemented.
  - Slice A (resilience + scoring domain extraction) is complete: `/lib/scoring`
    owns pure scoring math. **Scorer writes are online-first** (awaited
    batched upserts; see `BLUEPRINT.md` §3a). The former `localStorage` outbox
    and `use-pending-queue` layer have been removed; legacy `localStorage`
    keys are cleared inline in `round-session.tsx`.
  - Slice B (round visibility + continuity) is complete: round history at
    `/rounds`, "Resume your round" surface on the home hub, enriched invite
    cards, and a server-side scorer-self-heal that replaces the old
    `scorer-self` synthetic.
  - Slice C (score capture completeness + observer experience) is complete:
    a per-player OB toggle pill on the active-hole card, a ranked
    leaderboard pane above the scorecard, a Realtime-fed "last saved"
    indicator, and in-place Realtime payload merges. Terminal redirects now
    land on the hub `/` instead of `/rounds/new`. The earlier integer-OB /
    putt-count capture was reworked: `hole_scores.ob` is now `boolean`, the
    `putts` column was dropped, and advanced stats (fairway hit, C1 / C2 putting
    %s, scrambling) are parked behind a per-round opt-in toggle to be
    delivered after Slice D.
  - See `PROJECT_STATE.md` for behavioural details.

## Strategy

Work is split into thin slices that ship independently, prioritised by
leverage against the blueprint and against real on-course pain. UI work is
deliberately deferred until product slices A–D are complete; we will revisit
UI direction once Slice D lands.

## Slices

### Slice A — Resilience & domain core  [COMPLETE]

Extract scoring math into a typed pure module at `/lib/scoring`. **Scorer
writes:** online-first batched `hole_scores` upserts (Blueprint §3a); drafts
stay in React on failure so brief dead spots do not wipe inputs. A legacy
Legacy `discore_pending_queue` `localStorage` keys are cleared inline in
`round-session.tsx` only.

Files: `lib/scoring/{types,stats}.ts`, `app/rounds/[roundId]/round-session.tsx`.

### Slice B — Round visibility & continuity  [COMPLETE]

Goal: make rounds visible after they end, and reduce confusion about which
round is "live".

Delivered:
- `app/rounds/page.tsx`: minimal history list of rounds the signed-in user
  participated in, joined to course/layout. Sorted by recency.
- Hub-level "Resume your round" surface on `app/page.tsx` listing every
  `active` round the user participates in, with a role badge
  (`Scorer` / `Observer`).
- Richer invite cards: `app/home-invites.tsx` now accepts `InviteWithContext`
  rows with course, layout, inviter display name, and timestamp, fetched in
  a single joined query on `app/page.tsx`.
- `scorer-self` synthetic removed. `app/rounds/[roundId]/page.tsx` now
  inserts the missing `round_participants` row when the scorer is absent
  (idempotent; tolerates `23505`) and refetches; `round-session.tsx` no
  longer filters or injects the synthetic.

### Slice C — Score capture completeness & observer experience  [COMPLETE]

Goal: close the schema-vs-UI gap and make Observer mode feel live.

Delivered:
- OB capture as a per-player toggle pill on the active-hole card, inline
  with the strokes input. `hole_scores.ob` was migrated from `smallint` to
  `boolean` (default `false`, not null) in
  `20260515160047_hole_scores_ob_boolean.sql`; the previous `putts` column
  was dropped in the same migration because putt tracking will be
  reintroduced later as part of advanced stats (per-attempt C1 / C2
  counters), not a single number per hole. The OB pill turns rose-red when
  active and is sent with strokes in the hole-save upsert.
- Ranked leaderboard pane above the scorecard, computed from
  `segmentPlayerStats` over all holes. Sorted by `vsPar` asc, then total
  strokes asc, then label. Hidden while the round is `draft` and while
  nobody has scored a hole yet.
- "Last saved" indicator below the round status, fed by the `hole_scores`
  Realtime payload (`Hole X saved by Y · just now`). Relative time is
  refreshed via a state-backed `renderNow` ticker every 15 s; no `Date.now`
  calls during render.
- In-place Realtime payload merges: `hole_scores` INSERT/UPDATE replace the
  matching `(participant_id, hole_id)` row and bump the "last saved" pointer.
  `round_participants` INSERT/UPDATE/DELETE apply payload-driven mutations.
  `round_invitations` still refetches because the payload doesn't include the
  joined `profiles.display_name`. `loadHoleScores` / `loadParticipants` remain
  as defensive fallbacks for malformed payloads.
- Terminal round transitions (complete / abandon / delete draft) redirect
  to the hub `/` instead of `/rounds/new`.

Out of scope (still deferred):
- Advanced stats: Driving Accuracy via `fairway_hit`, Circle 1 putting %
  (inside ~10 m), Circle 2 putting % (inside ~20 m), and a derived
  scrambling rate ("par saved after missing the fairway"). All of these
  will live behind a per-round "Track advanced stats" toggle set during
  draft setup (locked once the round is active) so casual rounds stay
  one-tap-per-hole. Schema-side this needs: keep `fairway_hit` as-is, add
  `c1_attempts` / `c1_made` / `c2_attempts` / `c2_made` counts on
  `hole_scores`, add `rounds.track_advanced_stats boolean default false`.
  Slated for after Slice D.
- Ratings (Phase 6).

### Slice D — Onboarding & course seeding  [IN PROGRESS]

Goal: zero-friction first-use and a real course library.

#### Slice D-courses — Course import pipeline  [COMPLETE]

Delivered:
- Hand-curated JSON per layout under `supabase/seeds/courses/` (6 layouts).
- `npm run seed:courses` → `scripts/seed-courses.ts` validates JSON and emits
  reviewable SQL; `--new-migration` writes a migration applied via
  `npx supabase db push` (no service role key).
- Idempotent upserts on `courses.slug`, `layouts (course_id, slug)`,
  `holes (layout_id, hole_number)`. Legacy `jarve` slug renamed in SQL;
  legacy `pro-18` layout dropped in `20260518150000_drop_legacy_jarve_pro_18.sql`.

#### Slice D-guest — Anonymous guest round  [DEFERRED]

Out of scope for D-courses; still planned for Slice D:
- Guest-round flow (Option A in `PROJECT_STATE.md`): score without signing
  up, post-round "Claim this round" inserts the historical `completed` row
  on signup. Guest scoring stays **local-only** (no Supabase writes until
  claim); persistence strategy for that slice is TBD and is **not** the old
  `hole_scores` `localStorage` outbox removed in favour of online-first
  authenticated scoring.

Out of scope (Slice D overall):
- Smart-ID / Mobile-ID / magic-link auth.
- Geolocation-based "courses near me".

## UI direction (deferred until Slice D lands)

We agreed to keep plain Tailwind until product slices A–D are complete. After
Slice D, revisit:

1. Smoke-test `shadcn/ui` on a throwaway branch to verify Tailwind v4 +
   Next 16 + React 19 compatibility.
2. If green, adopt as a thin primitives layer: `button`, `input`, `label`,
   `card`, `badge`, `sonner` (toasts), `alert-dialog` (replaces
   `window.confirm`), `sheet` (mobile drawer), `skeleton`. Define neutral +
   emerald accent tokens via CSS variables.
3. Refactor surfaces incrementally; do not touch the bespoke scorecard table.
4. Adopt mobile-first patterns: bottom-anchored primary action, +/- stepper
   plus Par / Bogey / Birdie shortcuts, swipe-between-holes, sticky hole
   header during input, optional haptic feedback.

## After Slice D / Phase 4+

- Phase 4 — PWA polish: real `manifest.ts` (icons, theme, screenshots),
  `serwist` service worker, install prompt, dark-mode tokens.
- Phase 5 — History & stats: richer per-player stats, basic comparisons.
- Phase 6 — Ratings & tournaments: only if community adoption warrants.
  Reuses the `tournament_id` column reserved in Phase 2.

## Cross-cutting concerns to track

These don't belong to a single slice but should be confirmed/fixed along the
way.

- `profiles.visibility` default: if `private`, invite-by-name search returns
  zero registered users and friends can never find each other. Confirm and
  fix before Slice D ships.
- The `auth.users → profiles` insert trigger: if missing or partial, new
  sign-ups have no `display_name`, breaking search and invite labels.
- `tournament_id` nullable column on `rounds` already exists per the initial
  schema migration. No action needed; reserved for Phase 6.
- Reconsider the "single Scorer" model for the "pass the phone every 9
  holes" use case. Out of scope for MVP; a future `round_scorers` junction
  table would be a backwards-compatible expansion.

## How to use this file from a new chat

1. Read `BLUEPRINT.md` for non-negotiable rules.
2. Read `PROJECT_STATE.md` for what is actually built right now.
3. Read this file for what is next and why.
4. Plans for individual slices (when active) live under `.cursor/plans/` as
   `*.plan.md` and are referenced from the active TODO list.
