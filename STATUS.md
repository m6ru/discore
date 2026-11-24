# discbook — Status (repo: discore)

> Living document: **what is true now** and **what's next**. Rules live in [BLUEPRINT.md](BLUEPRINT.md), how it fits together and why in [ARCHITECTURE.md](ARCHITECTURE.md), agent workflow in [CLAUDE.md](CLAUDE.md), screen patterns in [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md). Older plans and checklists are in git history.

---

## Handoff — read first

_Overwritten at the end of every session — describes now, not history (history: `git log`, merged PRs)._

- **Updated:** 2026-11-23 (PC session).
- **State:** everything merged, nothing in flight, no open security alerts. Every screen is in the C2 design (`DESIGN-PATTERNS.md`). Live: scoring with instant save, stats (BLUEPRINT §8a), course suggestions with admin review and a Telegram ping, signed-out trial claimed on sign-up, landing page, app icon and first-open splash.
- **Latest (2026-11-23):** invite re-send while a draft (#65), error pages (#67), trial Players as two rows that open small forms (#75–#77), first names on the scoring deck (#70), app icon + splash (#73, #74), dependency updates (#71, #72, #78). Details are in the PRs.
- **Email confirmation (2026-11-24), merged (#81):** the default confirm link failed with "PKCE code verifier not found" when opened in another browser than the sign-up (home-screen app, mail app, another device). `/auth/confirm` verifies a `token_hash` instead and works anywhere, but only once the template `supabase/templates/confirmation.html` is pasted in Supabase, and Supabase allows editing templates only with custom SMTP (own domain). Until then old links fail softly ("sign in below"). Sign-up shows a **Check your email** screen. Tab bar 56 px + light ground to the screen height merged (#80).
- **Home → Get started (2026-11-24), merged (#83):** "Check history" replaced by **Add discbook to your home screen** (install dialog on Android, steps sheet on iPhone; hidden on computers and in the home-screen app). Owner checks on the phone; the Android dialog can only be tested on a real Android phone.
- **Forgot password (2026-11-24), merged (#84):** Sign in → Forgot password? → reset email → `/auth/confirm` (`type=recovery`) → Set a new password (the Change password view). Template `supabase/templates/recovery.html` waits for custom SMTP like the confirm one (LAUNCH-PLAN step 5); until then the default email links via `/auth/callback` (same browser only). Too many emails shows a plain "Try again in an hour".
- **Renamed to discbook (owner, 2026-11-24), merged (#88):** an old disc golf scorecard app from an Estonian company already uses "Discore" (App Store), and discore.com/.app/.eu are taken, so the app is now **discbook** (lower case) everywhere players see it: wordmarks, splash, title, home-screen name, icons (now **db**, with discbook written under it by the phone; in a PR), share image, email templates. Kept on purpose: the repo, Vercel and Supabase project names, `localStorage` keys (`discore-*`, renaming them would reset players' settings and trials) and type names. Domain to buy: `discbook.ee` (LAUNCH-PLAN). Phones keep the old icon until it is removed and added again.
- **Link preview (2026-11-24), merged (#86):** title and home-screen name (now `discbook`), a real description, and a share image (`app/opengraph-image.png`, drawn by `scripts/generate-icons.ts`). Later: course links with the course name in the preview.
- **Next: [LAUNCH-PLAN.md](LAUNCH-PLAN.md)** (owner, 2026-11-24: doing it soon, don't lose it). Domain `discbook.ee` → Vercel + Supabase URLs → Resend as custom SMTP → paste the confirm template → email rate limit 2/h → 100/h → test as a new player; then Forgot password, a privacy page and Delete account (Claude, one PR each). Today the app can send only **2 emails an hour**.
- **Next:** pick with the owner. Candidates: per-round par override, advanced scoring (Roadmap 5), README with screenshots. Owner's own: the security review on the PC; a margins/paddings pass screen by screen when they want it.
- **Phones:** a home-screen icon added before #73 keeps the old icon and status bar until removed and added again. Sign-in persistence is read from code, not tested: sessions last until sign-out (cookie 400 days, token refreshes hourly); iPhone Safari may drop it after ~7 days without a visit; a home-screen icon has its own storage (sign in once more there; a Safari trial doesn't carry over).
- **Machines:** PC has Docker and the Vercel CLI (linked). MacBook (2026-10-24): Node 24 + gh, `.env.local` and `supabase link` point at production; npm 11 skipped postinstall scripts for `esbuild`, `unrs-resolver` (works anyway).

---

## Roadmap

Ordered. The security and reliability items from an external code review (Oct 2026) are done.

1. **Presentation.** The design language is done (C2, every screen, 2026-11-03). Landing page built. Left: README with screenshots, what it does, and an architecture diagram.
2. **State-handling audit** — done (2026-11-03): page loads and setup actions wait less; see ARCHITECTURE §4.10.
3. **Stats build** — done (2026-11-02/03): every question in BLUEPRINT §8a is on screen, in the new design.
4. **Security review** (owner, 2026-11-03) — next, done by the owner on the PC.
5. **Advanced scoring** — opt-in per round: fairway hit, C1/C2 in regulation, putting. Input UX is the main risk; keep casual rounds fast.
6. **Course content (ongoing)** — per-park seasonal updates via JSON; map PNGs; known gaps (Kõrvemaa PRO 18, Järve Talu "20x" to confirm).

Not planned: exports or integration with other platforms; competitions/ratings (Phase 6).

### Smaller debts

- Unsynced scores only send while the round page is open (resumes on return); a fully offline app (service worker) is not built.
- Later, cheap: per-round par override (tee sign differs from course data). The "unfinished hole" option (par + 4) waits until players really need it (owner, 2026-11-24: maybe never).
- TypeScript 7 / other majors: Dependabot ignores them until typescript-eslint supports TS 7.

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

The stats plan (what each screen shows and why) is BLUEPRINT §8a. Still true from earlier: no combined best score across layouts; ace log is its own route.

### Locked product decisions (other)

- "OB" stays one yes/no per hole. If an unfinished-hole option is ever built, it counts as par + 4 (owner, 2026-10-21; not planned, 2026-11-24).
- Course suggestions: signed-in only; the owner reviews them by hand (no AI pre-reading); the sender is thanked in the app, not by email.
- Casual rounds never rank players: play against yourself (DESIGN-PATTERNS → Redesign brief).

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
