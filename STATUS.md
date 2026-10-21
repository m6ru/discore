# Discore — Status

> Living document: **what is true now** and **what's next**. Rules and architecture live in [BLUEPRINT.md](BLUEPRINT.md), agent workflow in [CLAUDE.md](CLAUDE.md), screen patterns in [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md). Older plans and checklists are in git history.

---

## Handoff — read first

_Overwritten at the end of every session — describes now, not history (history: `git log`, merged PRs)._

- **Updated:** 2026-10-21
- **State:** Hardening pass done (RLS + integrity, DB/E2E tests, CI, seed pipeline, atomic RPCs). Production has every migration in the repo. Page overscroll bounce disabled (accidental pull-to-refresh on iPhone/Brave while scoring).
- **Next:** Product direction talk (audience, connectivity/offline scoring, course scope, scorer model, export). Scoring waits for the server on every hole save, which lags on weak signal — likely to move up the roadmap. Record the outcome in BLUEPRINT §1 and reorder the roadmap.
- **In flight:** nothing.

---

## Roadmap

Ordered. The security and reliability items from an external code review (Oct 2026) are done.

1. **Architecture docs.** Walkthrough + diagram, data flow of a round (draft → active → complete, Realtime to observers), short decision records: single-scorer model, RLS as authorization, local trial + claim, seed JSON as source of truth, par snapshot, RPCs for atomic writes.
2. **Presentation.** Design language (colors, type, components) with a proper design pass; landing page for visitors; README with screenshots, what it does, and an architecture diagram.
3. **State-handling audit.** Review left: some flows do several browser ↔ database round trips. Claim and accept are fixed; audit the rest (draft setup, round page loads, stats pages) for chatty or sequential requests.
4. **Stats UX rethink** — concept + UI across Home / History / course stats / finished round. Talk before pixels.
5. **Advanced scoring** — opt-in per round: fairway hit, C1/C2 in regulation, putting. Input UX is the main risk; keep casual rounds fast.
6. **Course content (ongoing)** — per-park seasonal updates via JSON; map PNGs; known gaps (Kõrvemaa PRO 18, Järve Talu "20x" to confirm).

### Smaller debts

- `middleware.ts` → `proxy.ts` (Next 16 deprecation; auth-sensitive, isolated change).
- `getUser()` (network round trip) still used in `app/rounds/[roundId]/page.tsx`, `app/rounds/new/page.tsx`, `app/courses/[slug]/stats/page.tsx`; tab pages use `getClaims()`.
- Raw database error text reaches users in toasts (e.g. `Participant add failed: … code=…`); map to friendly messages.
- No `error.tsx` boundaries.
- `app/rounds/trial/trial-session.tsx` (~740 lines) duplicates much of the signed-in scoring UI.
- `lib/rounds/round-active-actions.ts` imports from `app/` (wrong direction).
- 5 high **dev-only** npm vulnerabilities (eslint-config-next → micromatch → braces); wait for upstream.
- `supabase/config.toml`: `[inbucket]` deprecated → `[local_smtp]`; missing `seed.sql` path warning.
- TypeScript 7 / other majors: Dependabot ignores them until typescript-eslint supports TS 7.
- Viimsi `details` starts with a stray `.` line (likely a layout workaround); fix during the design pass.

---

## What the app does (current)

**Shippable hobby app** for the Estonian disc golf community: pick a course, score a round with guests or invited friends, observers watch live, history and personal stats.

- **Home** (`app/page.tsx`): continue-round cards, pending invites (Realtime), near-you start, Your stats, recent rounds. Signed out: play-first launchpad and continue card for a local trial.
- **Play** (`app/courses/`): ~182 parks / ~209 layouts, search + distance sort; course detail with layout picker, About, optional map; `/courses/[slug]/stats` per-layout and per-hole stats.
- **Rounds** (`app/rounds/[roundId]/`): draft (guests by name, registered players by invite) → active scoring (scorer only, save per hole, OB) → complete or abandon. Observers watch read-only via Realtime. Finished round: scorecard, pool results, one-time insights card.
- **Trial** (`app/rounds/trial/`): signed-out players score in `localStorage` (`discore:local-trial`) with named guests; a **completed** trial is claimed on sign-in/sign-up via `claim_trial` (idempotent on `guest_claim_id`). In-progress or corrupt trials are discarded at claim time.
- **History** (`app/rounds/`): stats panel + round list; ace log at `/rounds/aces`.
- **Profile** (`app/auth/`): sign in/up (first + last name required → `profiles.display_name`), details, preferences.

### Data model in one paragraph

`courses` → `layouts` → `holes` (read-only catalog, public). A `round` has one `scorer_id`, a layout, and a status (`draft` → `active` → `completed` / `abandoned`, enforced by trigger). `round_participants` are either registered users (only via an accepted `round_invitations` row) or `guest_name`s. `hole_scores` (one per participant × hole, strokes 1–25, `par` snapshot) are written only by the scorer while the round is active. Stats are Postgres views with `security_invoker` (`player_round_stats`, `player_lifetime_stats`, `player_ace_log`, `player_course_stats`, `player_layout_stats`, `player_layout_hole_stats`).

### Constraints worth knowing

- One `active` round per scorer (`rounds_one_active_per_scorer_idx`).
- A round can be deleted only while it has no scores; layouts/holes with history can't be deleted (`ON DELETE RESTRICT`) — retire with `is_active = false`.
- Realtime publication: `hole_scores`, `round_invitations`, `round_participants`, `rounds`.
- Any signed-in user can read `profiles` (name, city, birth year, gender, avatar) for invite search; email stays in Auth.

### Locked product decisions (stats)

No combined best score across layouts; course page shows last played + total rounds; stats entry is a quiet "Your stats" link; ace log is its own route; post-round insights are on by default, opt-out in Profile, shown once after completing.

---

## Reference

### Key paths

| Area | Paths |
|---|---|
| Scoring math (pure, tested) | `lib/scoring/` |
| Supabase clients | `lib/supabase/{client,server,middleware}.ts`, root `middleware.ts` |
| Round UI | `app/rounds/[roundId]/round-session.tsx`, `hooks/`, `components/` |
| Round writes | `lib/rounds/round-draft-actions.ts`, `round-active-actions.ts`, `hole-scores.ts` |
| Trial + claim | `lib/local-round.ts`, `app/rounds/trial/` |
| Stats loaders | `lib/rounds/load-player-stats.ts`, `components/stats/` |
| Home | `app/page.tsx`, `components/home/`, `lib/home/load-home-data.ts` |
| Courses + seed pipeline | `app/courses/`, `lib/courses/`, `scripts/seed-courses.ts`, `supabase/seeds/` |
| Database | `supabase/migrations/`, tests in `supabase/tests/` |
| E2E | `e2e/`, `playwright.config.ts` |
| CI | `.github/workflows/ci.yml`, `.github/dependabot.yml` |

### Environment

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not the deprecated `ANON_KEY`).
- Supabase project ref `gslzfwbrdbvmnjaxxnms` (Stockholm, `eu-north-1`). Hosting: Vercel (preview per PR, production from `main`).
