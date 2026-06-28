# Discore — Status

> Read [BLUEPRINT.md](BLUEPRINT.md) first, then this file. For UI/UX work, also read [UI-ROADMAP.md](UI-ROADMAP.md) and [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md) when touching screens.

Update this file when behaviour or priorities change. Do not duplicate operational detail in the Blueprint.

---

## Field MVP (test on course)

**Goal:** A signed-in scorer can run a full round on a phone browser with mobile data; an optional second account can observe live. This is not a polished product — it validates the backbone on a real course.

**Done when:**

- [x] Both testers have accounts, saved profiles (first + last → `display_name`), on HTTPS deploy
- [x] Scorer: create draft → add guest and/or invite friend → friend accepts on hub → start round
- [x] Score all holes (save per hole, OB optional) → complete round
- [x] Round appears in history; hub shows resume while active
- [x] Observer sees scorecard update after scorer saves (Realtime)
- [x] Chosen layout exists in `supabase/seeds/courses/`

**Prerequisites:** Remote Supabase with all migrations applied; `NEXT_PUBLIC_SUPABASE_*` on host; 2+ registered users.

**Deploy (done):** Vercel production HTTPS; env vars set; Supabase Auth Site URL + redirect URLs pointed at deploy URL.

**Realtime (done for field MVP):**

- Supabase `supabase_realtime` publication includes `hole_scores`, `round_invitations`, `round_participants`, `rounds`. Membership is enforced by migration `20260527190100_realtime_publication_membership.sql`.
- **Round page** (`use-round-realtime.ts`): low-frequency tables (participants, invites, round status) use one `refreshRoundMeta()` refetch on any change; `hole_scores` stays inline-patched for speed; resync on channel `SUBSCRIBED` and tab `visibilitychange`.
- **Hub** (`components/home/invites.tsx`): pending invites for current user; same resync on subscribe + visibility.
- **Live flows verified in pre-flight:** invite arrival on hub, invite accept in round, score updates for observer, round completion for observer. Re-test after deploy if publication or code changed.

**Known blockers before field test:**

- PWA install optional for now — browser tab is fine for field tests.

**Profile discoverability (done):** `profiles.visibility` removed; authenticated users can read all profiles for invite/search. Migration `20260521120000_drop_profiles_visibility.sql` on remote.

**Out of scope for field MVP:** Anonymous guest round (D-guest), advanced stats / `fairway_hit`, full shadcn UI, rich Phase 5 stats, offline sync.

**Field day:** Run full round on course with two phones (LTE, browser tab not PWA). Capture friction for Tier 2 UX (layout grouping, sticky save, replace `window.confirm`).

---

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| **1** Infrastructure | Done | Next.js, Supabase clients, middleware; minimal `manifest.ts`; SW not configured |
| **2** Schema & seeding | Done | RLS, 17 migrations, 18 seeded layouts |
| **3** Core scoring | **Done (field MVP)** | Draft/active/complete, invites, scorer writes, observer Realtime (consolidated refresh + visibility resync) |
| **4** UI bootstrap | **Done** | shadcn, theme, scorer round UX. Ongoing UI consistency → [UI-ROADMAP.md](UI-ROADMAP.md). PWA install deferred. |
| **5** History & stats | Partial | `/rounds` list exists; richer stats not built |
| **6** Ratings & tournaments | Not started | By design until adoption warrants |

---

## Current capabilities

- **Hub** (`app/page.tsx`): header paints after auth; body streams via `Suspense`. `loadHomeData` — 3 parallel queries (profile, invites, participations→rounds). Indexes on `round_participants(user_id)`, pending invites, `rounds(status)`.
- **Bottom nav:** Home · Play (`/courses`) · History (`/rounds`) · Profile (`/auth`). Tab bar hidden on live round routes (`/rounds/[id]`).
- **Auth & profile** (`app/auth`, `lib/profiles`): sign-in, save profile, `display_name` = first + last (Option A for labels)
- **Courses:** 18 layouts via JSON seed pipeline (`npm run seed:courses`); browse at `/courses` and `/courses/[slug]` (Play tab); **nearby sort** (browser geolocation + `lat`/`lng` when seeded), compact list rows, Open in Maps on detail
- **Rounds:** create draft → invite registered users or add guests → start when no pending invites; **draft setup UI** at `/rounds/[id]` (unified roster, starting-hole picker, editable title, invite/guest add)
- **Scoring:** online-first batched hole saves — see [BLUEPRINT.md §3a](BLUEPRINT.md)
- **Active round:** Single-player stepper + selectable roster (hole score / total / vs par; **Hide scores** menu toggle hides total + vs par), OB toggle, header menu (scorecard dialog, hide/show scores, round info, abandon), optional **round name**, configurable **starting hole**, live scorecard (sticky cols, expandable player names when truncated, auto-scroll to current hole), hole notes on `ActiveHoleStatus`, results pool when scorer finishes all holes or on completed/abandoned view, end-of-round confirm deck, hole navigation, **multi-player next-player button** (`↓` until all scores entered, then green `→` advance hole)
- **Observer:** read-only UI + Realtime scorecard; scorecard-first (no pool list during active); `ActiveHoleStatus`; score-derived current hole; draft “waiting to start” copy; bottom tab bar throughout active round
- **Completed / abandoned round:** Shared finished layout via `isFinishedRoundStatus` — Results of the pool + scorecard on same route; status badge + date in header; scorer stays on page after confirm; bottom tab bar
- **History:** `app/rounds/page.tsx` for past rounds
- **Code layout:** `lib/scoring` (pure math), `lib/rounds` + `lib/profiles` (actions), `app/rounds/[roundId]/` (orchestrator, hooks, components)

Also implemented: `round_invitations`, single active round per scorer, join codes removed, boolean `hole_scores.ob`, RLS helpers `is_round_member` / `can_manage_round_invitation`.

---

## Next (ordered)

1. ~~**Profile discoverability**~~ — Done.
2. ~~**Deploy**~~ — Done (Vercel + Supabase Auth URLs).
3. ~~**Pre-flight + Realtime**~~ — Done (publication + consolidated round/hub subscriptions).
4. ~~**Backbone refactor**~~ — Done (typed Supabase factories, strict `RoundStatus`, `/lib/scoring` extracted + tested, scorer-as-participant trigger, signup-name trigger).
5. **UI & UX (journey)** — See [UI-ROADMAP.md](UI-ROADMAP.md). **Round route done.** **Home + nav shell done.** **Courses list slice done.** **Next:** Courses map view, backfill coords in seeds, or **Stats session** (History sub-section).
6. **Field test on course** — Re-run when ready; capture friction on course.

### Next chat (copy-paste)

```
Continue Discore UI per UI-ROADMAP.md and DESIGN-PATTERNS.md. Read STATUS.md first.

Round session at /rounds/[roundId] is the reference — don't regress it.

Pick the next slice:
- Courses — map view toggle; backfill `lat`/`lng` in seeds as courses are added
- History / Stats — tier-1 player stats, optional gamification

One slice per chat. Run tsc, lint, test, build before commit.
```

---

## Later / deferred

- **PWA:** Serwist + icons when install-to-homescreen matters.
- **Slice D-guest:** Anonymous round local-only → claim on signup (Option A below).
- **Advanced stats:** `fairway_hit`, C1/C2 counters, scrambling — per-round opt-in toggle after D-guest.
- **Phase 5:** Richer per-player stats and comparisons.
- **Phase 6:** Ratings, tournaments (`tournament_id` column reserved).
- Smart-ID / magic-link auth.
- **Geolocation “courses near me”:** **done** on `/courses` (browser geolocation + distance sort when `lat`/`lng` seeded).
- **Courses map view:** follow-up slice when enough courses have coordinates.

---

## Completed slices (archive)

| Slice | Status | Outcome |
|-------|--------|---------|
| **A** Resilience & domain | Complete | `/lib/scoring`; online-first writes; legacy `localStorage` queue removed |
| **B** Round visibility | Complete | History, resume on hub, enriched invites, scorer participant self-heal |
| **C** Score & observer UX | Complete | OB boolean, leaderboard, last-saved, Realtime (scores + meta refresh), hub invite live |
| **D-courses** | Complete | JSON seeds, `seed:courses` → SQL migrations |
| **D-guest** | Deferred | See Later |

---

## Cross-cutting risks

- **`auth.users → profiles` trigger** — composes `display_name` from `first_name`/`last_name` in `raw_user_meta_data`. Non-PII `"Player <uuid>"` fallback if metadata is missing (e.g. dashboard-created users). Never falls back to email.
- **Single scorer model** — “pass the phone” not supported; future `round_scorers` table possible.
- **`tournament_id` on `rounds`** — reserved; no action needed.
- **Profile data exposure** — any signed-in user can read `profiles` fields (name, city, birth year, gender, avatar). Email stays in Auth only. Accepted for community MVP.

---

## Reference

### Stack

Next.js (App Router), TypeScript, Tailwind, Supabase (Auth + Postgres + RLS + Realtime), npm.

### Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Do not use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (deprecated in this repo).

### Supabase clients

| Path | Use |
|------|-----|
| `lib/supabase/client.ts` | `"use client"` only |
| `lib/supabase/server.ts` | Server Components / actions (factory, not singleton) |
| `lib/supabase/middleware.ts` | Session refresh |
| `middleware.ts` | Root middleware entry |

Do not reintroduce `utils/supabase/*`.

### Supabase project

- Project ref: `uxvrnvsgqyctpxjiziyp`
- Per machine: `supabase login`, `supabase link --project-ref uxvrnvsgqyctpxjiziyp`

### Migrations (22)

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
14. `20260518143000_seed_courses_from_json.sql`
15. `20260518150000_drop_legacy_jarve_pro_18.sql`
16. `20260520100345_seed_courses_from_json.sql`
17. `20260521120000_drop_profiles_visibility.sql`
18. `20260527190000_ensure_scorer_participant_trigger.sql`
19. `20260527190100_realtime_publication_membership.sql`
20. `20260527190200_signup_requires_first_last_name.sql`
21. `20260611180000_rounds_name.sql`
22. `20260617145700_home_list_query_indexes.sql`

Tables in use: `profiles`, `courses`, `layouts`, `holes`, `rounds` (incl. optional `name`), `round_participants`, `round_invitations`, `hole_scores`. RLS on all.

**Realtime publication:** Enforced by `20260527190100_realtime_publication_membership.sql` (idempotent — adds any of `hole_scores`, `round_invitations`, `round_participants`, `rounds` that are not already in the publication).

Typegen: `npx supabase gen types typescript --linked > lib/database.types.ts`

### Key paths

| Area | Paths |
|------|--------|
| Scoring math | `lib/scoring/{types,stats}.ts` |
| Round actions | `lib/rounds/{hole-scores,unified-players,participant-labels,round-draft-actions,round-active-actions,invite-rows,round-status}.ts` |
| Profiles | `lib/profiles/{format-display-name,upload-avatar,save-profile}.ts` |
| Round UI | `app/rounds/[roundId]/round-session.tsx`, `use-round-realtime.ts`, hooks, `components/*` (scorecard, draft setup deck, active scoring, results, completion) |
| Round display name | `lib/rounds/round-display-name.ts`, `draft-round-title-portal.tsx`, `create-round-form.tsx` |
| Draft setup UI | `draft-players-panel.tsx`, `draft-setup-deck.tsx`, `draft-starting-hole-field.tsx`, `lib/scoring/hole-order.ts` |
| Section headings | `lib/ui/section-heading.ts` |
| Hub / home | `app/page.tsx`, `components/home/*`, `lib/home/load-home-data.ts`, `lib/ui/{page-chrome,home-greeting}.ts` |
| App chrome | `components/layout/bottom-tab-bar.tsx`, `components/layout/app-chrome.tsx` |
| Courses browse | `app/courses/`, `lib/courses/`, `components/courses/course-search-dropdown.tsx` |
| Draft round create | `lib/rounds/round-draft-actions.ts` (`createDraftRound`), `components/rounds/start-round-button.tsx` |

### Constraints

- Round statuses: `draft`, `active`, `completed`, `abandoned` (default `draft`)
- One `active` round per scorer (`rounds_one_active_per_scorer_idx`)
- `hole_scores` writes only while round is `active`; scorer only (via RLS + `rounds.scorer_id`)
- Round delete only when zero `hole_scores`
- Participation: invite flow or guest name in draft; join codes removed

### Product sidenote — guest round (Option A)

Planned frictionless onboarding: score anonymously with local-only storage, then “claim” on signup to insert one completed history round. Not implemented; distinct from removed `localStorage` scorer outbox.

### Cross-machine handoff

1. `git pull` → `npm ci` → confirm `.env.local`
2. `npx supabase login` / `link` if needed
3. `npm run lint` → `npx supabase migration list`
4. Continue work; update this file when behaviour changes

### Repo guardrails

- LF line endings via `.gitattributes`
- If lint reports `lib/database.types.ts` as binary, regenerate with typegen command above

---

## Maintenance

- **Blueprint** = rules and architecture (change rarely).
- **Status** = reality, field MVP, priorities, and reference appendix (change often).
