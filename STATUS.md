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

**Field day:** Validated on course (scoring works well). Visual polish pass done for tab screens (Home, Play, History, Profile); round route unchanged as north star.

---

## Where we are (Mar 2026)

**Shippable hobby app** for the Estonian disc golf community: sign in, pick a course, score a round with guests or invited friends, observer watches live, history on device.

| Area | State |
|------|--------|
| **Backbone** | Done — auth, RLS, scoring, Realtime, deploy |
| **Round UX** | Done — reference quality; don't regress |
| **Tab UI** | Good enough for this stage — consistent nav, cards, CTAs |
| **Course data** | **22 layouts**, **16 parks**; all seeded courses have `lat`/`lng` |
| **Stats / competitions** | Not started (Phase 5–6) |
| **PWA install** | Deferred |

**Recommended next product work:** History **Stats** sub-section (tier-1: rounds played, best round, score distribution, OB count). Secondary: course map PNGs, Play map view toggle, more parks via JSON seeds.

---

## Performance (nav) — done this pass

Tab navigation felt laggy (2–3 s dead tap) because each tab was a server render that blocked on serial Supabase round-trips with no loading UI. Fixed per [BLUEPRINT §2b](BLUEPRINT.md):

- **Route `loading.tsx` skeletons** on `/`, `/courses`, `/rounds`, `/auth` → instant shell on tap (root layout is static, so fallbacks stream immediately).
- **`getClaims()` on tab pages** (Home, Play, History, Profile) instead of a second `getUser()` — local JWT verify, no extra Auth round-trip; middleware still refreshes the session. Round route / course detail / `rounds/new` left on `getUser()`.
- **Shared score-summary loader** (`lib/rounds/round-score-summary.ts`) de-duplicates the Home + History fan-out and is the swap point for Phase 5 SQL aggregates.

Deferred (see below): `middleware.ts` → `proxy.ts` rename (Next 16 deprecation); RLS `(select auth.uid())` initplan wrapping; trimming the no-op setter params in the round hooks.

---

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| **1** Infrastructure | Done | Next.js, Supabase clients, middleware; minimal `manifest.ts`; SW not configured |
| **2** Schema & seeding | Done | RLS; JSON seed pipeline; **22 layouts** / **16 course parks**; all active courses have coordinates |
| **3** Core scoring | **Done** | Field-tested; draft/active/complete, invites, scorer writes, observer Realtime |
| **4** UI bootstrap | **Done (this stage)** | Tab screens polished: Home hub, Play list + detail, History cards, Profile hub; unified inline primary CTAs; green active nav tab. PWA deferred. |
| **5** History & stats | Partial | History list with vs par; **Stats UI not built** |
| **6** Ratings & tournaments | Not started | By design until adoption warrants |

---

## Current capabilities

- **Hub** (`app/page.tsx`): continue-round cards (`bg-muted/60`), invites (Realtime), get-started checklist, **recent rounds** (last 3, same card UI as History with vs par)
- **Bottom nav:** Home · Play · History · Profile; **all active tabs** use primary green; hidden on live scorer round routes
- **Auth & profile** (`app/auth`): Profile hub — hero, Details / Preferences / **Authentication**, sign out; nearby toggle copy references location services
- **Courses:** 22 layouts via `npm run seed:courses`; Play search + **distance sort** (all seeded parks have coords); detail — layout picker, About (address, Open in Maps under address, fees/contact), optional `public/courses/{slug}-map.png`
- **Rounds:** draft setup (inline Start round), active scoring, observer read-only, complete/abandon
- **History:** `app/rounds/page.tsx` — course-style cards; **vs par only** on the right (abandoned shows label, no score); loads scores inline in page file
- **Scoring / round route** (unchanged summary): online-first saves; full scorer + observer UX at `/rounds/[roundId]` — see prior docs; **do not regress**

---

Also implemented: `round_invitations`, single active round per scorer, join codes removed, boolean `hole_scores.ob`, RLS helpers `is_round_member` / `can_manage_round_invitation`. Code layout: `lib/scoring` (pure math), `lib/rounds` + `lib/profiles`, `app/rounds/[roundId]/` for round UI.

---

## Next (ordered)

1. ~~**Field test**~~ — Done.
2. ~~**Tab UI polish (this stage)**~~ — Done (Home, Play, History, Profile, nav, CTAs).
3. ~~**Course coordinates**~~ — Done for all seeded parks.
4. ~~**Nav speed + cleanup pass**~~ — Done (loading skeletons, `getClaims` on tab pages, shared score-summary loader; see Performance).
5. **Stats (Phase 5)** — Tier-1 block on History route: rounds played, best round, score distribution, OB count (`STATS_ROUND_STATUSES` = completed only). Aggregate in Postgres (view/RPC), not JS — swap `lib/rounds/round-score-summary.ts` ([BLUEPRINT §2b/§8](BLUEPRINT.md)).
6. **Course content** — Map PNGs per park (`public/courses/{slug}-map.png`); fix Järve Talu **20x** hole data when confirmed on site.
7. **Play map view** — Optional toggle when useful (most coords now available).

### Next chat (copy-paste)

```
Read STATUS.md and UI-ROADMAP.md first. Round route is frozen — don't regress.

Pick one slice:
- History Stats — tier-1 player stats on /rounds (completed rounds only)
- Course maps — add PNGs + any seed fixes from field notes
- Play map view toggle

One slice per chat. Run lint, test, build before commit.
```

---

## Later / deferred

- **PWA:** Serwist + icons when install-to-homescreen matters.
- **Slice D-guest:** Anonymous round local-only → claim on signup (Option A below).
- **Advanced stats:** `fairway_hit`, C1/C2 counters, scrambling — per-round opt-in toggle after D-guest.
- **Phase 5:** Richer per-player stats and comparisons.
- **Phase 6:** Ratings, tournaments (`tournament_id` column reserved).
- Smart-ID / magic-link auth.
- **Geolocation / nearby sort:** **done** — all seeded courses have `lat`/`lng`; Profile toggle + browser permission
- **Courses map view:** optional follow-up on Play tab
- **Next 16 `middleware` → `proxy`:** build warns `middleware` is deprecated in favor of `proxy.ts` (exported `proxy`). Rename when convenient; auth-sensitive, so do it as an isolated change and re-verify session refresh.
- **RLS initplan:** wrap `auth.uid()` as `(select auth.uid())` in policies so the planner caches it — negligible now, worth it once history/stats scan many rows.
- **Round hooks cleanup:** `use-round-realtime` / `use-active-scoring` take no-op `setRenderNow` / `setLastSavedEvent` setters from `round-session`; trim the dead params (behavior-preserving, but touches the frozen round route — verify carefully).

---

## Completed slices (archive)

| Slice | Status | Outcome |
|-------|--------|---------|
| **A** Resilience & domain | Complete | `/lib/scoring`; online-first writes; legacy `localStorage` queue removed |
| **B** Round visibility | Complete | History, resume on hub, enriched invites, scorer participant self-heal |
| **C** Score & observer UX | Complete | OB boolean, leaderboard, last-saved, Realtime (scores + meta refresh), hub invite live |
| **D-courses** | Complete | JSON seeds, `seed:courses` → SQL migrations; 22 layouts |
| **D-guest** | Deferred | See Later |
| **E Tab UI (2026)** | Complete | Home, History, Profile, course detail, nav, CTAs |

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

### Migrations

**30 files** in `supabase/migrations/` (core schema through `20260617145700_home_list_query_indexes.sql`, plus course seed batches through `20260701171527_seed_courses_from_json.sql`). Run `npx supabase migration list` to compare local vs remote.

Tables in use: `profiles`, `courses`, `layouts`, `holes`, `rounds` (incl. optional `name`), `round_participants`, `round_invitations`, `hole_scores`. RLS on all.

**Realtime publication:** Enforced by `20260527190100_realtime_publication_membership.sql` (idempotent — adds any of `hole_scores`, `round_invitations`, `round_participants`, `rounds` that are not already in the publication).

Typegen: `npx supabase gen types typescript --linked > lib/database.types.ts`

### Key paths

| Area | Paths |
|------|--------|
| Scoring math | `lib/scoring/{types,stats}.ts` |
| Round actions | `lib/rounds/{hole-scores,unified-players,participant-labels,round-draft-actions,round-active-actions,invite-rows,round-status,round-score-summary}.ts` |
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

- **Simplicity:** Follow [BLUEPRINT.md §2a](BLUEPRINT.md) — no file sprawl, no over-engineering; think before extracting helpers.
- LF line endings via `.gitattributes`
- If lint reports `lib/database.types.ts` as binary, regenerate with typegen command above

---

## Maintenance

- **Blueprint** = rules and architecture (change rarely).
- **Status** = reality, field MVP, priorities, and reference appendix (change often).
