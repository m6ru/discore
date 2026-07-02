# UI roadmap

Phase 4 tab-screen polish is **done for the current stage**. Round route (`/rounds/[roundId]`) remains the north star — don't regress it.

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
| **Home** | `/` | Resume active round, invites, get-started, 3 recent rounds |
| **Play** | `/courses` | Course list + detail; center tab (larger icon) |
| **History** | `/rounds` | Past rounds; Stats section planned above list |
| **Profile** | `/auth` | Account and preferences |

All active tabs: **primary green** label + icon fill.

Each tab route has a `loading.tsx` skeleton so navigation shows an instant shell while the server render streams (see [BLUEPRINT §2b](BLUEPRINT.md)).

---

## Journey status

| # | Slice | Status |
|---|--------|--------|
| 0 | Active scorer round | **Done** — reference |
| 1 | Draft → start | **Done** — inline Start round |
| 2 | Observer | **Done** |
| 3 | End of round | **Done** |
| 4 | Home + nav | **Done** — continue cards, recent rounds, green active tabs |
| 5 | Play / courses | **Done** for stage — list, detail, layouts, coords, About |
| 6 | History list | **Done** — vs par cards, abandoned label |
| 7 | Profile | **Done** for stage — hub layout, Authentication section |
| 8 | **History Stats** | **Next** — Phase 5 tier-1 |
| 9 | Play map view | Later — optional toggle |

---

## Home (settled)

- Personal subtitle, **continue round** muted cards, invites (Realtime)
- Get-started checklist
- **Recent rounds** — last 3, same card pattern as History (vs par)

---

## History & stats

- **List:** completed + abandoned; vs par right-aligned; abandoned = text only
- **Stats (next):** section on `/rounds` above list — rounds played, best round, distribution, OB count; completed rounds only. Aggregate in Postgres (view/RPC) via the `lib/rounds/round-score-summary.ts` seam, not JS reducers ([BLUEPRINT §2b/§8](BLUEPRINT.md)).

---

## Courses / Play (settled for stage)

- Search, distance sort (all seeded parks have coordinates)
- Detail: layout picker, inline Start round, About block
- **Later:** map view toggle; per-course PNG maps as assets arrive

---

## Deferred

- PWA install, D-guest, Phase 6 competitions, social graph beyond invites
