# Discore — Technical Master Blueprint

---

## 1. Project Vision

**Core objective:** Browser-based PWA for disc golf score tracking. Mobile-first UI, but online connection is required — offline play is not a current goal.

**Target:** Start as a hobby/portfolio project for a local Estonian disc golf community. Architecture must support a natural path to a public, scalable product if community adoption warrants it — without rewrites.

**Data source:** Course and layout data is provided and maintained by the app creator. The initial dataset will be sourced from [discgolfirajad.ee](https://discgolfirajad.ee). Users never create or edit course data.

**Product focus:** Discore's value is in the parts a single player controls — **fast, lag-free scoring**, a **clean mobile UI**, and **excellent personal stats** — plus a **frictionless path to try it** (guest scoring today, anonymous scoring later). Advanced stats cover the metrics serious players expect (see §5). Casual/practice scoring for a local community is the beachhead; competitions and ratings come later (Phase 6), only if adoption warrants.

---

## 2. Technical Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router |
| Styling | Tailwind CSS |
| Language | TypeScript — all application source files (in `app/`, `lib/`, `components/`) must be `.ts` / `.tsx`. No `any` in `/lib/scoring`. Tooling config files (`eslint.config.mjs`, `postcss.config.mjs`, `next.config.ts`, etc.) follow their own tool's conventions and are exempt. |
| Backend | Supabase (PostgreSQL) — Auth + Realtime |
| Package manager | npm |
| Local dev | Supabase CLI + `.env.example` for secret management |
| PWA | `serwist` — service worker lifecycle when Phase 4 configures it (dependency may exist before wiring). No offline sync required. |
| UI primitives | `shadcn/ui` (Radix UI + Tailwind, code copied into `components/ui/`). Theme via CSS variables in `app/globals.css`. The scorecard table stays bespoke. |
| Icons | `lucide-react` |

---

## 2a. Code simplicity (non-negotiable)

Discore is a **one-person hobby app** for fast on-course scoring — not an enterprise platform. Code must stay **simple, short, and obvious**.

**Think before building.** State the user-facing behaviour in one sentence before adding files. If the feature fits in one screen component, keep it there.

**Default placement**
- UI + screen logic → `app/…` client component for that screen
- Server fetch / actions → `lib/rounds`, `lib/profiles`, or existing loaders
- Extract to `lib/` only when **two or more screens** share the same logic, or when pure math must be tested (`/lib/scoring` is the model — not every helper)

**Do not**
- Create a new file per tiny helper, hook, or preference
- Add `lib/preferences/`, micro-hooks, or “utils” folders for one-off features
- Add unit tests for trivial formatting, sorting, or UI glue unless explicitly requested
- Build for hypothetical reuse, “clean architecture”, or large-team workflows

**Prefer**
- One readable client file (~150–250 lines) over five files at ~40 lines each
- Inline small helpers at the bottom of the screen file
- Reuse existing patterns in the screen you are touching (e.g. `/rounds/[roundId]`, `/courses/courses-list.tsx`)

**Speed matters.** Scorers use this on a phone between throws. Fewer layers = faster to ship and faster to debug.

**Example (courses):** Sorting by distance + geolocation on Play tab belong in `courses-list.tsx` plus at most one shared module for `localStorage` keys used from Profile — not a spread of hooks and display libraries.

---

## 2b. Performance & data access (non-negotiable)

Navigation speed is a product feature — scorers are on a phone, often on mobile data. Keep these rules:

- **Every server-fetching route needs a `loading.tsx` (or a `Suspense` boundary)** so a tab tap shows an instant shell instead of blocking on the server render. Keep the root layout static (no `cookies()` / `getUser()` in a layout) so those fallbacks render immediately.
- **Auth reads:** pages / Server Components read the session via `supabase.auth.getClaims()` — it verifies the JWT locally (no Auth round-trip) when the project uses asymmetric signing keys, and `middleware.ts` has already refreshed the session. Only `middleware.ts` calls `getUser()`. Never add a second `getUser()` per navigation.
- **Aggregates at scale:** compute per-round / per-player stats in Postgres (a view or RPC), not by pulling raw `hole_scores` into JS, once result sets grow past a handful of rounds. `lib/rounds/round-score-summary.ts` is the shared seam to swap when Phase 5 stats land.
- **Round route exception:** `/rounds/[roundId]` is intentionally decomposed into hooks + components — it is the most complex screen. This is the sanctioned exception to §2a's "prefer one screen file"; do not cite it to justify file sprawl elsewhere. It works well and is field-tested, so change it **carefully and deliberately** — but it is **not frozen**: additions like advanced scoring inputs are expected. The "don't regress it" rule protects behaviour, not the code from ever changing.

---

## 3. Architecture: Single-Source-of-Truth Data Flow

One registered user per round is the **Scorer** (the round creator). All other participants are **Observers**.

- The **Scorer** is the sole write authority for all `hole_scores` in the round. Writes use **direct, online-first** Supabase calls from the client (see Section 3a below).
- **Observers** (registered users who accepted a round invitation and appear in `round_participants`) are read-only. They receive live updates via Supabase Realtime subscriptions.
- **Guests** (unregistered players added by name) are passive entries — they have no device presence and receive no updates.
- Each round stores a `scorer_id` (FK → `profiles`) as the enforced write authority.

This one-way data flow must be reflected in RLS policies and client architecture.

### 3a. Scorer writes (online-first)

The app targets **reliable scoring while connected**. Disc golf courses can have brief dead spots; the model is **not** hardcore offline sync — it is **wait for the server, then proceed**, with **local draft state** kept in React so a failed save does not wipe the scorer’s inputs.

**Write flow**

1. Scorer saves the current hole → the client **awaits** a batched `hole_scores` **upsert** (all players on that hole) via the browser Supabase client.
2. **Success** → UI updates from the returned rows (and/or Realtime). The scorer advances to the next hole or completes the round.
3. **Failure** (no network, RLS, validation, etc.) → an explicit error message is shown; **strokes / OB drafts stay on screen** so the scorer can retry when connectivity returns. No background FIFO queue, no `pending:` optimistic client ids for persistence.

**Observers**

- Realtime still delivers `hole_scores` changes after rows land in Postgres (unchanged).

**This is not offline-first.** Starting a round, loading layouts, and saving scores all **require** a working session and network for the write path. Brief outages are tolerated only in the sense that **work in progress remains editable** until a save succeeds.

**Code placement**

- Scoring math and shared helpers stay in `/lib/scoring` as typed, framework-agnostic TS where practical. The write orchestration lives in the round UI; keep **no `any`** in `/lib/scoring`.

---

## 4. Supabase Client Architecture

Two strictly separate client instances are required due to Next.js App Router's dual server/browser execution environment.

### Browser client — `lib/supabase/client.ts`
- Used exclusively inside `"use client"` components.
- Manages auth tokens via browser cookies.
- Use for: sign-in/out UI, Realtime subscriptions, client-side data fetching.
- Realtime must be enabled to support the Observer subscription model.

### Server client — `lib/supabase/server.ts`
- Used exclusively in Server Components, Server Actions, and API route handlers.
- Must be implemented using `@supabase/ssr` so auth state is read from the incoming request's cookie store.
- **Must be exported as a factory function** (e.g. `createServerClient()`), never as a module-level singleton. A singleton shares cookie state across requests, causing silent RLS failures.
- Required for all server-side data fetching to ensure RLS is correctly enforced.

> **Rule:** Never import the server client into a `"use client"` component. Never import the browser client into a Server Component. Mixing these causes silent RLS failures or runtime errors.

---

## 5. Database Design Principles

- **RLS from day one.** Row Level Security must be enabled on every table at creation. It is not retrofitted later.
- **Read-only course registry.** Users cannot create or modify courses or layouts. The system operates on a creator-maintained registry seeded from discgolfirajad.ee.
- **Distance unit:** Metres only. UI may display a converted feet value but the database stores metres exclusively. Never store both.

### Table requirements

**profiles**
- User data linked to Supabase Auth (`auth.users`).
- Fields: display name, avatar URL, first/last name, gender, birth year, city (account fields as implemented). No per-user visibility flag — any authenticated user may read profiles for invite/search.
- **First and last name are required at signup.** The signup form collects them and forwards them via `supabase.auth.signUp({ options: { data: { first_name, last_name } } })`. The `handle_new_user` trigger reads `raw_user_meta_data` and composes `display_name` as `"<first> <last>"`. Email is never written to `profiles` — if the metadata is missing (e.g. a user created via the Supabase dashboard), `display_name` falls back to `"Player <8-char-uuid>"` and the user must fill in their name from the account screen before they appear in invite/search.

**courses**
- Creator-seeded, read-only to users.
- Fields: name, location (city/region), GPS coordinates, terrain type, difficulty tier, source URL.

**layouts** *(many-to-one → courses)*
- Each course has one or more layouts.
- Fields: layout name, total par, total distance (metres), active/archived status.

**holes** *(many-to-one → layouts)*
- Fields: hole number, par, distance (metres), notes.

**rounds**
- Fields: `scorer_id` (FK → profiles), `layout_id` (FK → layouts), `started_at`, `completed_at` (nullable), `status` (`draft` / `active` / `completed` / `abandoned`).
- Single-round only for MVP. Tournament/multi-round grouping is a future consideration — reserve a nullable `tournament_id` column to keep the option open without building the feature.

**round_participants**
- Junction table linking players to a round.
- Fields: `round_id`, `user_id` (nullable FK → profiles), `guest_name` (nullable text), `joined_at`.
- Constraint: exactly one of `user_id` or `guest_name` must be non-null (enforced via CHECK constraint).
- Purpose: registered users see this round on their profile dashboard; guests are name-only entries with no app presence.
- RLS: a registered user can see all `round_participants` rows for rounds they are part of.

**hole_scores**
- Fields: `round_id`, `participant_id` (FK → round_participants), `hole_id` (FK → holes), `strokes`, `ob` (boolean, out-of-bounds flag; `false` when none), `fairway_hit` (boolean, nullable — reserved for future advanced-stats slice).
- `putts` was removed from MVP scoring. **Advanced scoring** is the planned next major slice (see STATUS): richer per-hole capture behind an **explicit per-round opt-in toggle** so casual rounds stay a fast 2-tap-per-hole flow. Planned metric set: **fairway hit**, **Circle 1 in regulation** (≤10 m), **Circle 2 in regulation** (≤20 m), **C1 putting** (make inside 10 m), **C2 putting** (make 10–20 m), and **bullseye / parked** (lands inside 3 m of the basket); `ob` is already captured. New nullable columns are added when that slice lands — schema stays additive, casual rounds leave them null.
- Write RLS: only the `scorer_id` of the parent round may insert or update rows in this table.

---

## 6. Round Participation Flow

Pending invites are stored in `round_invitations` (authenticated users only). Guests skip invitations and go straight into `round_participants`.

1. Scorer creates a round in `draft`.
2. Scorer invites registered users and/or adds guests in setup.
3. Invitees accept or decline from the home hub (pending invites surfaced there).
4. Accepted users are added to `round_participants` with their `user_id`; guests are inserted with `guest_name`.
5. Scorer starts the round only after setup is resolved (no pending invites).

---

## 7. Security Requirements

### RLS policy rules (enforced at schema creation — Phase 2)

Every table must have RLS enabled. The default posture is **deny all**. Policies grant only the minimum access required. The following policies must be implemented explicitly — do not rely on defaults.

| Table | Read | Insert | Update | Delete |
|---|---|---|---|---|
| `profiles` | Any authenticated user. | On signup via auth trigger only. | Own row only. | Not permitted. |
| `courses` | Anyone authenticated. | Creator (service role) only. | Creator (service role) only. | Not permitted. |
| `layouts` | Anyone authenticated. | Service role only. | Service role only. | Not permitted. |
| `holes` | Anyone authenticated. | Service role only. | Service role only. | Not permitted. |
| `rounds` | Participant in the round (`round_participants`) or Scorer. | Authenticated users (own rounds). | Scorer only (`scorer_id = auth.uid()`). | Not permitted. |
| `round_participants` | Members of the same round only. | Scorer adds guests/participants in `draft`, or invited user accepts invite while round is `draft`. | Not permitted. | Not permitted. |
| `hole_scores` | Members of the same round only. | Not permitted directly — Scorer writes via `rounds.scorer_id = auth.uid()` check. | Scorer of the parent round only (`rounds.scorer_id = auth.uid()`). | Not permitted. |

### Critical policy implementation notes

- **`hole_scores` write policy must join to `rounds`** — the policy must verify `auth.uid() = (SELECT scorer_id FROM rounds WHERE id = hole_scores.round_id)`. Never trust a `scorer_id` value sent from the client.
- **`profiles` read scope** — `SELECT` for `authenticated` only (`using (true)`). Unauthenticated requests must return zero rows. Users may only `UPDATE` their own row. Profile rows are discoverable for invite/search; **never store email on `profiles`** — `display_name` is composed from `first_name`/`last_name` at signup, with a non-PII `"Player <uuid>"` fallback if metadata is missing.
- **No client-supplied roles** — there is no admin role in the MVP. No user should be able to modify any field that elevates their own permissions. If a `role` column is added in future, it must only be writable via a server-side trigger or service role, never via the client.
- **Publishable key is public by design** — but with the above RLS policies in place, an unauthenticated request using the publishable key must return zero rows from every table.

---

## 8. Scoring Logic

- All scoring functions live in `/lib/scoring`.
- **MVP:** Raw score tracking only — strokes relative to par (`+1`, `-2`, `E`, etc.) and cumulative totals.
- **Future:** The module structure and types must support plugging in weighted ratings and statistical analysis later, without restructuring. No `any` permitted in this directory.
- **Phase 5 stats aggregation:** history/stats aggregates (rounds played, best round, distribution, OB count) are computed in Postgres via a view or RPC — not by reducing raw `hole_scores` in JS. `lib/rounds/round-score-summary.ts` is today's per-round seam and the intended swap point (see §2b).
- After schema is finalised, generate typed DB interfaces: `supabase gen types typescript` → `/lib/database.types.ts`. Use these types for all Supabase queries.

---

## 9. Development Phases

| Phase | Focus | Goal |
|---|---|---|
| **1** | Infrastructure & environment | Next.js + Supabase clients + PWA skeleton |
| **2** | Schema & seeding | All tables, RLS policies, seed local courses/layouts/holes |
| **3** | Core scoring | Auth, rounds, invite flow, score holes, Realtime for observers |
| **4** | PWA & polish | shadcn/ui primitives + emerald theme; `AlertDialog` replaces `window.confirm`; Sonner for transient feedback; mobile UX pass on round screen (sticky save, 44 px touch targets, `Switch` for OB); Serwist + icons + manifest; install-to-home-screen verified |
| **5** | History & stats | Round history per user, basic per-player statistics |
| **6+** | Ratings & competitions | Weighted ratings, tournament structures — only if community adoption warrants |

**Principle:** Do not build Phase 6 infrastructure during Phase 1–3. "Schema-compatible" means capturing the right fields now (done). It does not mean implementing the rating system now.
