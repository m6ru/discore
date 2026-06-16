# UI roadmap

Phase 4 bootstrap (shadcn, theme, scorer round) is **done**. Focus now: consistent UI + UX figured out screen by screen.

**Read with:** [STATUS.md](STATUS.md) (what exists), [DESIGN-PATTERNS.md](DESIGN-PATTERNS.md) (visual reference).

---

## How to work

1. **One screen or journey slice per chat** — don't reskin the whole app at once.
2. **Talk before pixels** — for any screen you haven't shaped together yet, ask the user what the screen is for, what matters most, and what's out of scope. Don't fill in IA from assumptions.
3. **Converge on patterns** from the active scorer round (`/rounds/[roundId]`, scorer, active). Other screens can stay inconsistent until you touch them.
4. **Don't regress** the scorer flow (roster, menu, scorecard dialog, completion deck).
5. **Checks before commit:** `tsc`, `lint`, `test`, `build`.
6. **No** `/lib/scoring`, migrations, or RLS changes unless explicitly scoped.

Record decisions that change behaviour in **STATUS.md**. Optional one-liner under a screen in the journey list below when something is settled.

---

## Journey order (suggested)

Work outward from the round you like:

0. Active scorer round — **reference, don't break**; scorecard polish done (live Par/Thr/Total, double-bogey tone, tighter columns, `sectionHeadingClassName`)
1. Draft → start (same route) — **done:** unified Players panel, + add flow, starting-hole picker, editable header title, X delete draft, fixed Start deck; no draft scorecard
2. Observer during round — **partial:** `ActiveHoleStatus` header + live scorecard; full observer UX not shaped yet
3. End of round / completed
4. Home
5. Courses
6. History (`/rounds`)
7. Account / auth — lowest priority until needed

Order is flexible; user picks what hurts most.

---

## Deferred (not this track)

- PWA / install-to-homescreen — later, see STATUS
- Phase 5 stats, GPS sort, guest claim — STATUS "Later"
