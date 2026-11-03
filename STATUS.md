# Discore — Status

> Living document: **what is true now** and **what's next**. Rules live in [BLUEPRINT.md](BLUEPRINT.md), how it fits together and why in [ARCHITECTURE.md](ARCHITECTURE.md), agent workflow in [CLAUDE.md](CLAUDE.md), screen patterns in [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md). Older plans and checklists are in git history.

---

## Handoff — read first

_Overwritten at the end of every session — describes now, not history (history: `git log`, merged PRs)._

- **Updated:** 2026-11-03
- **State:** Hardening done; product direction in BLUEPRINT §1; instant scoring live (§3a). Course suggestions live: `/courses/suggest` (fix or new course, note + up to 3 photos; "Missing one?" in the course list and on an empty search), "Wrong info?" per hole during a round (edit par/length/notes in place), owner review at `/admin/suggestions` (`app_admins`, Copy for agent), thank-you card on Home, Telegram ping to the owner per new suggestion (trigger + `pg_net`; bot token and chat id in Supabase Vault as `telegram_bot_token` / `telegram_chat_id`; no secrets → no ping). Disc golf skill in `.claude/skills/disc-golf/`. Architecture walkthrough + decision records in `ARCHITECTURE.md`.
- **Decisions (owner, 2026-10-21):** "OB" stays one yes/no per hole. Unfinished hole = par + 4 (not reachable today). Suggestions: signed-in only; owner reviews by hand (no AI pre-reading); sender is thanked in the app, not by email.
- **Vercel previews work again (2026-10-22):** Supabase env vars were Production-only; now also set for Preview (as *Config*). Vercel CLI logged in and linked on the PC.
- **Decisions (owner, 2026-10-24):** stats plan in BLUEPRINT §8a (questions A/B/C+G/D/H/I+J; compare to your own usual; in-round history is the scorer's own and can be hidden). The **whole UI gets a redesign soon** — owner finds it too bland; approach (new design system?) not decided yet. Don't polish pixels on current screens before that.
- **Redesign (owner, 2026-10-24 → 2026-11-02):** direction **"C · Scorecard"** chosen, then refined in a second canvas round with the owner: Home, course page, draft setup, scoring screen, round sheet and finished round are drawn as the **"C2"** artboards on the private design canvas (claude.ai). Everything decided is written down in `DESIGN-PATTERNS.md` → Redesign brief — read that, not the canvas, to build. Key calls: the redesign changes the look, not the flows; casual rounds never rank players (play against yourself); progress line replaces the mini scorecard strip; ⋯ round sheet replaces the dropdown; scorecard = one sideways-scrolling row per player, Tot/± at the end.
- **Redesign in code (2026-11-02):** direction C tokens (`app/globals.css`, `font-display`), hidden `/design` page, and three screens in the new design. **Scoring:** progress line, hole note, table roster, wide −/+, "Next: <player>", ⋯ round sheet, new scorecard (play order, name pinned, Tot/± at the end); the signed-out trial got the same hole header and stepper. **Draft setup:** slim course line with ✕ → the same sheet (`round-sheet.tsx`) with Delete draft, big editable name, player status lines, starting hole with hint, fixed Start round deck. **Finished round:** Results (equal rows in play order, "New best" chip on your own row) → scorecard → "Your round" line + stats link (the dismissable insights card is gone; the moment shows once). **Course page:** back arrow, name, "Last played · Total rounds", map link + Your stats on one line, "Pick a layout" framed rows with a forest arrow square. **Home:** "discore" wordmark + "Tere, <name>", nearest course / round in progress as panel frames, a thin stats strip (Rounds · Best round · Throws), recent rounds as date · course · ± rows (lime when under par), tab bar with a lime marker; section headings use `font-display` everywhere; page titles use `font-display` everywhere; primary buttons lost the pill shape.
- **Stats in rounds (2026-11-02):** migration `player_hole_history` (SQL function, caller's own per-hole usual/best, optional excluded round; pgTAP in `supabase/tests/player_hole_history_test.sql`). Scoring screen shows "You: Usually 4 · best 3" (scorer's own, hidden by **Clean card**, which replaced "Hide running totals"). Finished round: "Where it went" (1–2 holes over your usual, needs 2+ earlier rounds on the hole). Home stats: the C2 strip with Rounds played · Total throws · Courses visited (owner's choice). **The owner must `npx supabase db push` before testing the preview.**
- **Courses list + History (2026-11-02):** drawn as C2 artboards with the owner, then built: divided rows, month groups, Best round / Aces boxes (the ace log is finally linked), player count per round. Page titles are 30 px display font everywhere.
- **Course stats, Profile, Sign in (2026-11-03):** drawn as C2 artboards, owner approved (sign-in: trial pitch dropped, Create an account as an outlined button), then built. Course stats = §8a A/B/C+G (trend chart, where you lose strokes, score mix) from existing views, no migration. Profile split into menu / `?view=edit` / `?view=password`; new **Clean card by default** switch (localStorage, `lib/rounds/clean-card-preference.ts`).
- **Review step (2026-11-03):** after the last hole the scorer sees "All holes played", the card (tap a hole to edit it, saving returns to the review), Totals, and **‹ Hole N** / **Confirm round** with a "Confirm the round?" popup (kept on purpose: scores lock). Ties / many players item closed, no work needed.
- **Next:** every screen and step from the brief is in direction C. Smaller screens not drawn yet: course suggestion form, admin suggestions, trial round setup (the trial still ends with its own "Complete round" button).
- **MacBook set up (2026-10-24):** Node 24 + gh from official downloads, `.env.local` and `supabase link` point at production. npm 11 skipped postinstall scripts for `esbuild`, `unrs-resolver` (works anyway; decide later).
- **Small debts cleared (2026-10-26):** all server pages use `getClaims()`; `lib/` no longer imports from `app/` (shared row types in `lib/rounds/round-rows.ts`); `config.toml` uses `[local_smtp]`, empty seed step off.
- **In flight:** nothing.

---

## Roadmap

Ordered. The security and reliability items from an external code review (Oct 2026) are done.

1. **Presentation.** Design language (colors, type, components) with a proper design pass; landing page for visitors; README with screenshots, what it does, and an architecture diagram.
2. **State-handling audit.** Some flows do several browser ↔ database round trips. Claim and accept are fixed; audit the rest (draft setup, round page loads, stats pages) for chatty or sequential requests.
3. **Stats build** — concept decided (BLUEPRINT §8a, 2026-10-24). Build it **in the new design** (after item 1), one screen at a time; start with the finished-round summary, then the scoring-screen line + its opt-out, then course stats, then Home/History.
4. **Advanced scoring** — opt-in per round: fairway hit, C1/C2 in regulation, putting. Input UX is the main risk; keep casual rounds fast.
5. **Course content (ongoing)** — per-park seasonal updates via JSON; map PNGs; known gaps (Kõrvemaa PRO 18, Järve Talu "20x" to confirm).

Not planned: exports or integration with other platforms; competitions/ratings (Phase 6).

### Smaller debts

- Unsynced scores only send while the round page is open (resumes on return); a fully offline app (service worker) is not built.
- Later, cheap: per-round par override (tee sign differs from course data); an "unfinished hole" option (par + 4).
- No `error.tsx` boundaries.
- `app/rounds/trial/trial-session.tsx` (~740 lines) duplicates much of the signed-in scoring UI.
- 5 high **dev-only** npm vulnerabilities (eslint-config-next → micromatch → braces); wait for upstream.
- TypeScript 7 / other majors: Dependabot ignores them until typescript-eslint supports TS 7.
- Viimsi `details` starts with a stray `.` line (likely a layout workaround); fix during the design pass.

---

## What the app does (current)

**Shippable hobby app** for the Estonian disc golf community: pick a course, score a round with guests or invited friends, observers watch live, history and personal stats.

- **Home** (`app/page.tsx`): continue-round cards, pending invites (Realtime), near-you start, Your stats, recent rounds. Signed out: play-first launchpad and continue card for a local trial.
- **Play** (`app/courses/`): ~182 parks / ~209 layouts, search + distance sort; course detail with layout picker, About, optional map; `/courses/[slug]/stats` per-layout and per-hole stats.
- **Rounds** (`app/rounds/[roundId]/`): draft (guests by name, registered players by invite) → active scoring (scorer only, OB; each hole saves instantly and syncs in the background) → complete or abandon. Observers watch read-only via Realtime. Finished round: scorecard, pool results, one-time insights card.
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

The stats plan (what each screen shows and why) is BLUEPRINT §8a. Still true from earlier: no combined best score across layouts; ace log is its own route; post-round insights are on by default, opt-out in Profile, shown once after completing.

---

## Reference

### Key paths

| Area | Paths |
|---|---|
| Scoring math (pure, tested) | `lib/scoring/` |
| Supabase clients | `lib/supabase/{client,server,proxy}.ts`, root `proxy.ts` |
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
