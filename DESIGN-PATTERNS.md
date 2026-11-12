# Design patterns

North star: **active scorer round** (`app/rounds/[roundId]/`). Works well and is field-tested — evolve **carefully, not carelessly**. It is **not frozen**: additions like advanced scoring inputs are planned. "Don't regress it" protects scoring *behaviour*, not the code from evolving.

**What to build next:** [STATUS.md](STATUS.md) (priorities, Stats v2 action plan). **Architecture:** [BLUEPRINT.md](BLUEPRINT.md).

---

## Redesign brief — direction C "Scorecard" (round 2, 2026-11-02)

Chosen by the owner from three mockups (2026-10-24), refined in a second canvas round with the owner (2026-11-02). The reference mockups are the **"C2"** artboards on the private design canvas (claude.ai); the first "C" artboards are outdated. **Tokens are live** in `app/globals.css` (whole app recoloured at once); screen layouts follow one screen per PR. Hidden reference page: **`/design`** (not linked, not indexed).

**The redesign changes the look, not the flows.** Before drawing or building a screen, read how it behaves today (links, round lifecycle) and keep that unless the owner decides otherwise.

### Look

- **Feel:** light, uncrowded, intuitive. Readable in sunlight (strong text contrast).
- **Surfaces:** off-white ground `#FAFAF6`, hardly any filled tiles; structure from thin dividers `#E4E3DC` and whitespace. A section that must read as one unit gets a light frame: tint `#F2F1EA`, 1 px divider border, 6 px corners (never a dark filled card).
- **Color:** ink `#141814`, muted text `#5B615B`, primary (forest) `#1D3A2C` for main actions, lime `#C9E36A` **only for good things** (birdie, under par, new best, active tab marker). Over-par tint `#E9D9C9`, double or worse `#D4B496` (quiet, not alarm red). Destructive actions: text `#A8261B`.
- **Score tones** (scorecard cells, five levels like today): birdie lime · eagle or ace lime with a 1.5 px forest outline · par no fill · bogey `#E9D9C9` · double or worse `#D4B496`. No legend; the colours speak for themselves.
- **Shape:** square-ish corners, ~6 px buttons, ~4 px chips. **No pill shapes.**
- **Type:** Space Grotesk for headings and big numbers; Manrope for body; JetBrains Mono for small tabular numbers.
- **Icons:** ⋯ for "actions on this thing", ✕ for "leave/close"; ☰ is not used.

### Product stance

- **Casual rounds are about playing against yourself, not your mates.** No winner, no places, no medals in a casual round: players always appear in the order they were added. Personal moments ("New best") are shown only to the player they belong to (stats are private per player).
- If competitions ever come, the same scorecard sorts by score and shows places — a setting on one component, not a second design.

### Screens (C2 artboards)

- **Forest band** (owner, 2026-11-09): the top of Home and of the landing page is a forest (`bg-primary`) band; the first framed box overlaps its lower edge. On Home the band is slim: the 44 px wordmark row, 12 px of green, then the frame overlapping 40 px (owner: no empty green, Home fits one screen). **Status bar is forest on every page** (owner, 2026-11-09; one look in the browser and the home-screen app, since iOS sets it once per app): `themeColor` forest + `viewportFit: cover` in the root layout, `appleWebApp.statusBarStyle: black-translucent`, and a fixed forest strip the height of `env(safe-area-inset-top)` (zero in a browser tab). Anything pinned to the top of the screen pads by that inset (the full scorecard sheet does). **iOS 26 Safari ignores theme-color**: it tints its bars from a fixed element's background, else the body — so the body is forest (content sits on the light ground in `AppChrome`) and the forest tab bar is the fixed element. Screens without the tab bar (draft, scoring) have light fixed decks, so Safari may tint light there. Only these two screens — scoring, scorecards, lists and stats stay on the light ground.
- **Landing page** (signed out `/`, `components/home/landing.tsx`): band with "discore" + **Sign in**, headline **"Score your round. Sign up later."**, line "A disc golf scorecard for you and your friends, 180+ courses."; an **Example round** card overlapping the band (made-up 9-hole round, You and Bob; a picture, not the real scorecard; ace yellow `bg-ace`, eagle blue `bg-eagle`, birdie lime, bogey/double tan); **Start a round** (the nearest-course frame instead when Location is on — the page never asks for location) + "No account needed."; a continue-trial card takes that spot when this phone has a trial; **How it works** (1 Pick a course · Choose a layout and add the players. 2 Score your round · One person keeps the score. Everyone else can observe live. 3 See your progress · All your rounds in one place, with stats on how you play.); outlined **Browse courses**. One Start a round only. Plain text wordmark until the logo is chosen.
- **Score colours** (owner, 2026-11-09): ace yellow `bg-ace` (#FFE566), eagle blue `bg-eagle` (#6FA6D9), birdie lime `bg-good`, par plain, bogey `bg-over`, double+ `bg-over-strong` — on the scorecard, the landing example and `/design`. Course stats' score mix keeps one Birdie+ bar. Open: yellow and lime are close in lightness for colour-blind players; if that bites, mark the ace (outline or bold) rather than change hue.
- **Home:** band with wordmark + "Tere, <name>" top right; the first frame overlaps the band, so it is always a frame (Continue round, else the nearest course), then invites and thank-yous; nearest course in a light framed section (label row "Nearest course · 1.8 km" (no divider under it since 2026-11-12), name (22 px display font, wraps to two lines, not the main thing on Home), layout count, forest "Start a round" → the course page). With a round in progress, Home shows **Continue round** instead (as today).
- **Course page:** back arrow with **Your stats** (no arrow) on the same row → course name → "Last played 12.10 · Total rounds 6" → the map link. **Pick a layout:** each layout is a framed row (name, holes · par · meters) ending in a 44 px forest square with an arrow; the whole row starts the draft. Then About, then "Suggest a fix".
- **Courses list:** title "Courses" with **Missing one?** on the right; a 48 px search box with a magnifier; a label row ("Nearest first" + "Distance", or "A–Z") over divided rows (bold name, "town · layouts · terrain", distance in mono on the right).
- **History:** title; two panel boxes (**Best round** → that round, **Aces** → ace log; each only when it has data); rounds grouped by month ("October 2026 · 4 rounds"), rows of date · course with "layout · N players / solo" · ± (lime when under par, "Abandoned" in grey). Lifetime numbers live on Home, not here. Ace log: same divided rows with a lime hole-number square and a back arrow.
- **Course stats** (`/courses/[slug]/stats`, BLUEPRINT §8a A/B/C+G): back arrow, "Your stats", course name, "Last played · Total rounds"; layout tabs only with 2+ layouts; strip Best (→ round) · Average · Rounds; **Your rounds here** — a small line of score vs par per round (dashed par line, best as a lime dot) and one sentence comparing the last rounds with the first; **Where you lose strokes** — top 3 holes by average over par, each with its pattern ("OB 2 in 6 · often double", else "Usually 5"), then "All N holes" expands the full list; **Score mix** — one bar (birdie+ lime, par white, bogey, double+) with percentages. No duplicate rates and counts.
- **Course suggestions** (`/courses/suggest`, no tab bar, fixed **Send suggestion** deck with a one-line caption): back arrow, title, one-line subtitle. **New course:** Course name; **Where is it?** = a card "Use where you are now" → "Where you are now · <county> · lat, lng" with Clear, under it "Not at the course? Type the town instead"; **Is it one of these?** (lime left rule, courses within 3 km with distance and Open); **Baskets** −/18/+; **Photos** = a dashed **Course board or map** slot ("The board at the first tee, or a screenshot of the layout. This helps most."), the required proof photo, then "More photos · tee signs, a second board" as a 4-column grid of square thumbs and a dashed + tile; **Anything else** note. **Fix:** "What's wrong?" radio rows (question + grey hint), Layout select, "What's changed?", Photos ("A photo of the tee sign helps most."). No field says "optional". **Sent:** lime check circle, "Thanks, got it", one line, outlined Back button.
- **Admin suggestions** (`/admin/suggestions`, owner only): back arrow to Profile, title, "Copy for agent, apply it in a PR, then mark it applied."; tabs New · Applied · Not applied with mono counts and a lime marker under the active one. **New** = framed cards: kind in small green capitals + date, course name in the display font (· layout · hole in grey), "From <name> · <county> · N baskets · Map", the note, square photo thumbs (tap = full size), outlined **Copy for agent**, "Note to the sender", **Applied** / **Not applied** side by side. **Applied / Not applied** = quiet divided rows: course · layout · hole, date, kind · “note sent”, a small **Move back to new**.
- **Profile** (`/auth`): title, hero (photo or initials square, name, city · email); **Account** rows Edit profile › and Change password › (`?view=edit` / `?view=password`, own screen with a back arrow); **Settings** switches Location, Your round summary, Clean card by default; Sign out as a red outlined button. Admin-only Course suggestions row stays at the top.
- **Sign in** (signed out `/auth`): wordmark; "Sign in" (or "Create an account") + one line on why; email and password; dark **Sign in →**; "or" rule; outlined **Create an account** that switches the form. No trial pitch here — the landing page covers it.
- **Draft setup** (no tab bar): header with the course on one line and the layout under it in grey (both truncate, never squeeze each other), **✕** opens the round sheet. The scoring header uses the same two lines. Round name with a rename pencil. Players as divided rows with status (*Invite sent · waiting to accept*, *Guest, no account*; your own scorer row has none), Remove, "+ Add player" and one line on invites vs guests. Starting hole as a select, no hint. **Start round** at the bottom with no caption; greyed out with "Waiting for N to accept." while an invite is pending.
- **Scoring screen** (no tab bar, **no back arrow** — leaving is via the sheet):
  1. Header: "Course · Layout" + **⋯**.
  2. **Progress line** at the top: "4 of 18 played" over a slim segmented bar (played forest, current lighter, rest divider grey). It counts holes **played**, not hole numbers, so a round started on hole 7 still fills left to right. The whole row opens the scorecard. Replaces the mini scorecard strip of the first mockup.
  3. Big hole number with Par / Meters beside it.
  4. **Hole note** straight under it: info icon, 2 lines max, tap for the full note; hidden when the hole has none.
  5. Roster as a table (Hole · Tot · ±).
  6. Stepper: **wide − and +** (score column fixed ~100 px, buttons share the rest, ~120 px each); − outlined, + outlined with a light fill. Player's name above the big number.
  7. Previous · OB · forward button naming the next player ("Next: Andres").
- **Review step** (after the last hole is saved, still the scoring header with ⋯): progress line full ("18 of 18 played"); **All holes played** + "Check the card. Tap a hole to edit. Scores lock when you confirm the round."; the scorecard, where tapping a hole opens it for editing and saving it comes back here; **Totals** as equal rows in play order. Bottom deck: outlined **‹ Hole 18** (back to the last hole in play order) and dark **Confirm round ✓**. The popup stays because scores lock for good (RLS only allows edits while active): "Confirm the round?" · "Scores can't be changed after this." · **Back to card** / **Confirm**.
- **Trial round** (signed out, `/rounds/trial`): the same steps and parts as a signed-in round, header course / "Layout · trial" with **✕** ("Discard this round?" · **Keep playing** / **Discard**) instead of ⋯ — no round sheet, no invites, no stats lines. **Setup:** title "Trial round" + "No account needed. The round stays on this phone until you save it."; your name typed into the first row, guests as rows with Remove, an inline "+ Add player" row; Starting hole; Start round deck. **Finished:** Results, scorecard, then a framed **Save this round** box (Create an account → `/auth?mode=sign-up`, I have an account, red Discard).
- **Round sheet** (bottom sheet, replaces the dropdown and the draft's ✕-delete): round info at the top (course, layout, par, starting hole — replaces the "See info" popup), then rows: **Scorecard ›**, **Hide running totals** (a visible on/off switch), **Wrong info on hole N? ›** (moved here from under the hole note). The destructive action sits apart at the bottom in red: **Abandon round** (active) keeps its confirmation; **Delete draft** (draft) deletes on tap, since a draft has no scores and the sheet is already the second tap (owner, 2026-11-03). Neither has a hint line under it. The draft sheet shows layout · holes · par only. Observers get no sheet; they keep the tab bar.
- **Finished round** (tab bar visible): header (course · layout · par, round name · date · players) → **Results**: equal rows in play order (name, Tot, ±), your own row may carry a lime "New best" tag → **Scorecard** → **Your round**: one line (new best, the hole that cost the most vs your usual) + "Your stats on <layout> ›".
- **Scorecard** (finished screen, sheet, anywhere): one row per player, all holes in one line that scrolls sideways — works for any hole count (7, 9, 14, 21 …), **no front/back split**. The pinned column holds the **first name and ±** (owner, 2026-11-12: watchers check ± most, and it must not scroll away); players who share a first name keep their full name; tapping "Hole" shows full names. Par is a row; **Tot comes after the last hole**. Score cells are tall and thin (~20 × 30 px) so ~12 holes fit on a phone.

### Open (decide when building)

- A draft can only be left by deleting it (true today too; "Continue round" on Home brings you back).
- ~~Home stats strip~~ → decided by the owner (2026-11-02): the C2 strip look with **Rounds played · Total throws · Courses visited**. No aces or usual score on Home.
- ~~"Hide my usual" vs Hide running totals~~ → decided: one **Clean card** switch in the round sheet hides both. Profile has **Clean card by default** (per device).
- ~~Confirm and end round step~~ → built as the review step above (2026-11-03).
- ~~Ties and many players on the finished screen~~ → closed (2026-11-03): casual rounds have no places or winner, so equal scores are just equal rows; big groups only make the lists longer and the scorecard already scrolls sideways.

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

**Forest tab bar** (owner, 2026-11-12, for more colour): `bg-primary`, tabs in light text at 70 %, the active tab full light + bold with the lime marker.

Each tab route has a `loading.tsx` skeleton for an instant shell while the server render streams ([BLUEPRINT §2b](BLUEPRINT.md)).

---

## Locked (already in code)

- Direction C tokens in `app/globals.css` (forest primary, off-white ground, 6 px `--radius`), light only. Extra colours as Tailwind classes: `bg-good` (lime, good things only), `bg-over`, `bg-over-strong`. Fonts: `font-display` (Space Grotesk) for headings and big numbers, Manrope body, `font-mono` (JetBrains Mono) for scores
- Badges are square-ish chips (`rounded-md`, 4 px); no new `rounded-full` except avatars and switches
- Breathable padding, warm copy, icons only for actions
- shadcn primitives in `components/ui/`, no wrapper layer
- Bottom tab bar except scorer live round pages (draft/active); shown for observers throughout and scorer after complete

## Layout

- Page: `max-w-3xl`, `px-4 pt-2 pb-4 sm:p-8`, single column (8 px at the top on phones: owner, 2026-11-12, so Home fits one screen)
- Header: bold title + muted subtitle; ghost icon actions (no outline box)
- Lists: flat bordered rows, not card stacks inside cards
- Section labels: `text-sm font-semibold tracking-tight` via `sectionHeadingClassName` in `lib/ui/section-heading.ts`
- Heavy data (scorecard): full-width top sheet, minimal header
- **Tab screens** (Home, Play, History, Profile) and **draft round setup**: primary actions inline in page content — `pagePrimaryButtonClassName` in `lib/ui/page-chrome.ts` (`min-h-10 w-full rounded-xl text-sm`)
- **Active scoring / round complete** (tab bar hidden): fixed bottom deck + safe-area for primary actions (hole save, complete)

## Numbers

- `font-mono tabular-nums` for strokes, par, totals

## Avoid

- Text fields under 16 px on phones: iOS Safari zooms the whole page when one is focused (`text-base`, as `components/ui/input.tsx` does)
- Nested cards where a flat list works
- Centered small modals for full scorecard
- Footer abandon on active scorer (lives in menu)

Details live in the components — read before copying.
