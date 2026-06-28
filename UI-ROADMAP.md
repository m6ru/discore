# UI roadmap

Phase 4 bootstrap (shadcn, theme, scorer round) is **done**. Focus now: consistent UI + UX figured out screen by screen.

**Read with:** [STATUS.md](STATUS.md) (what exists), [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md) (visual reference).

---

## How to work

1. **One screen or journey slice per chat** — don't reskin the whole app at once.
2. **Talk before pixels** — for any screen you haven't shaped together yet, ask the user what the screen is for, what matters most, and what's out of scope. Don't fill in IA from assumptions.
3. **Simple first** — read [BLUEPRINT.md §2a](BLUEPRINT.md). One screen slice = usually one main client file. No new `lib/` files unless shared or scoring-grade math. Talk through the approach before creating files.
4. **Converge on patterns** from the active scorer round (`/rounds/[roundId]`, scorer, active). Other screens can stay inconsistent until you touch them.
5. **Don't regress** the scorer flow (roster, menu, scorecard dialog, completion deck).
6. **Checks before commit:** `tsc`, `lint`, `test`, `build`.
7. **No** `/lib/scoring`, migrations, or RLS changes unless explicitly scoped.

Record decisions that change behaviour in **STATUS.md**. Optional one-liner under a screen in the journey list below when something is settled.

---

## Bottom navigation (locked)

| Tab | Route | Role |
|-----|-------|------|
| **Home** | `/` | Activity hub — resume, invites, welcome, 3 recent completed rounds |
| **Play** | `/courses` | Start casual round (emphasized center tab); page title **Courses** |
| **History** | `/rounds` | Past rounds list (`completed` + `abandoned`; active rounds stay on Home) |
| **Profile** | `/auth` | Account and settings |

**Later:** fifth **Competitions** tab when events ship — do not merge with Play.

---

## Journey order (suggested)

0. Active scorer round — **reference, don't break**
1. Draft → start — **done**
2. Observer during round — **done**
3. End of round / completed / abandoned — **done**
4. **Home + nav shell** — **done:** tabs; `loadHomeData` (3 queries); `Suspense` streaming; list indexes migration
5. **Courses (Play tab)** — header done; **next:** course detail enrichment (contact, map, details), GPS nearby sort when `lat`/`lng` seeded
6. **History** — list done; **next session:** stats sub-section (Phase 5), gamified milestones
7. Profile — functional; polish when needed

---

## Home (settled)

- **Discore** title + personal subtitle (`Hei {name}, lets throw some discs!`)
- **Continue round** when `status = active`
- **Pending invites** with Realtime
- **Get started** checklist — items drop off when round joined, History visited, profile enriched (avatar or city)
- **Recent rounds** — last 3 completed; section always visible when signed in

---

## History & stats (planned)

- **History tab** = round list for now (`PAST_ROUND_STATUSES`)
- **Stats** (separate session): `STATS_ROUND_STATUSES` = `completed` only until competition rounds exist
- Tier 1 stats when built: score distribution (eagle→double+), best round, OB count, rounds played
- Tier 2+: trends, course breakdowns, friend comparisons
- Tier 3+: GIR, putting (needs new per-hole capture)
- Gamification (bogey-free streaks, ace milestones) — after core stats

---

## Courses / Play (settled header, more to build)

- Tab label **Play**; page title **Courses**; subtitle *Pick a course to play.*
- Search + compact course list; nearby sort when user shares location (`lat`/`lng` in DB)
- **Next:** map view toggle (follow-up slice)

---

## Deferred (not this track)

- PWA / install-to-homescreen — later, see STATUS
- Phase 6 competitions / ratings — STATUS "Later"
- Guest claim (D-guest) — STATUS "Later"
- **Social / player discovery** — search other players, view friends' rounds, follow graph; invite flow covers MVP social needs
