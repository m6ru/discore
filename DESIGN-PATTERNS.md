# Design patterns

North star: **active scorer round** (`app/rounds/[roundId]/`). Works well and is field-tested — evolve **carefully, not carelessly**. It is **not frozen**: additions like advanced scoring inputs are planned. "Don't regress it" protects scoring *behaviour*, not the code from evolving.

**What to build next:** [STATUS.md](STATUS.md) (priorities, Stats v2 action plan). **Architecture:** [BLUEPRINT.md](BLUEPRINT.md).

---

## How to work on UI

1. **One screen or journey slice per chat** — don't reskin the whole app at once.
2. **Talk before pixels** on new surfaces.
3. **Simple first** — [BLUEPRINT.md §2a](BLUEPRINT.md): one main file per slice; no `lib/` sprawl.
4. **Before commit:** `tsc`, `lint`, `test`, `build`.

---

## Bottom navigation (locked)

| Tab | Route | Role |
|-----|-------|------|
| **Home** | `/` | Launchpad: continue round, invites, near-you Start, get-started, recent rounds |
| **Play** | `/courses` | Course list + detail; **Your stats** → course stats screen (Stats v2) |
| **History** | `/rounds` | Global summary + round list |
| **Profile** | `/auth` | Account and preferences |

Four **equal-weight** tabs. Play's icon is **subtly** larger (`emphasized`, `size-6` vs `size-5`) — light accent only, **not** a primary-action button. Primary "start a round" flow lives on **Home** (near-you Start). Do not reintroduce a center create tab.

All active tabs: **primary green** label + icon fill.

Each tab route has a `loading.tsx` skeleton for an instant shell while the server render streams ([BLUEPRINT §2b](BLUEPRINT.md)).

---

## Locked (already in code)

- Emerald primary, light only, Manrope + JetBrains Mono for scores
- Breathable padding, warm copy, icons only for actions
- shadcn primitives in `components/ui/`, no wrapper layer
- Bottom tab bar except scorer live round pages (draft/active); shown for observers throughout and scorer after complete

## Layout

- Page: `max-w-3xl`, `p-4 sm:p-8`, single column
- Header: bold title + muted subtitle; ghost icon actions (no outline box)
- Lists: flat bordered rows, not card stacks inside cards
- Section labels: `text-sm font-semibold tracking-tight` via `sectionHeadingClassName` in `lib/ui/section-heading.ts`
- Heavy data (scorecard): full-width top sheet, minimal header
- **Tab screens** (Home, Play, History, Profile) and **draft round setup**: primary actions inline in page content — `pagePrimaryButtonClassName` in `lib/ui/page-chrome.ts` (`min-h-10 w-full rounded-xl text-sm`)
- **Active scoring / round complete** (tab bar hidden): fixed bottom deck + safe-area for primary actions (hole save, complete)

## Numbers

- `font-mono tabular-nums` for strokes, par, totals

## Avoid

- Nested cards where a flat list works
- Centered small modals for full scorecard
- Footer abandon on active scorer (lives in menu)

Details live in the components — read before copying.
