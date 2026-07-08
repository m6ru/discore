# UI roadmap

Phase 4 tab-screen polish is **done for the current stage**. The round route (`/rounds/[roundId]`) works well and is field-tested — change it **carefully, not carelessly**. It is **not frozen**: additions like advanced scoring inputs are planned. "Don't regress it" protects the scoring *behaviour*, not the code from evolving.

**Read with:** [STATUS.md](STATUS.md), [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md).

---

## How to work

1. **One screen or journey slice per chat** — don't reskin the whole app at once.
2. **Talk before pixels** on new surfaces (especially Stats).
3. **Simple first** — [BLUEPRINT.md §2a](BLUEPRINT.md): one main file per slice; no `lib/` sprawl.
4. **Checks before commit:** `tsc`, `lint`, `test`, `build`.

---

## Bottom navigation (locked)

| Tab | Route | Role |
|-----|-------|------|
| **Home** | `/` | Launchpad: resume active round, invites, near-you Start (planned), get-started, 3 recent rounds |
| **Play** | `/courses` | Course list + detail |
| **History** | `/rounds` | Past rounds + **Your stats** block (v1) |
| **Profile** | `/auth` | Account and preferences |

Four **equal-weight** tabs — clean by design. Play's icon is **subtly** larger (`emphasized` flag, `size-6` vs `size-5`); this is a light visual accent only, **not** a primary-action button. The primary "start a round" action lives on **Home** (near-you Start), not in the nav. Do not reintroduce a "center create tab".

All active tabs: **primary green** label + icon fill.

Each tab route has a `loading.tsx` skeleton so navigation shows an instant shell while the server render streams (see [BLUEPRINT §2b](BLUEPRINT.md)).

---

## Journey status

| # | Slice | Status |
|---|--------|--------|
| 0 | Active scorer round | **Done** — works well; evolve carefully |
| 1 | Draft → start | **Done** — inline Start round |
| 2 | Observer | **Done** |
| 3 | End of round | **Done** |
| 4 | Home + nav | **Done** — continue cards, recent rounds, green active tabs |
| 5 | Play / courses | **Done** for stage — list, detail, layouts, coords, About |
| 6 | History list | **Done** — vs par cards, abandoned label |
| 7 | Profile | **Done** for stage — hub layout, Authentication section |
| 8 | **Home stats teaser** | **Next (small)** — one-line snapshot on `/` from `load-player-stats` |
| 9 | **History Stats v1** | **Done** — Postgres views + stats block on `/rounds` |
| 10 | **Advanced scoring** | **Next** — opt-in per round; richest slice, touches round route |
| 11 | **Stats v2** | Later — per-course, trends, richer metrics after advanced scoring |
| 12 | D-guest (anonymous trial + claim) | Later — acquisition lever |
| 13 | Play map view | Later — optional toggle |
| 14 | Ratings → competitions | Phase 6 — only if adoption warrants |

---

## Home

**Shipped (settled):**

- Personal subtitle, **continue round** muted cards, invites (Realtime)
- Get-started checklist
- **Recent rounds** — last 3, same card pattern as History (vs par)
- **Near-you Start** — nearest course when location enabled (`NearYouStart`)

**Planned (slice 8):**

- **Stats-teaser slot** — one-line snapshot (rounds · best · average) on Home, wired to `load-player-stats.ts`. Comment placeholder in `components/home/sections.tsx`.
- Keep home **calm** — no feed, no widgets. **Play again** on recent rows dropped (clutter).

---

## History & stats

- **List:** completed + abandoned; vs par right-aligned; abandoned = text only (excluded from stats)
- **Stats v1 (done):** block on `/rounds` above list — rounds played, best, average vs par, OB/round, score distribution (birdie/par/bogey/double+; eagle/ace only when > 0). Completed rounds only. Postgres views `player_round_stats` + `player_lifetime_stats`; loader `lib/rounds/load-player-stats.ts`.
- **Stats v2 (later):** per-course breakdown, trends, tap best round; Home teaser; advanced metrics once detailed scoring lands.

---

## Advanced scoring (slice 10 — after Stats)

Optional richer per-hole capture for serious players — the standard advanced disc golf metrics — without slowing casual rounds. **Talk before pixels** — this touches the round route.

- **Opt-in per round.** A "detailed scoring" toggle enables the extra inputs; default off keeps the fast 2-tap-per-hole flow. Toggle placement (round setup vs. mid-round) is an open design question to settle when the slice starts.
- **Metric set:** fairway hit · Circle 1 in reg (≤10 m) · Circle 2 in reg (≤20 m) · C1 putting (make inside 10 m) · C2 putting (make 10–20 m) · **bullseye / parked** (inside 3 m of the basket). `ob` already exists.
- **Input UX is the risk.** Extra fields must stay thumb-fast and never clutter a casual round. This is the most sensitive UI change in the app — do it as its own slice, verify carefully.
- Schema stays additive: new nullable `hole_scores` columns, null on casual rounds (BLUEPRINT §5).

---

## Courses / Play (settled for stage)

- Search, distance sort (all seeded parks have coordinates)
- Detail: layout picker, inline Start round, About block
- **Later:** map view toggle; per-course PNG maps as assets arrive

---

## Deferred

- PWA install; Play map view; Phase 6 competitions & ratings; social graph beyond invites
- **D-guest** (anonymous trial + claim on signup) — acquisition lever, planned after advanced scoring
