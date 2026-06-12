# Design patterns

North star: **active scorer round** (`app/rounds/[roundId]/`). Match these when redesigning other screens.

## Locked (already in code)

- Emerald primary, light only, Manrope + JetBrains Mono for scores
- Breathable padding, warm copy, icons only for actions
- shadcn primitives in `components/ui/`, no wrapper layer
- Bottom tab bar except on live round pages

## Layout

- Page: `max-w-3xl`, `p-4 sm:p-8`, single column
- Header: bold title + muted subtitle; ghost icon actions (no outline box)
- Lists: flat bordered rows, not card stacks inside cards
- Heavy data (scorecard): full-width top sheet, minimal header
- Primary actions on round: fixed bottom deck + safe-area

## Numbers

- `font-mono tabular-nums` for strokes, par, totals

## Avoid

- Nested cards where a flat list works
- Centered small modals for full scorecard
- Footer abandon on active scorer (lives in menu)

Details live in the components — read before copying.
