# Plan — state-handling audit (roadmap item 2)

> **Status: verified 2026-11-03, not built.** A first draft (same day) was checked claim by claim against the code, git history, the Next 16 router source and live queries on local Supabase; this is the corrected version. Delete this file when the work is done (the PRs and ARCHITECTURE keep the why).

## Why

Every request travels phone (or Vercel server) → Supabase (Stockholm) → back: ~30–80 ms on Wi-Fi, 300 ms+ on weak 4G at a course. Requests that wait for each other for no reason stack those waits. Scoring itself is already fine (one upsert per hole, measured below). This is about **page loads and setup actions**.

Checked, not a target: page auth. `getClaims()` verifies the JWT locally; the JWKS is fetched once per server process and shared by every client (`GLOBAL_JWKS` in auth-js).

## Today's numbers (local Supabase, 2026-11-03)

`MEASURE_REQUESTS=1 npx playwright test request-counts --workers=1` (`e2e/request-counts.spec.ts`, helper `e2e/request-count.ts`). **Browser** = the phone's Supabase calls; **server** = calls Next makes while rendering (from the local gateway log, so run it alone). Realtime websocket traffic is not counted.

| Action | Browser | Server | Where the waits are |
|---|---|---|---|
| Open Home (1 finished round) | 1 | 8 | 7 in parallel, then `player_round_stats` |
| Sign in → Home | – | 14 | Home rendered **twice** (`push` + `refresh`) |
| Tap layout → draft | 7 | 12 | `getUser` → in-progress check → insert, one after another; round page rendered **twice** |
| Open round (draft / active / finished) | 4–5 | 6 | `rounds`, then 5 in parallel; browser resyncs 4 after mount (+ history RPC) |
| Add guest | 5 | 0 | insert → reload participants → echo reloads 3 |
| Search + pick + invite | 6 | 0 | search, insert → reload → echo 3 |
| Remove guest | 3 | 0 | delete → reload participants → reload invites (no echo: see below) |
| Cancel invite | 5 | 0 | update → reload → echo 3 |
| Remove a player who accepted | 7 | 0 | delete → cancel invite → reload → reload, then echo 3 |
| Invitee accepts (scorer's phone) | 6 | – | two echoes × 3 |
| Start round | 8 | 6 | update → refresh (1 render) + echoes + history RPC |
| Score a hole | 1 | 0 | one upsert ✓ |
| Confirm round | 6 | 6 | flush → complete → refresh (1 render) + insights 3 + history RPC |
| History | 0 | 4 | 3 in parallel, then `round_participants` |
| Course page | 0 | 3 | three in a row |
| Course stats | 0 | 6 | three waves |
| Profile | 0 | 2 | two in a row (3 for the owner) |
| Courses list | 0 | 1 | ✓ |

## What the check found

### Confirmed
- Round page is 2 waves / 6 requests (A1). One embedded select works with RLS exactly like today's separate queries: tested as scorer, accepted observer (sees only their own invite, as today), pending invitee (sees no participants → redirected, as today) and stranger (no round). No embed hints are strictly needed, and `database.types.ts` already has every `Relationships` entry (including `round_participants` → `player_round_stats`). A failing embed fails the whole query; today any one error also hides the round, so the user sees the same thing.
- Course page 3 in a row (A2); an embedded `layouts.is_active` filter drops inactive layouts and still returns the course. Course stats 3 waves → 2 (A3). Suggest page (A5) same shape as A2.
- Draft echo cost (B1): own writes come back through Realtime and reload 3 lists. `insert().select()` works for the scorer on both guests and invites, including the invitee's `display_name`.
- `router.push` + `router.refresh` (D): in Next 16.4 `refresh()` bumps a global cache version, so it clears **every** cached page, not only the current one (the docs say "current route"; the source says all). That's what stops Home showing **Continue round** after abandoning. Keep it where other cached pages can be wrong.
- Refetch on `SUBSCRIBED` and on tab-visible (B2, from commit 94fc6bc "reliable field MVP collab"): keep. There's also a second reason the draft missed: with `staleTimes.dynamic: 30` a round page can come from the client cache with props up to 30 s old, and the resync is what corrects it.
- Confirm round (C3): the order (flush, then complete) is right and it's only 2 writes in a row. **Not worth a database function.**

### Wrong in the draft
- **"Participant rows lack display names"**: `round_participants.user_id` has a foreign key to `profiles`, so `round_participants(…, profiles(display_name))` works. Names only come from invites today, and that hides a **bug**: an observer can only read their own invite (RLS), so other registered players show up as "Registered user (uuid)" on their screen. Embedding the profile fixes it and removes the reason to reload all 3 lists on every event.
- **A4 "non-admins get 0 rows"**: not always. A non-admin sees their own suggestions, so the count is their own `new` ones. Gate the result on `is_app_admin`, as the draft said, but for this reason.
- **B3 "up to 10"**: measured 7, because **Realtime never delivers `DELETE` events on a filtered channel** (tested). So the scorer's screen must update itself after a delete; it can't wait for an echo. (Observers also miss removals until the next resync — draft only, minor.)
- **B4**: reading `selectedProfile` through a ref isn't enough. Picking a result also writes the name into the text field, which re-runs the search too. Skip the search when the text equals the picked name.
- **C1 needs no migration.** Home can read recent rounds straight from `player_round_stats` (it has course, layout, status, dates and totals) in the first wave. History can embed `round_participants(count)` on the view (tested: correct count under RLS). The courses-visited count already runs in parallel, so it costs a request, not a wait.
- **A6** optimises `/rounds/new`, which nothing links to any more (layout taps create the draft directly). Drop it.

### Missed
- **Tap layout → draft is the worst common action**: 3 browser calls in a row before the page even starts (`auth.getUser()` asks the Auth server, then the in-progress check, then the insert), then the new round page renders twice. The in-progress check must stay: "one draft or active round" is only enforced there (the index covers `active` only). But the course page already knows the user on the server and can pass the id down (the same move the draft suggested for profile save), and `refresh()` adds nothing on a brand-new URL (Home doesn't show drafts).
- **Sign in renders Home twice** (14 server requests). Rare action; leave it, or later use a full page load.
- **Observer state after Start**: a `rounds` UPDATE payload carries the whole row (tested), so status, name and starting hole can be applied from it. Today observers keep the old starting hole until they reload.
- **Re-inviting someone after cancelling fails**: `round_invitations` is unique on (round, user), so the second insert errors. Not state handling: logged in STATUS → Smaller debts.
- `BLUEPRINT.md` §2b still says the round page, `rounds/new` and course stats call `getUser()`; they use `getClaims()` now (fixed with this plan).

## Corrected plan

### PR 1 — code only (no `db push`)

| # | Change | Expected |
|---|---|---|
| 1 | Round page: one `rounds` select embedding layout + course + holes, scorer profile, participants **with `profiles(display_name)`**, invites, scores. `buildUnifiedPlayers` takes the participant's own name first, the invite's as fallback. Keep the separate error messages by checking the one error. | server 6 → 1, 2 waves → 1; observer names fixed |
| 2 | Realtime: each table reloads only itself (participants → participants with names, invites → invites); `rounds` UPDATE applies `status`, `name`, `starting_hole` from `payload.new` (reload only if it's missing). Keep the `SUBSCRIBED` / visible resync. | echo 3 → 1 (rounds → 0) |
| 3 | Draft actions: guest and invite use `.insert().select()` and update local state; cancel uses `.update().select()`. Deletes update local state themselves (no echo comes). Remove an accepted player: delete → (only if it worked) cancel invite → local update. | add guest 5 → 2, remove accepted 7 → 3 |
| 4 | Tap layout (course page): pass the user id from the server page instead of `auth.getUser()`. A cached course page can't carry the wrong user, because sign-in and sign-out both call `refresh()`; a stale session fails at the insert under RLS and shows the error toast. Drop `router.refresh()` after pushing to the new draft. | browser waits before the page 3 → 2, server 12 → 6 |
| 5 | Course page, suggest, course stats: embed active layouts in `courses`; run the stats views in the same wave. Profile: `Promise.all` profile + admin check + count, use the count only for admins. | 3 → 1–2 waves |
| 6 | Home: recent rounds from `player_round_stats` in the first wave. History: `round_participants(count)` embedded, no courses-visited count. | Home and History 2 waves → 1 |
| 7 | Profile search: no new search when the text is the picked player's name. | −1 per invite |

Then turn `e2e/request-counts.spec.ts` into a guard: assert the **browser** counts (exact per page, safe in parallel CI); server counts stay a measuring tool (they need the run to be alone).

### Not doing (and why)
- `complete_round` function (C3): confirm is already 2 writes; touches offline sync for no gain.
- `remove_round_player` function (C2): PR 1 #3 gets it to 2 writes in a row. If that's still felt, an `AFTER DELETE` trigger on `round_participants` that cancels the invite is simpler than a function (no new callable API; needs pgTAP, and must behave when a whole round is deleted).
- `push` + `refresh` elsewhere (delete draft, abandon, accept invite, profile, sign in): rare actions, and the double render runs in parallel rather than adding a wait. Revisit only with a reason.
- Moving the Start-round header to the client; caching the course catalog (`'use cache'`): out of scope, as the draft said.

## After it
Update ARCHITECTURE (life of a round: one page query, per-table Realtime, DELETE events don't arrive) and the Handoff; delete this file.
