# Plan — state-handling audit (roadmap item 2)

> **Status: draft, not verified.** Written 2026-11-03 from a read-only map of every database round trip. The owner wants a **fresh agent to verify this plan before anything is built**: check each claim against the code, look for reasons the current code is the way it is, and say what would break. Delete this file when the work is done (the PRs and ARCHITECTURE keep the why).

## Why

Every request travels phone (or Vercel server) → Supabase (Stockholm) → back: ~30–80 ms on Wi-Fi, 300 ms+ on weak 4G at a course. Requests that wait for each other for no reason stack those waits. Scoring itself is already fine (one upsert per hole, own echo merged without a refetch, BLUEPRINT §3a) — this is about **page loads and setup actions**.

Already checked: the project uses **asymmetric JWT keys (ECC P-256)**, so `getClaims()` in `proxy.ts` and in pages verifies locally — no network call per page view. Not a target.

## How to verify (do this first)

1. **Measure before changing.** Add a Playwright helper that counts requests to the Supabase URL during one action (open round, add guest, remove player, start, confirm, open Home/History/course/stats/profile). Record the numbers in the PR. After the change the same test proves the saving and guards against regressions.
2. For each item below, find out **why it was written that way** (git blame / PR) before removing it.
3. All E2E must pass, including `offline-scoring.spec.ts` (scoring never waits; completing waits for signal).

## Findings and proposed changes

Numbers are requests per action today → proposed. "Wave" = requests in flight together.

### A. Page loads (code only, low risk)

| # | Where | Today | Proposal | Risks / why it may be like this |
|---|---|---|---|---|
| A1 | Round page `app/rounds/[roundId]/page.tsx` | `rounds` → then 5 in parallel (participants, invites, holes, scores, scorer profile): 2 waves, 6 requests | One `rounds` select embedding `layouts(…, courses(…), holes(…))`, `scorer:profiles!rounds_scorer_id_fkey(display_name)`, `round_participants(…)`, `round_invitations(…, profiles!…(display_name))`, `hole_scores(…)`, ordered with `referencedTable` | One failing embed fails the whole query (today each error is handled on its own — check how the page uses `participantsError` etc.). RLS still applies per embedded table — confirm an **observer** and an **invitee who hasn't accepted** get the same rows as today. `database.types.ts` is hand-written: the embeds need `Relationships` entries. `isRoundParticipant` / not-found logic must keep working. Scores' `par` snapshot must still drive `displayHoles`. |
| A2 | Course page `app/courses/[slug]/page.tsx` | `courses` → `layouts` → `player_course_stats`: 3 waits in a row | Embed `layouts(…, holes(count))` with `.eq("layouts.is_active", true)`; run the stats view in parallel (needs only the slug) | Embedded filter syntax: an `is_active` filter on an embed filters the embed, not the course — verify inactive layouts still don't show. |
| A3 | Course stats `app/courses/[slug]/stats/page.tsx` | 3 waves | Embed layouts in `courses`; run `player_course_stats` + `player_layout_stats` in the same wave → 2 waves | The last wave really depends on the chosen layout (views have `layout_id`, not slug). Leave it unless a view change is worth it. |
| A4 | Profile `app/auth/page.tsx` | `profiles` → `is_app_admin` → suggestion count, in a row | `Promise.all` all three; ignore the count when not admin | Non-admins: the count query returns 0 rows under RLS (not an error) — confirm. |
| A5 | Suggest `app/courses/suggest/page.tsx` (`?course=`) | `courses` → `layouts` | Embed active layouts | Same as A2. |
| A6 | New round `app/rounds/new/page.tsx` | `findInProgressRoundId` → `layouts` | `Promise.all` | — |

### B. Draft setup actions (code only, medium risk)

| # | Action | Today | Proposal | Risks / why it may be like this |
|---|---|---|---|---|
| B1 | Add guest / invite / cancel invite | write → reload the list → own Realtime echo reloads 3 lists again: **5** | `.insert(...).select(...)` / `.update(...).select(...)` and update local state; keep the echo for other devices | CLAUDE.md gotcha: `.insert().select()` (RETURNING) also checks the **SELECT** policy on the new row — confirm the scorer can select a fresh participant/invite row. The invite needs the invitee's `display_name` (embed it in the returning select). |
| B2 | Own echo | every `postgres_changes` event on participants/invites/rounds → `refreshRoundMeta` = 3 requests | For `rounds` UPDATE, read `status` from `payload.new` instead of refetching (rename / starting hole then cost 1) | Participant/invite events **can't** simply be skipped: Realtime doesn't say who caused them, and the invitee accepting on another phone must still update this screen. Participant rows lack display names (they come via invites), which is why the code refetches. Keep refetching those; maybe debounce. The **refetch on SUBSCRIBED and on tab-visible** closes the gap between server render and subscription and covers screen lock / dropped sockets — **keep it**. |
| B3 | Remove player | delete → cancel invites → reload participants → reload invites, all in a row, plus echoes: up to **10** | Run independent steps with `Promise.all` (code only), or later a DB function (C2) | Cancel must not run if the delete failed (today it's gated by the error). |
| B4 | Profile search | picking a result re-runs the search (`selectedProfile` in effect deps) | Read `selectedProfile` through a ref | The effect clears a selection that no longer matches the text — keep that behaviour. |

### C. Database changes (owner runs `db push`; pgTAP for each)

| # | What | Today | Proposal | Risks |
|---|---|---|---|---|
| C1 | Home + History second wave | `player_round_stats` for recent rounds waits for the participation query (Home); `round_participants` count waits for the round list (History) | Add `player_count` (and whatever Home needs) to `player_round_stats`; add `courses_played` to `player_lifetime_stats` (Home reads it; History fetches the count and never uses it — drop it there now, code only) | Views are `security_invoker`; `create or replace view` can only **append** columns. Counting participants inside the view runs under the caller's RLS — a player sees all participants of their own rounds, so the count is right; verify for guests. |
| C2 | Remove player | 2 dependent writes | `remove_round_player(participant_id)` (SECURITY INVOKER, like `accept_invite`): delete + cancel invites in one transaction | New function = new attack surface; pgTAP for scorer-only, draft-only. Alternatively a trigger on participant delete. |
| C3 | Confirm round | flush pending scores → `rounds.update(completed)` → refresh → history RPC → insights (3): ~13 | **Optional, decide after measuring.** `complete_round(round_id, scores)` doing upsert + status in one transaction | Touches the most important flow (offline sync, retry loop, completion trigger, `offline-scoring.spec.ts`). Today's order (flush first, then complete) is already correct. Only worth it if measurement shows a real wait. |

### D. Things that look redundant but are NOT — do not remove

- **`router.push(x)` followed by `router.refresh()`** (delete draft, abandon, accept invite, save profile, start draft, sign in). `next.config.ts` sets `experimental.staleTimes.dynamic: 30`: the client router keeps dynamic pages for 30 s so tabs open instantly. Without the refresh, Home could show **Continue round** right after abandoning, or the course page an old state. Keep it, or replace it with a targeted invalidation only after reading the Next 16 docs in `node_modules/next/dist/docs/`.
- **`router.refresh()` after Start round**: the draft → active header is server-rendered in `page.tsx`. Removing it means moving that header to the client — a bigger change than the saving is worth now.
- **Browser `auth.getUser()` in `use-start-draft-round.ts`**: it decides signed-in round vs signed-out trial, and `getUser()` asks the server (a revoked or expired session is caught). `getSession()` reads local storage only. One request on a tap that navigates anyway — leave it unless verification finds a safe local check. Same reasoning for `claim_trial` (rare) and profile save (pass `userId` from the server instead — safe).
- **Course list caching** (`'use cache'` for the public course catalog): tempting, but needs Next 16 cache config and an invalidation story for seed migrations. Out of scope.

## Suggested order

1. Verify this plan (fresh agent), add the request-count helper, record today's numbers.
2. PR 1 (code only): A1–A6, B1, B2 (rounds status only), B3 via `Promise.all`, B4, drop History's unused count.
3. PR 2 (database): C1, C2 with pgTAP; C3 only if the numbers justify it.
4. Update ARCHITECTURE (round page load, draft actions) and the Handoff; delete this file.
