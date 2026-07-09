# Discore — Status

> Read [BLUEPRINT.md](BLUEPRINT.md) first, then this file. For UI/UX work, also read [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md) when touching screens.

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

**Deploy (done):** Vercel production HTTPS; env vars set; Supabase Auth Site URL + redirect URLs pointed at deploy URL (include `https://<app>/auth/callback` and `http://localhost:3000/auth/callback` for email confirmation).

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

## Where we are (Jul 2026)

**Shippable hobby app** for the Estonian disc golf community: sign in, pick a course, score a round with guests or invited friends, observer watches live, history on device.

| Area | State |
|------|--------|
| **Backbone** | Done — auth, RLS, scoring, Realtime, deploy |
| **Round UX** | Done — works well; evolve carefully (not frozen; advanced scoring inputs planned) |
| **Tab UI** | Good enough for this stage — consistent nav, cards, CTAs |
| **Course data** | **~209 layouts**, **~182 parks** — national skeleton from discgolfirajad.ee (Jul 2026); hand-curated parks retained; 5 split-venue merges applied. Data is **seasonal** — expect per-park review/updates over time (JSON → `seed:courses` → migration). |
| **Stats / competitions** | **v2 in progress** — slice A shipped (global stats + ace log); slices B–E planned (see [action plan](#stats-v2--action-plan)) |
| **PWA install** | Deferred |

**Recommended next product work (ordered):** (1) **Stats v2** — reshape global stats, Home teaser, course stats screen, round context (see action plan below); (2) **Advanced scoring** (opt-in per round); (3) Secondary: course content quality (maps, hole updates, missing layouts), Play map view.

---

## Performance (nav) — done this pass

Tab navigation felt laggy (2–3 s dead tap) because each tab was a server render that blocked on serial Supabase round-trips with no loading UI. Fixed per [BLUEPRINT §2b](BLUEPRINT.md):

- **Route `loading.tsx` skeletons** on `/`, `/courses`, `/rounds`, `/auth` → instant shell on tap (root layout is static, so fallbacks stream immediately).
- **`getClaims()` on tab pages** (Home, Play, History, Profile) instead of a second `getUser()` — local JWT verify, no extra Auth round-trip. Round route / course detail / `rounds/new` left on `getUser()`.
- **Player stats views** (`player_round_stats`, `player_lifetime_stats`) — Postgres backbone for History list, Home recent scores, and lifetime stats; replaces the former JS score fan-out. See migration `20260708170000_player_stats.sql`.

**Nav pass 2 (shipped — commit `24a2df0`):**

- **Middleware now uses `getClaims()`** instead of `getUser()` (`lib/supabase/middleware.ts`). It still refreshes an expired session (rotating cookies via `setAll`) via the internal `getSession()`, but verifies the JWT **locally against the cached JWKS** — killing the per-navigation / per-prefetch cross-region Auth round-trip. Asymmetric signing keys confirmed on the Stockholm project; falls back to a network `getUser()` only for symmetric keys. Realtime/browser-client sessions are unaffected (that WebSocket authenticates independently).
- **`experimental.staleTimes.dynamic = 30`** in `next.config.ts` — caches prefetched RSC payloads for dynamic (cookie-reading) tab routes, so re-tapping a tab renders instantly from the client router cache. Realtime/refresh reconciles staleness.
- **`Server-Timing: auth;dur=…`** header set in middleware for measuring the auth cost per request in DevTools → Network → Timing.

Deferred (see below): `middleware.ts` → `proxy.ts` rename (Next 16 deprecation); RLS `(select auth.uid())` initplan wrapping; trimming the no-op setter params in the round hooks.

---

## Phase status

| Phase | Status | Notes |
|-------|--------|-------|
| **1** Infrastructure | Done | Next.js, Supabase clients, middleware; minimal `manifest.ts`; SW not configured |
| **2** Schema & seeding | Done | RLS; JSON seed pipeline; **~209 layouts** / **~182 parks** (bulk import Jul 2026); coordinates on all seeded parks; ongoing edits via `supabase/seeds/courses/` |
| **3** Core scoring | **Done** | Field-tested; draft/active/complete, invites, scorer writes, observer Realtime |
| **4** UI bootstrap | **Done (this stage)** | Tab screens polished: Home hub, Play list + detail, History cards, Profile hub; unified inline primary CTAs; green active nav tab. PWA deferred. |
| **5** History & stats | **v1 shipped** | Postgres views + interim History block; **v2 in plan** (layout-scoped stats, course stats screen) |
| **6** Ratings & tournaments | Not started | By design until adoption warrants |

---

## Current capabilities

- **Hub** (`app/page.tsx`): continue-round cards (`bg-muted/60`), invites (Realtime), get-started checklist, **recent rounds** (last 3, same card UI as History with vs par)
- **Bottom nav:** Home · Play · History · Profile; **all active tabs** use primary green; hidden on live scorer round routes
- **Auth & profile** (`app/auth`): Profile hub — hero, Details / Preferences / **Authentication**, sign out; nearby toggle copy references location services
- **Courses:** ~209 layouts / ~182 parks via `npm run seed:courses`; Play search + **distance sort**; detail — layout picker, About (address, Open in Maps, fees/contact), optional `public/courses/{slug}-map.png`. Registry is a **starting skeleton** — many layouts need seasonal review; see [Course registry](#course-registry).
- **Rounds:** draft setup (inline Start round), active scoring, observer read-only, complete/abandon
- **History:** `app/rounds/page.tsx` — global **Your stats** block (v2 slice A) + round list with vs par (abandoned = label only). Data from `player_lifetime_stats` / `player_round_stats` views.
- **Courses (stats entry, v2):** course detail — park summary + **Your stats** → `/courses/[slug]/stats` (layout chooser + per-layout stats).
- **Scoring / round route** (unchanged summary): online-first saves; full scorer + observer UX at `/rounds/[roundId]` — see prior docs; **do not regress**

---

Also implemented: `round_invitations`, single active round per scorer, join codes removed, boolean `hole_scores.ob`, RLS helpers `is_round_member` / `can_manage_round_invitation`. Code layout: `lib/scoring` (pure math), `lib/rounds` + `lib/profiles`, `app/rounds/[roundId]/` for round UI.

---

## Next (ordered)

1. ~~**Field test**~~ — Done.
2. ~~**Tab UI polish (this stage)**~~ — Done (Home, Play, History, Profile, nav, CTAs).
3. ~~**Course coordinates**~~ — Done for all seeded parks.
4. ~~**Nav speed + cleanup pass**~~ — Done (loading skeletons, `getClaims` on tab pages + middleware, `staleTimes`, shared score-summary loader; see Performance).
5. ~~**Home upgrades (small)**~~ — Near-you Start **done**; play-again **dropped**; stats-teaser deferred until wired to `load-player-stats`.
6. ~~**Stats v1 (Phase 5)**~~ — **Done.** `score_bucket()` + `player_round_stats` / `player_lifetime_stats` views; History + Home unified on per-round view; interim stats block on `/rounds`. Completed rounds only; abandoned excluded from all stats.
7. ~~**National course registry (bulk)**~~ — **Done (Jul 2026).** ~187 layouts imported from discgolfirajad.ee scraper; 22 hand-curated layouts kept; 5 venue merges (Pühalepa, Vooremäe, Holstre-Põlli, Kõrvemaa, Kunda). Tooling: `scripts/match-seed-courses.ts` (`--split-review`).
8. ~~**Stats v2 slice A**~~ — **Done.** Global History block + Home teaser + ace log (`/rounds/aces`); migration `20260709180000_stats_v2_slice_a.sql`.
9. ~~**Stats v2 slice B**~~ — **Done.** `player_layout_stats` + `player_course_stats`; `/courses/[slug]/stats`; course page summary + Your stats button.
10. **Stats v2 slices C–E** — See [action plan](#stats-v2--action-plan). Next: **C** (finished round context block).
11. **Advanced scoring** — Opt-in per-round "detailed scoring" toggle (fairway hit, C1/C2 in reg, C1/C2 putting, bullseye/parked ≤3 m). After Stats v2 slices A–B. Touches round route — talk before pixels; verify carefully. See [Later / deferred](#later--deferred).
12. **D-guest** — Anonymous trial + claim on signup (acquisition lever); after advanced scoring.
13. **Course content (ongoing)** — Per-park review as seasons change (holes, pars, distances); map PNGs (`public/courses/{slug}-map.png`); missing layouts (e.g. Kõrvemaa PRO 18); fix Järve Talu **20x** when confirmed on site. No further bulk import planned.
14. **Play map view** — Optional toggle when useful (coords available nationwide).

### Next chat (copy-paste)

```
Read STATUS.md (Stats v2 action plan) and DESIGN-PATTERNS.md first. Round route works well — evolve carefully, not frozen.

Next slice: Stats v2 — pick ONE from the action plan (C→E):
- C — Finished round context block + link to layout stats
- D — Per-hole stats on layout stats screen
- E — Post-round insights (opt-out in Profile)

One slice per chat. Run lint, test, build before commit.
```

---

## Course registry

**Jul 2026:** One-time bulk import from discgolfirajad.ee (~196 scraped → 187 added + 22 hand-curated, minus overlaps). Source is often **outdated or incomplete** — treat the DB as a skeleton, not ground truth.

**Maintenance model:**

- **Creator-maintained** — players do not edit courses in-app ([BLUEPRINT](BLUEPRINT.md)).
- **Update path:** edit JSON in `supabase/seeds/courses/` → `npm run seed:courses` → new migration → `npx supabase db push`. Idempotent upserts on `courses.slug`, `layouts (course_id, slug)`, `holes`.
- **Cadence:** Many parks change **per season** (new layouts, tee moves, par/distance tweaks). Prioritise parks you play; curate over time — no need to fix all ~182 at once.
- **Hand-curated parks** (Buen Kiiu, Haapsalu, Järve, Keila, etc.) remain source of truth where they overlap scraper data.
- **Venue merges:** When discgolfirajad gives one layout per page, slugs can split one physical park — use `npx tsx scripts/match-seed-courses.ts supabase/seeds/courses --split-review` before adding more data.

**Known gaps (examples):** Kõrvemaa missing Prodigy PRO 18 layout; Vooremäe / others may not match current on-course signage; ~23 courses had no scraper hole data.

**Future (deferred):** **Player course feedback** — e.g. “layout doesn’t match course” from course detail or post-round, queued for creator review (no user edits to registry). Complements seasonal JSON updates; design when adoption warrants.

---

## Stats v2 — action plan

Product brainstorm locked **Jul 2026**. **Layout** is the unit of meaningful comparison (not cross-course averages). Stats are **opt-in to view** — play flow stays fast; analysis is one deliberate tap away.

### Principles

- **Play first:** course page keeps layout picker + Start round unobstructed; deep stats live behind **Your stats**.
- **No duplicate nav:** no "Your layouts" list on History — reach layout stats via **finished round** → round detail → link, or via **course stats screen**.
- **Drop global noise (v1 UI):** lifetime hole distribution, global average vs par, global OB/round — remove from UI (SQL columns can remain for layout aggregates).
- **Keep global highlights:** rounds played, career best (with context + link), ace journal, most-played layout (Home teaser).
- **Completed rounds only** for all stats; abandoned excluded. No footnote needed.

### Information architecture

| Surface | Role |
|---------|------|
| **Home teaser** | Glance: rounds · best ever · aces (tap) · most-played layout (tap) |
| **History tab** | Global summary + round list only; tab title stays **History** |
| **Finished round** (`/rounds/[id]`) | This-round stats + vs layout history + **All stats on [layout]** link |
| **Course page** (`/courses/[slug]`) | Light park summary + **Your stats** button → stats screen |
| **Course stats screen** (`/courses/[slug]/stats`) | Layout chooser + per-layout deep stats; `?layout=` deep link |
| **Ace log** (`/rounds/aces` or equivalent) | List: date, course · layout, hole # → tap opens round |

```
Home teaser ──tap aces──► Ace log
Home teaser ──tap best──► Round detail
Home teaser ──tap most played──► Course stats (?layout=)

History ──tap round──► Round detail ──link──► Course stats (?layout=)
Course page ──Your stats──► Course stats ──pick layout──► Per-layout blocks
```

### Locked decisions

| Topic | Decision |
|-------|----------|
| History layouts list | **No** — avoid confusion; use round detail as bridge |
| Course page summary | **Times played** at park (all layouts) + **last played** date |
| Course page best score | **No** combined best across layouts (misleading) |
| Stats button label | **Your stats** |
| Layout with zero rounds | Show in picker with empty state |
| Ace log | Dedicated route (scales better than modal) |
| Home teaser | Rounds, best ever, ace count, most-played layout |
| Post-round insights | Later slice; **default on**, Profile opt-out |
| Rating-based best round | Phase 6+ — out of scope |

### Global stats (History + Home)

**Show:** rounds played; best vs par with **layout name + date**, link to `best_round_id` round; ace count → ace log.

**Drop from UI:** global average vs par, global OB/round, lifetime birdie/par/bogey distribution strip.

### Course page (light touch)

- Compact line: e.g. **5 rounds here · last played 12 Mar**
- Button: **Your stats** → `/courses/[slug]/stats`
- Layout picker + Start unchanged

### Course stats screen

- Park-level header: total plays at course (optional layout play-count list to help pick)
- **Layout chooser** (same mental model as course detail)
- Per selected layout (when user has completed rounds):
  - Times played (this layout)
  - Best vs par (+ link to round)
  - Average vs par (this layout only)
  - Rates: birdie %, par %, bogey %, double+ %, OB % — **of holes played on this layout**
  - Score distribution strip (layout-scoped — meaningful here)
- Later (slice D): per-hole strong/weak spots on this layout

### Finished round detail (bridge)

On completed rounds, add context block:

- This round: vs par, OB holes, this-round-only distribution
- Vs layout history: new best / vs best / vs last round on same layout (when data exists)
- CTA: **All stats on [layout name]** → course stats screen with layout pre-selected

### Data layer (extend backbone — no rewrite)

Existing: `score_bucket()`, `player_round_stats` (one row per user per round).

**Add (migrations):**

| View / query | Purpose |
|--------------|---------|
| `player_layout_stats` | `GROUP BY layout_id` from completed `player_round_stats` — plays, best, avg vs par, bucket totals, OB rates |
| `player_course_stats` | `GROUP BY course` (via layout) — total plays at park, last played |
| `player_ace_log` | Rows where `strokes = 1` — hole #, layout, course, round_id, date |
| `player_layout_hole_stats` (slice D) | Per (user, layout, hole) bucket counts |

Extend `player_lifetime_stats` or replace UI usage: `best_round_id`, most-played `layout_id` + names for teaser. Remove surfaced `avg_vs_par` / distribution totals from global loader when slice A ships.

All aggregates stay in Postgres ([BLUEPRINT §2b/§8](BLUEPRINT.md)); `lib/rounds/load-player-stats.ts` remains the TS seam (extend, don't fan out JS).

### Implementation slices

| Slice | Scope | Done when |
|-------|--------|-----------|
| **A** | Reshape History global block; drop v1 noise; rich best round; ace log route; Home teaser (4 items); extend lifetime loader | **Done** — History + Home match spec; `/rounds/aces` lists aces with round links |
| **B** | `player_layout_stats` + `player_course_stats` views; `/courses/[slug]/stats` screen; course page summary + Your stats button | **Done** — stats from course page; layout chooser + per-layout headline stats |
| **C** | Finished round context block; compare to layout best / last round; link to course stats `?layout=` | Tapping History round shows context + path to full layout stats |
| **D** | `player_layout_hole_stats`; per-hole section on layout stats screen | User sees historical birdie/bogey rates per hole on a layout |
| **E** | Post-round insights on complete (opt-out in Profile) | Scorer sees one-time insights card after ending round; toggle in Profile |

**Build order:** A → B → C → D → E. One slice per chat.

### Out of scope (v2)

- Trends (last 5 vs previous 5) — wait for more round data
- Fairway %, C1 putting, etc. — after **advanced scoring** columns exist
- Rating-based best round — Phase 6
- Lifetime eagle journal (aces only for now)
- "Your layouts" list on History tab

### v1 → v2 UI debt

~~Current `history-stats-section.tsx` still shows v1 fields~~ — **Slice A done.** Global average, OB/round, and lifetime distribution removed from History + Home.


---

## Later / deferred

- **PWA:** Serwist + icons when install-to-homescreen matters.
- **Advanced scoring:** after Stats v2 slices A–B; opt-in per-round toggle; fairway hit, C1/C2 in reg (≤10 m / ≤20 m), C1/C2 putting, bullseye/parked (≤3 m); additive nullable `hole_scores` columns. **Input UX is the main risk** — keep casual rounds fast; toggle placement (setup vs mid-round) TBD when the slice starts.
- **Slice D-guest:** Anonymous round local-only → claim on signup (Option A below); acquisition lever, planned after advanced scoring.
- **Stats v2 (remaining):** slices C–E in [action plan](#stats-v2--action-plan) (round context, per-hole, post-round insights); trends deferred.
- **Phase 6:** Ratings, tournaments (`tournament_id` column reserved).
- Smart-ID / magic-link auth.
- **Geolocation / nearby sort:** **done** — all seeded courses have `lat`/`lng`; Profile toggle + browser permission
- **Courses map view:** optional follow-up on Play tab
- **Player course feedback:** report outdated/wrong layout data from app → creator review queue (no player edits to registry); see [Course registry](#course-registry)
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
| **D-courses** | Complete | JSON seeds, `seed:courses` → SQL migrations; national registry Jul 2026 (~209 layouts / ~182 parks); `match-seed-courses.ts` for split-venue review |
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

- Project ref: `gslzfwbrdbvmnjaxxnms` (Stockholm / `eu-north-1`)
- Per machine: `supabase login`, `supabase link --project-ref gslzfwbrdbvmnjaxxnms`

### Migrations

**38 files** in `supabase/migrations/` (through bulk course seed `20260709132448_*`, venue merge cleanup `20260709171600_*`). Run `npx supabase migration list` to compare local vs remote.

Tables in use: `profiles`, `courses`, `layouts`, `holes`, `rounds` (incl. optional `name`), `round_participants`, `round_invitations`, `hole_scores`. RLS on all.

**Stats views:** `player_round_stats` (per-round derived stats for current user), `player_lifetime_stats` (lifetime aggregate for v1 stats block). Classification via `score_bucket(strokes, par)`. Migration `20260708170000_player_stats.sql`.

**Realtime publication:** Enforced by `20260527190100_realtime_publication_membership.sql` (idempotent — adds any of `hole_scores`, `round_invitations`, `round_participants`, `rounds` that are not already in the publication).

Typegen: `npx supabase gen types typescript --linked > lib/database.types.ts`

### Key paths

| Area | Paths |
|------|--------|
| Scoring math | `lib/scoring/{types,stats}.ts` |
| Round actions | `lib/rounds/{hole-scores,unified-players,participant-labels,round-draft-actions,round-active-actions,invite-rows,round-status,load-player-stats}.ts` |
| Player stats | `lib/rounds/load-player-stats.ts`, `app/rounds/history-stats-section.tsx`, `components/home/stats-teaser.tsx`, `app/rounds/aces/`, `app/courses/[slug]/stats/`; views `player_round_stats`, `player_lifetime_stats`, `player_ace_log`, `player_course_stats`, `player_layout_stats`. **v2 next:** slice C–E — see [action plan](#stats-v2--action-plan) |
| Profiles | `lib/profiles/{format-display-name,upload-avatar,save-profile}.ts` |
| Round UI | `app/rounds/[roundId]/round-session.tsx`, `use-round-realtime.ts`, hooks, `components/*` (scorecard, draft setup deck, active scoring, results, completion) |
| Round display name | `lib/rounds/round-display-name.ts`, `draft-round-title-portal.tsx`, `create-round-form.tsx` |
| Draft setup UI | `draft-players-panel.tsx`, `draft-setup-deck.tsx`, `draft-starting-hole-field.tsx`, `lib/scoring/hole-order.ts` |
| Section headings | `lib/ui/section-heading.ts` |
| Hub / home | `app/page.tsx`, `components/home/*`, `lib/home/load-home-data.ts`, `lib/ui/{page-chrome,home-greeting}.ts` |
| App chrome | `components/layout/bottom-tab-bar.tsx`, `components/layout/app-chrome.tsx` |
| Courses browse | `app/courses/`, `lib/courses/`, `components/courses/course-search-dropdown.tsx`, `scripts/match-seed-courses.ts`, `supabase/seeds/courses/` |
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
- **Status** = reality, field MVP, priorities, product action plans, and reference appendix (change often).
- **Design patterns** = how screens should look and locked nav (change rarely). `UI-ROADMAP.md` was retired Jul 2026 — do not recreate it.
