# Discore — Status

> Living document: **what is true now** and **what's next**. Rules live in [BLUEPRINT.md](BLUEPRINT.md), how it fits together and why in [ARCHITECTURE.md](ARCHITECTURE.md), agent workflow in [CLAUDE.md](CLAUDE.md), screen patterns in [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md). Older plans and checklists are in git history.

---

## Handoff — read first

_Overwritten at the end of every session — describes now, not history (history: `git log`, merged PRs)._

- **Updated:** 2026-11-09 (PC session: landing page + forest band built, PR open)
- **State:** Hardening done; product direction in BLUEPRINT §1; instant scoring live (§3a). Course suggestions live: `/courses/suggest` (fix or new course, up to 6 photos; "Missing one?" in the course list and on an empty search), "Wrong info?" per hole during a round (edit par/length/notes in place), owner review at `/admin/suggestions` (`app_admins`, Copy for agent), thank-you card on Home, Telegram ping to the owner per new suggestion (trigger + `pg_net`; bot token and chat id in Supabase Vault as `telegram_bot_token` / `telegram_chat_id`; no secrets → no ping). Disc golf skill in `.claude/skills/disc-golf/`. Architecture walkthrough + decision records in `ARCHITECTURE.md`.
- **Decisions (owner, 2026-10-21):** "OB" stays one yes/no per hole. Unfinished hole = par + 4 (not reachable today). Suggestions: signed-in only; owner reviews by hand (no AI pre-reading); sender is thanked in the app, not by email.
- **Vercel previews work again (2026-10-22):** Supabase env vars were Production-only; now also set for Preview (as *Config*). Vercel CLI logged in and linked on the PC.
- **Decisions (owner, 2026-10-24):** stats plan in BLUEPRINT §8a (questions A/B/C+G/D/H/I+J; compare to your own usual; in-round history is the scorer's own and can be hidden). The **whole UI gets a redesign soon** — owner finds it too bland; approach (new design system?) not decided yet. Don't polish pixels on current screens before that.
- **Redesign (owner, 2026-10-24 → 2026-11-02):** direction **"C · Scorecard"** chosen, then refined in a second canvas round with the owner: Home, course page, draft setup, scoring screen, round sheet and finished round are drawn as the **"C2"** artboards on the private design canvas (claude.ai). Everything decided is written down in `DESIGN-PATTERNS.md` → Redesign brief — read that, not the canvas, to build. Key calls: the redesign changes the look, not the flows; casual rounds never rank players (play against yourself); progress line replaces the mini scorecard strip; ⋯ round sheet replaces the dropdown; scorecard = one sideways-scrolling row per player, Tot/± at the end.
- **Redesign in code (2026-11-02):** direction C tokens (`app/globals.css`, `font-display`), hidden `/design` page, and three screens in the new design. **Scoring:** progress line, hole note, table roster, wide −/+, "Next: <player>", ⋯ round sheet, new scorecard (play order, name pinned, Tot/± at the end); the signed-out trial got the same hole header and stepper. **Draft setup:** slim course line with ✕ → the same sheet (`round-sheet.tsx`) with Delete draft, big editable name, player status lines, starting hole with hint, fixed Start round deck. **Finished round:** Results (equal rows in play order, "New best" chip on your own row) → scorecard → "Your round" line + stats link (the dismissable insights card is gone; the moment shows once). **Course page:** back arrow, name, "Last played · Total rounds", map link + Your stats on one line, "Pick a layout" framed rows with a forest arrow square. **Home:** "discore" wordmark + "Tere, <name>", nearest course / round in progress as panel frames, a thin stats strip (Rounds · Best round · Throws), recent rounds as date · course · ± rows (lime when under par), tab bar with a lime marker; section headings use `font-display` everywhere; page titles use `font-display` everywhere; primary buttons lost the pill shape.
- **Stats in rounds (2026-11-02):** migration `player_hole_history` (SQL function, caller's own per-hole usual/best, optional excluded round; pgTAP in `supabase/tests/player_hole_history_test.sql`). Scoring screen shows "You: Usually 4 · best 3" (scorer's own, hidden by **Clean card**, which replaced "Hide running totals"). Finished round: "Where it went" (1–2 holes over your usual, needs 2+ earlier rounds on the hole). Home stats: the C2 strip with Rounds played · Total throws · Courses visited (owner's choice). **The owner must `npx supabase db push` before testing the preview.**
- **Courses list + History (2026-11-02):** drawn as C2 artboards with the owner, then built: divided rows, month groups, Best round / Aces boxes (the ace log is finally linked), player count per round. Page titles are 30 px display font everywhere.
- **Course stats, Profile, Sign in (2026-11-03):** drawn as C2 artboards, owner approved (sign-in: trial pitch dropped, Create an account as an outlined button), then built. Course stats = §8a A/B/C+G (trend chart, where you lose strokes, score mix) from existing views, no migration. Profile split into menu / `?view=edit` / `?view=password`; new **Clean card by default** switch (localStorage, `lib/rounds/clean-card-preference.ts`).
- **Review step (2026-11-03):** after the last hole the scorer sees "All holes played", the card (tap a hole to edit it, saving returns to the review), Totals, and **‹ Hole N** / **Confirm round** with a "Confirm the round?" popup (kept on purpose: scores lock). Ties / many players item closed, no work needed.
- **Trial round (2026-11-03):** drawn as C2 artboards (setup with starting hole, scoring, discard popup, review, finished with a Save this round box), owner approved, built on the signed-in round's components. Migration `20261103120000_claim_trial_starting_hole.sql`: `claim_trial` takes `p_starting_hole` (default 1, must be on the layout). **The owner must `npx supabase db push` before testing the preview.**
- **Suggestion form (2026-11-03):** drawn as C2 artboards (Suggest a course, Suggest a fix, Thanks), owner approved (baskets default 18, no "optional" labels, a photo is required for a new course). New course: name, "Use where you are now" (phone GPS, not photo GPS: iPhones strip it) or type the town, "Is it one of these?" for courses within 3 km, baskets stepper, a Course board slot + more photos, optional note. Migration `20261103130000_course_suggestions_location_baskets.sql`: `lat`/`lng`/`basket_count` columns, 6 photos, note optional for a new course, ping has a map link. **The owner must `npx supabase db push` before testing the preview.**
- **Admin suggestions (2026-11-03):** drawn as C2 artboards (New cards, Applied rows), owner approved, built. No migration.
- **Phone polish (2026-11-03):** owner notes from real use. Round header = course on one line, layout under it ("setting up" dropped; scoring and trial too). Setup lost "You · scorer", the starting-hole hint and the caption under Start round. Course page: Your stats on the back-arrow row. Home frames: course name 22 px, wraps to two lines.
- **Redesign done (2026-11-03):** every screen is in the C2 design. Small fixes from real use go straight to code; the canvas is not updated for those (`DESIGN-PATTERNS.md` is).
- **State-handling audit done (2026-11-03):** the verified plan was built in one code-only PR (no migration). Round page = one request; setup actions update from the write's reply; Realtime reloads only the changed table and reads round changes from the message; course page, course stats, Profile, Home and History load in one wave; tapping a layout skips the Auth call and the double render. Fixed on the way: observers saw other registered players as "Registered user (uuid)". `e2e/request-counts.spec.ts` guards the phone's request counts (ARCHITECTURE §4.10).
- **Next (owner, 2026-11-09), in this order:**
  1. **Landing page + forest band** — built in the open PR (designed with the owner on the canvas as "Landing 3" and "Home · forest band"; all decisions in DESIGN-PATTERNS → Forest band / Landing page / Home). Owner tests the preview (signed out and signed in; no migration), then merge. Later, not built: a signed-in user with **no rounds yet** sees How it works + the example under the start frame until the first finished round; desktop layout; forest status bar (theme colour) on these two screens.
  2. **Re-send a cancelled or declined invite** (Smaller debts). Finding: the insert fails on `unique (round_id, invited_user_id)`, but `round_invitations_update` already lets the scorer set status back to `pending`, so the fix is likely app-side (update the existing row to `pending`, clear `responded_at`) plus pgTAP proving the scorer can and the invitee can't. Check the invite search / UI treat the reset row as pending.
  3. **Stray `.` line in course `details`** (Smaller debts): in the Viimsi file **and** all three Järve layouts; remove it, seed migration, owner runs `npx supabase db push`.
  4. Later: `error.tsx` boundaries; the security review (owner does it on the PC, where Docker is).
- **Splash + logo (owner, 2026-11-09), not decided, not urgent:** splash shown only on a device's **first open** (remembered in the browser), never between pages, under a second. Owner likes **C · Scorecard row** most; does **not** want the lime-disc logo (A). Choosing a splash also means choosing the logo: the app has **no icon** yet (`app/manifest.ts` has no `icons`, no apple touch icon), so the home-screen icon is generic and Android may not offer install.
- **Design canvas for the above:** https://claude.ai/artifact/GDgZtsi8yLjcC6aNH1XGUY (private, owner's claude.ai account): Splash A/B/C, the logo each implies, Landing 1/2 (earlier drafts), **Landing 3** (built: no location / location on) and **Home · forest band** (built). Example scores and names there are made up.
- **Ace / eagle colours (owner, 2026-11-09):** ace should not look like a birdie or eagle. Proposal ace yellow `#FFE566`, eagle blue `#6FA6D9` (tokens `--ace`, `--eagle`), used only on the landing example so far. Next: move the scorecard, stats score mix and `/design` to them, after a colour-blind check (yellow vs lime).
- **Sign-in persistence (read from code, not tested on phones):** sessions last until sign-out (auth cookie max-age 400 days, access token refreshes hourly). To check: production session limits (dashboard → Authentication → Sessions); iPhone Safari may drop the login after ~7 days without a visit (script-set cookies); an iPhone home-screen icon has its own storage, so you sign in once more there and a Safari trial doesn't carry over.
- **MacBook set up (2026-10-24):** Node 24 + gh from official downloads, `.env.local` and `supabase link` point at production. npm 11 skipped postinstall scripts for `esbuild`, `unrs-resolver` (works anyway; decide later).
- **Small debts cleared (2026-10-26):** all server pages use `getClaims()`; `lib/` no longer imports from `app/` (shared row types in `lib/rounds/round-rows.ts`); `config.toml` uses `[local_smtp]`, empty seed step off.
- **Draft setup (owner, 2026-11-03):** hint under Add another player is "Players with an account get an invite. Others join as guests."; Delete draft deletes on tap (no popup), Abandon round keeps its confirmation (DESIGN-PATTERNS).
- **In flight:** PR `feat/landing-forest-band` (landing page + Home band). Dependabot PR #36 (minor and patch bumps) is still open.

---

## Roadmap

Ordered. The security and reliability items from an external code review (Oct 2026) are done.

1. **Presentation.** The design language is done (C2, every screen, 2026-11-03). Landing page built (Handoff → Next 1). Left: README with screenshots, what it does, and an architecture diagram.
2. **State-handling audit** — done (2026-11-03): page loads and setup actions wait less; see ARCHITECTURE §4.10.
3. **Stats build** — done (2026-11-02/03): every question in BLUEPRINT §8a is on screen, in the new design.
4. **Security review** (owner, 2026-11-03) — next; see Handoff → Next.
5. **Advanced scoring** — opt-in per round: fairway hit, C1/C2 in regulation, putting. Input UX is the main risk; keep casual rounds fast.
6. **Course content (ongoing)** — per-park seasonal updates via JSON; map PNGs; known gaps (Kõrvemaa PRO 18, Järve Talu "20x" to confirm).

Not planned: exports or integration with other platforms; competitions/ratings (Phase 6).

### Smaller debts

- A cancelled or declined invite can't be re-sent to the same person in the same round (`round_invitations` is unique on round + user; the insert errors).
- Unsynced scores only send while the round page is open (resumes on return); a fully offline app (service worker) is not built.
- Later, cheap: per-round par override (tee sign differs from course data); an "unfinished hole" option (par + 4).
- No `error.tsx` boundaries.
- 5 high **dev-only** npm vulnerabilities (eslint-config-next → micromatch → braces); wait for upstream.
- TypeScript 7 / other majors: Dependabot ignores them until typescript-eslint supports TS 7.
- Viimsi and Järve `details` start with a stray `.` line (likely a layout workaround); queued in Handoff → Next.

---

## What the app does (current)

**Shippable hobby app** for the Estonian disc golf community: pick a course, score a round with guests or invited friends, observers watch live, history and personal stats.

- **Home** (`app/page.tsx`): continue-round cards, pending invites (Realtime), near-you start, Your stats, recent rounds. Signed out: the landing page (`components/home/landing.tsx`): headline, example round, Start a round or the continue-trial card, How it works, Browse courses. Both sit under a forest band.
- **Play** (`app/courses/`): ~182 parks / ~209 layouts, search + distance sort; course detail with layout picker, About, optional map; `/courses/[slug]/stats` per-layout and per-hole stats; `/courses/suggest` for fixes and new courses.
- **Rounds** (`app/rounds/[roundId]/`): draft (guests by name, registered players by invite) → active scoring (scorer only, OB; each hole saves instantly and syncs in the background) → review step (edit any hole, then Confirm round) or abandon. Observers watch read-only via Realtime. Finished round: Results, scorecard, "Where it went", Your round line.
- **Trial** (`app/rounds/trial/`): signed-out players score in `localStorage` (`discore:local-trial`) with named guests and a starting hole, on the same screens as a signed-in round; a **completed** trial is claimed on sign-in/sign-up via `claim_trial` (idempotent on `guest_claim_id`). In-progress or corrupt trials are discarded at claim time.
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
