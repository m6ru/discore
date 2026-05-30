# SPRINT-PHASE-4 — UX/UI overhaul

> This is not a sprint to ship as fast as possible. It is a deliberate frontend project with many design decisions still to make. **One step per chat. Decisions stay with the user.**

This file is the single source of truth for sprint state. [STATUS.md](STATUS.md) and [BLUEPRINT.md](BLUEPRINT.md) point at it.

---

## How to use this file

1. **Start a new chat.** Paste the role prompt below as the first message. The agent will read the docs, find the first unchecked step, and ask you any pending decision-point questions before touching code.
2. **One chat = one step.** When a step is done, the agent commits, ticks the box, fills in the Notes section, and stops. Open a new chat for the next step so context stays clean.
3. **You drive design.** The agent must not pick palettes, fonts, copy, layout patterns, icons, or component variants on your behalf. If a decision is missing from this file, the agent asks.

---

## Agent role prompt

Copy this verbatim into the first message of every new sprint chat.

````markdown
You are continuing the Discore Phase 4 UX/UI sprint. Read in this order before anything else:

1. `AGENTS.md`
2. `BLUEPRINT.md` (non-negotiable rules)
3. `STATUS.md` (current state)
4. `SPRINT-PHASE-4.md` (this sprint)

In `SPRINT-PHASE-4.md`, find the first step whose checkbox is unchecked. That is your scope for this chat. If the user named a specific step, do that one instead.

## Hard rules

- **ONE step per chat.** Do not start the next step even if the current one finishes quickly.
- **Ask before assuming.** If you are about to choose a color, font, copy string, component variant, layout pattern, icon, animation, file structure, or interaction model — STOP. List 2–3 options with one-line trade-offs. Wait for the user's answer. Do not pick on the user's behalf.
- Read the step's **Decision points** block. If anything is unresolved, ask those questions first, in one batch, before any code.
- Do **not** touch `/lib/scoring`, `supabase/migrations/`, or RLS policies.
- Do **not** reintroduce the legacy `localStorage` queue.
- Do **not** introduce Phase 6 features (ratings, tournaments, advanced stats).
- Keep `RoundStatus` strict. No `any` in `/lib/scoring`.
- After every meaningful change, all four checks must stay green: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Fix breakage before continuing.
- New dependencies require a one-line justification in the commit message.

## Closing routine (run at end of every chat)

1. Confirm the four green checks pass.
2. Commit any unstaged work. Message format: `feat(ui): step N — short description`.
3. In `SPRINT-PHASE-4.md`, tick this step's checkbox and fill in its **Notes** subsection (what you decided, what surprised you, what you'd ask next).
4. Update `STATUS.md` only if something changed outside the sprint's scope.
5. Tell the user the chat is done. Do not start the next step.
````

---

## Sprint state

- **Current step:** Step 3a — Auth + account screens
- **Last completed:** Step 2 — Install theme + primitives layer
- **Open blockers:** none

---

## Step 0 — Design foundations (decisions only, no code)

**Scope:** Lock the visual rules before installing anything. Cheap to write down now, painful to retrofit later. This step produces no code — only filled-in answer blocks below.

**Decision points (work through these as a conversation):**

### 0.1 Brand identity
- **App display name** (currently "Discore")
- **One-line tagline?** Used on PWA splash, sign-in screen, hub. Or skip entirely?
- **Logo direction:** text wordmark only / monogram (e.g. "DS") / illustrated mark (disc, basket, flight path) / commission later, ship without for v1?

### 0.2 Color palette
- **Brand/primary color:** emerald (current accent — see `RoundLifecycleActions` green buttons) / different green / teal / slate / something else?
- **Dark mode:** in v1 / deferred / never?
- **Palette source:** [tweakcn.com](https://tweakcn.com) preset / [ui.shadcn.com/themes](https://ui.shadcn.com/themes) preset / hand-tuned in `globals.css`?

### 0.3 Typography
- Currently `next/font/google` Geist Sans + Geist Mono are loaded in `app/layout.tsx`, but `app/globals.css` body rule overrides to `Arial, Helvetica, sans-serif`. **One of those is wrong** — pick which to keep.
- **Body font:** Geist Sans / Inter / Manrope / system stack / other?
- **Display font for headers:** same as body / dedicated display face / no display font?
- **Numeric font for scorecard digits:** tabular-nums variant of body / dedicated mono / Geist Mono?

### 0.4 Density and voice
- **Density:** tight (UDisc-style — more data per screen, smaller padding) / breathy (mobile-generous spacing) / between?
- **Tone of copy:** clinical/neutral sports tracker / warm/friendly local club app / playful?
- **Iconography:** lucide-only / lucide + a domain-specific set / no icons unless functional?

### 0.5 Layout patterns
- **Top-level nav on mobile:** top app bar / bottom tab bar / drawer menu / context-only (no global nav — current)?
- **Card style:** flat tinted block / hairline border / soft shadow / glass/blur?
- **Round screen primary-action placement:** top of screen / bottom-sticky save bar / floating action button?

### 0.6 Component architecture
- **shadcn primitive location:** `components/ui/` (shadcn default) — confirm?
- **Wrapping:** use shadcn primitives raw / wrap in app-specific `<AppButton>` / `<AppCard>` for default props? (raw is simpler; wrappers help if you'll repeatedly override variant + size.)
- **Shared layout primitives** (page wrapper, section wrapper, mobile screen frame): in `components/layout/` / inline / TBD?

**Sub-tasks:**
1. Agent walks user through 0.1 → 0.6, presenting 2–3 options per question with trade-offs.
2. Answers captured into the Notes block below as a permanent record.
3. No code changes. No file edits outside this document.

**Done when:**
- Every question above has a chosen answer in Notes.
- The agent has flagged any contradictions or open follow-ups.

**Notes (filled in by agent at end of chat):**

- [x] 0.1 Brand identity: Name stays **"Discore"**. **No tagline** for v1 (may add later). **No logo** for v1 — ship without; commission/design a mark later.
- [x] 0.2 Palette: Primary = **emerald** (keep current accent). Dark mode = **never** (light only — tokens live in `:root` only, no `.dark`). Palette source = **shadcn themes preset** (ui.shadcn.com/themes). NB: shadcn presets are grayscale neutral bases; the emerald accent must be set as an explicit `--primary` token on top of the chosen neutral base in Step 2.
- [x] 0.3 Typography: Body = **Manrope** (drop the `Arial` body override). Display/headers = **same as body** (Manrope, bold weights). Scorecard digits = **JetBrains Mono** (dedicated mono). Net: load Manrope + JetBrains Mono via `next/font`; **remove Geist Sans + Geist Mono** in Step 1/2.
- [x] 0.4 Density / voice: Density = **breathy** (mobile-generous spacing). Tone = **warm / friendly local club**. Iconography = **functional only** (icons only where they aid an action or navigation).
- [x] 0.5 Layout patterns: Mobile nav = **bottom tab bar**. Card style = **hairline border**. Round screen primary action = **bottom-sticky save bar**.
- [x] 0.6 Component architecture: Primitives in **`components/ui/`** (shadcn default). Use primitives **raw** (no app-specific wrappers). Shared layout primitives (page wrapper, section wrapper, mobile frame) in **`components/layout/`**.

**Open follow-ups flagged for later steps:**
1. **Step 2** — shadcn preset gives a neutral grayscale base; set emerald as an explicit `--primary`/accent token rather than expecting the preset to be green.
2. **Step 1/2** — `layout.tsx` + `globals.css` currently load Geist Sans/Mono and override body to Arial. Replace with Manrope (body + display) and JetBrains Mono (digits); delete the Arial override.
3. **Step 3c** — bottom tab bar needs its destinations decided (likely Home / New round / History / Account). Tab icons count as "functional".
4. **Bottom-edge contention** — bottom tab bar (0.5), bottom-sticky save bar (Step 6a), and Sonner toast placement (Step 2 D2) all target the bottom edge. Coordinate stacking + safe-area insets across those steps.

- [x] **Step 0 complete**

---

## Step 1 — shadcn smoke test (one button)

**Scope:** Prove the toolchain works on Next 16 + Tailwind v4 + React 19 with the chosen palette. Swap exactly one button.

**Files in scope:**
- `app/rounds/[roundId]/components/round-lifecycle-actions.tsx` — only the "Start round" button
- New: `components/ui/button.tsx` (from shadcn add)
- New: `components.json` (shadcn config)
- Possibly: `app/globals.css` (paste theme tokens), `tsconfig.json` (path aliases if needed)

**Out of scope:**
- All other screens
- All other primitives
- Any token swap inside the scorecard

**Decision points:**
- D1. Step 0 must be complete. If anything in §0.2 (palette) or §0.6 (component architecture) is unresolved, do not start.
- D2. `npx shadcn@latest init` will ask for base color + CSS variables + alias paths. Confirm answers match Step 0 decisions before running.
- D3. If shadcn init produces a `tailwind.config.*` (it shouldn't on Tailwind v4 CSS-first, but verify), surface that to the user before committing — Tailwind v4 in this repo uses `@theme inline` in `globals.css`, not a JS config.

**Sub-tasks:**
1. `npx shadcn@latest init` with answers from D2.
2. `npx shadcn@latest add button`.
3. Replace ONLY the "Start round" button in `round-lifecycle-actions.tsx`.
4. Run the four green checks.
5. Verify on a real phone via LAN URL (`npm run dev` + `--hostname 0.0.0.0`).
6. Commit.

**Done when:**
- Four checks green.
- "Start round" button visibly shadcn-styled.
- No other visual changes.
- `components.json` and `components/ui/button.tsx` committed.
- The repo still uses Tailwind v4 CSS-first theme (no `tailwind.config.*` introduced unless explicitly approved).

**Notes:**

- **Decided:** Base color = **stone** (per §0.2 "shadcn themes preset"). Theme written **light-only** — tokens in `:root` only, no `.dark` block — but kept `@custom-variant dark (&:is(.dark *))` so the Button's `dark:` utility classes stay inert instead of firing on OS dark-mode via Tailwind v4's default media query. Button uses the **default** shadcn variant (stone `--primary`) for the smoke test; the **emerald `--primary`** override is deferred to Step 2 (Step 0 follow-up #1). Aliases = standard (`@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`). Fonts done now (user opted in): **Manrope** (body+display via `--font-manrope`→`--font-sans`) + **JetBrains Mono** (`--font-jetbrains-mono`→`--font-mono`); Geist removed; Arial body override gone.
- **Surprised:** The `shadcn@4.8.3` CLI is the new BaseUI/registries era — there is **no `--base-color` flag**, `init` is interactive (prompts to overwrite `components.json`, ignored our `-y`), and `add` **skips initialization** when `components.json` already exists (it created `button.tsx` and added `radix-ui`, but did **not** write `lib/utils.ts`, the theme tokens, or install `cva`/`clsx`/`tailwind-merge`). Net: initialized **manually** — deps via `npm install class-variance-authority clsx tailwind-merge radix-ui`, and `components.json` + `lib/utils.ts` + stone tokens authored by hand (exact oklch values pulled from `ui.shadcn.com/r/colors/stone.json`). Button imports the **unified `radix-ui`** package (`Slot`) and ships extra size variants (`xs`, `icon-*`). `npx` was very slow/flaky on this machine (multiple multi-minute hangs).
- **Deferred to Step 2:** `lucide-react` + `tw-animate-css` (button needs neither); set emerald `--primary` on top of stone; confirm the primitive batch + Sonner placement before installing.
- **Ask next:** Step 2 — exact emerald token value for `--primary`/`--primary-foreground`, and whether to keep stone or swap accent-adjacent tokens (`ring`, `sidebar-*`) to match.
- **Not done by agent:** sub-task 5 (phone verify over LAN) — needs a manual check on a real device by the user.

- [x] **Step 1 complete**

---

## Step 2 — Install theme + primitives layer

**Scope:** Paste the final palette tokens into `globals.css`, install the primitives the rest of the sprint will use, mount the toast root. Do not start swapping screens yet.

**Files in scope:**
- `app/globals.css` (theme tokens — full palette from §0.2)
- `app/layout.tsx` (mount `<Toaster />`)
- `components/ui/*` (additional primitives)
- `package.json` (lucide-react)

**Out of scope:**
- Replacing any UI in `app/` beyond mounting the Toaster
- Touching `scorecard-segment.tsx`

**Decision points:**
- D1. Which primitives to install now vs defer? Proposed default set: `input`, `label`, `card`, `dialog`, `alert-dialog`, `sonner`, `select`, `switch`, `badge`, `separator`, `dropdown-menu`, `form`, `command`. Confirm or trim.
- D2. Toast placement: bottom-center (Sonner default), bottom-right, or top? On mobile bottom-center may collide with the planned sticky save bar (Step 6a).
- D3. Confirm icon library: `lucide-react`. Any prior choice in §0.4 overrides this.

**Sub-tasks:**
1. Paste full palette CSS variables into `app/globals.css` under `:root` (and `.dark` if dark mode chosen in §0.2).
2. `npx shadcn@latest add` for each confirmed primitive.
3. `npm install lucide-react`.
4. Mount `<Toaster />` in `app/layout.tsx` with chosen placement.
5. Run four checks. Verify on phone — only visible change should be that previously-shadcn'd Start-round button now reflects the final theme.
6. Commit (one commit per primitive batch is fine).

**Done when:**
- All chosen primitives present in `components/ui/`.
- Toaster mounted, no errors in console.
- Step 1's button still works and now reflects final theme.
- Four green checks.

**Notes:**

- **Decided (palette):** `--primary` + `--primary-foreground` swapped from stone to **emerald-700** (`oklch(0.508 0.118 165.612)` / light foreground unchanged). `--ring` also set to emerald-700 so focus rings match the brand. `--accent`, `--sidebar-*`, and the rest stay **stone** (user chose "emerald on --primary + --ring" only — most contained). `@theme inline` + `.dark` handling untouched from Step 1; still light-only.
- **Decided (primitives):** installed the **full** proposed set — `input`, `label`, `card`, `dialog`, `alert-dialog`, `sonner`, `select`, `switch`, `badge`, `separator`, `dropdown-menu`, `form`, `command`. 13 files created in `components/ui/`; `button.tsx` left intact.
- **Decided (toast):** `<Toaster position="bottom-center" theme="light" />` mounted in `app/layout.tsx`. User picked bottom-center despite the noted bottom-edge contention — see follow-up #1.
- **Decided (icons):** confirmed **lucide-react** (matches §0.4 + `components.json`); installed.
- **Surprised:** the `shadcn add` CLI ran cleanly this time (~20s, no hangs) and auto-installed transitive deps via npm: `sonner`, `cmdk`, `react-hook-form`, `@hookform/resolvers`, `zod`, **and `next-themes`**. It did **not** install `lucide-react` even though `sonner.tsx` imports from it — installed that separately. The generated `sonner.tsx` reads `useTheme()` from `next-themes` (defaults to `"system"`), which would follow OS dark mode and produce dark toasts on a light-only app; overrode by passing `theme="light"` at the mount point rather than editing the standard shadcn file.
- **Ask next (Step 3a):** with the emerald primary live, confirm whether form-screen accents (links, focused inputs) should lean on `--primary` (emerald) or stay neutral. Also decide Step 3a D1–D4 (sign-in/up pattern, required-field treatment, account layout, inline-vs-toast status).

**Open follow-ups flagged for later steps:**
1. **Step 6a / Step 3c** — bottom-center toasts will overlap the planned sticky save bar (Step 6a) and bottom tab bar (Step 3c). Coordinate stacking / `offset` / safe-area when those land; may need to lift toast offset or move it conditionally on the round screen.
2. **`next-themes`** is now an indirect dependency (pulled by the sonner primitive). It is unused beyond the forced-light Toaster. Leave installed (standard shadcn surface); revisit only if a future step wants a real theme provider — which §0.2 says it won't (dark mode never).

- [x] **Step 2 complete**

---

## Step 3a — Auth + account screens

**Scope:** Sign-in / sign-up form and the account-edit panel. Logic stays untouched.

**Files in scope:**
- `app/auth/auth-form.tsx`
- `app/auth/account-panel.tsx`
- `app/auth/page.tsx` (only if layout needs adjustment)

**Out of scope:**
- Any logic, validation, or Supabase call changes
- Avatar upload flow internals
- All other screens

**Decision points:**
- D1. Sign-in vs sign-up: keep current "switch link" pattern, use shadcn `Tabs`, or two-step (email-first, then password/profile)?
- D2. First-name / last-name fields: required visual treatment (asterisk, helper text, or rely on `required` attribute only)?
- D3. Account panel layout: single column / two-column on desktop / card-per-section?
- D4. Status messages: inline below form (current) — or migrate to Sonner now? (Toasts arrive in Step 5; current chat may keep inline + flag for Step 5.)

**Sub-tasks:**
1. Walk decision points with user.
2. Convert auth-form to shadcn `Form` + `Input` + `Label` + `Button` per chosen layout.
3. Convert account-panel similarly. Use `Select` for gender.
4. Eyeball on phone. Verify focus rings, keyboard behavior, autofill, password manager interaction.
5. Four checks. Commit.

**Done when:**
- Both screens use shadcn primitives exclusively for form controls.
- No regression in sign-up flow (first/last name still required, still propagates to `display_name`).
- Phone-tested.

**Notes:**

(empty)

- [ ] **Step 3a complete**

---

## Step 3b — Round creation + draft setup

**Scope:** `/rounds/new` and draft-round participant management.

**Files in scope:**
- `app/rounds/new/create-round-form.tsx`
- `app/rounds/[roundId]/components/draft-participant-form.tsx`
- `app/rounds/[roundId]/components/draft-participants-list.tsx` (if exists)

**Out of scope:**
- Layout-grouping logic on `/rounds/new` — that's Step 7.

**Decision points:**
- D1. Layout dropdown: shadcn `Select` (simple) or `Command` combobox with search (good for many layouts)?
- D2. Profile search results in `draft-participant-form`: `Command` palette, inline list, or `Popover` + search input?
- D3. Guest add: same form as profile search, or visually separated section?
- D4. Empty states: when no participants yet — placeholder text, illustration, or nothing?

**Sub-tasks:**
1. Walk decisions with user.
2. Convert create-round-form per D1.
3. Convert draft-participant-form per D2 + D3.
4. Phone-test add/remove participant + invite flow end-to-end.
5. Four checks. Commit.

**Done when:**
- Both forms use shadcn primitives.
- Invite flow + guest add still works (round_invitations + round_participants both insert correctly).
- Phone-tested.

**Notes:**

(empty)

- [ ] **Step 3b complete**

---

## Step 3c — Hub + history list

**Scope:** Home hub and the past-rounds history page.

**Files in scope:**
- `app/page.tsx`
- `app/home-invites.tsx`
- `app/rounds/page.tsx`

**Out of scope:**
- Any change to invite logic or RLS reads.

**Decision points:**
- D1. Hub section structure: stacked Cards / tabs / hero + cards?
- D2. "Resume active round" treatment: prominent CTA card, banner at top, or just a card in the list?
- D3. Invite cards: accept/decline as Buttons, or one Card + dropdown menu (`...`)? Risk of accidental accept on tiny targets.
- D4. History rows: card per round (richer, more vertical space) or table (compact)?
- D5. Status visualisation per round: `Badge` (text only) or `Badge` + dot color?

**Sub-tasks:**
1. Walk decisions with user.
2. Convert hub layout per D1/D2.
3. Convert home-invites cards per D3.
4. Convert history per D4/D5.
5. Phone-test the full hub flow.
6. Four checks. Commit.

**Done when:**
- All three pages use shadcn primitives.
- Realtime invite arrival still updates the hub (don't break the subscription).
- Phone-tested.

**Notes:**

(empty)

- [ ] **Step 3c complete**

---

## Step 3d — Round screen chrome

**Scope:** Round page header, lifecycle actions, status banner. **Active hole scoring + scorecard table are Steps 6a/6b — do not touch them here.**

**Files in scope:**
- `app/rounds/[roundId]/page.tsx` (header markup only)
- `app/rounds/[roundId]/components/round-lifecycle-actions.tsx`
- `app/rounds/[roundId]/components/round-status-banner.tsx`

**Out of scope:**
- `active-hole-scoring.tsx`
- `scorecard-section.tsx` / `scorecard-segment.tsx`
- `window.confirm` swap — that's Step 4
- Inline status → toast migration — that's Step 5

**Decision points:**
- D1. Header layout: course/layout name + status badge stacked, side-by-side, or two-line with breadcrumb-style separator?
- D2. Lifecycle action grouping: inline button row, dropdown menu (`...`), or split (primary inline + destructive in menu)?
- D3. Destructive button treatment: shadcn `destructive` variant, outlined danger, or text-only with confirmation in Step 4?

**Sub-tasks:**
1. Walk decisions.
2. Convert header per D1.
3. Convert lifecycle actions per D2/D3 — but keep `window.confirm` for now (Step 4 replaces it).
4. Convert status banner shell — keep inline status for now (Step 5 replaces it).
5. Phone-test.
6. Four checks. Commit.

**Done when:**
- Round page chrome uses shadcn primitives.
- Scorecard and active-hole-scoring visually unchanged (token-only via globals.css inheritance — fine).
- Phone-tested.

**Notes:**

(empty)

- [ ] **Step 3d complete**

---

## Step 4 — AlertDialog for destructive actions

**Scope:** Replace every `window.confirm` with a shadcn `AlertDialog`. Confirmation becomes a UI concern; hooks expose the bare action.

**Sites:**
- `app/rounds/[roundId]/hooks/use-draft-setup.ts::onDeleteDraft`
- `app/rounds/[roundId]/hooks/use-round-lifecycle.ts::onAbandonRound`
- `app/rounds/[roundId]/hooks/use-round-lifecycle.ts::onCompleteRound`

**Out of scope:**
- Any other destructive flow (none currently exists).

**Decision points:**
- D1. Copy tone per action — exact title + description text for each of the three dialogs. Should match the voice chosen in §0.4.
- D2. Hook refactor: remove `confirm()` from hooks entirely and add a new `confirm` decision into the consuming component, OR keep `confirm()` as a fallback for now. Cleanest is removal.
- D3. "Are you sure?" button copy: action-specific ("Abandon round" / "Complete round" / "Delete draft") or generic ("Confirm")?

**Sub-tasks:**
1. Walk copy decisions (D1 + D3).
2. Refactor each hook to expose the bare action.
3. Add `<AlertDialog>` in the calling component, wired to the action.
4. Phone-test each flow end-to-end.
5. Verify no `window.confirm` calls remain anywhere in `app/`.
6. Four checks. Commit.

**Done when:**
- Zero `window.confirm` in `app/` (verifiable via grep).
- Each destructive flow opens a dialog, completes the action on confirm, no-ops on cancel.
- Phone-tested.

**Notes:**

(empty)

- [ ] **Step 4 complete**

---

## Step 5 — Toast layer

**Scope:** Replace inline status banners with Sonner toasts. Persistent indicators stay inline.

**Sites for toasts:**
- `RoundStatusBanner.status` (round-level error/info string)
- `AuthForm.status`
- `AccountPanel.status` and `passwordStatus`
- `CreateRoundForm.error`
- `HomeInvites.status`
- Save-failure messages from `use-active-scoring.ts`

**Stays inline:**
- `lastSavedLabel` (persistent state, not a one-shot event)

**Out of scope:**
- Toast styling beyond shadcn/Sonner defaults from Step 2.

**Decision points:**
- D1. Toast variant per source: which become `toast.success`, `toast.error`, `toast.info`, `toast.warning`?
- D2. Duration: defaults / shorter / longer? Action-failure toasts may want manual-dismiss.
- D3. Dedup behavior: should rapid save-fail repeats collapse to one toast?

**Sub-tasks:**
1. Walk D1–D3.
2. Replace each `status` string state with a toast call at the point the status is set.
3. Remove now-dead status-display markup.
4. Phone-test each path (force a save failure with devtools-network-throttled offline).
5. Four checks. Commit.

**Done when:**
- All listed sites use toasts.
- `lastSavedLabel` still renders inline.
- Phone-tested with network throttling.

**Notes:**

(empty)

- [ ] **Step 5 complete**

---

## Step 6a — Round screen mobile UX (active hole scoring)

**Scope:** The highest-leverage screen. Sticky save bar, proper touch targets, better OB control, hole-progress polish.

**Files in scope:**
- `app/rounds/[roundId]/components/active-hole-scoring.tsx`
- `app/rounds/[roundId]/round-session.tsx` (only if layout container needs adjustment)

**Out of scope:**
- `scorecard-segment.tsx` (next step)
- Front-9 / final summary cards (consider as part of this step only if decision D5 says so)

**Decision points:**
- D1. Sticky save bar: `position: sticky` inside a flex/grid container OR `position: fixed` with safe-area padding? iOS Safari has known quirks — research before deciding.
- D2. Stroke input control: native `<input type="number">` styled, custom +/- stepper buttons, or large tap-targets with two columns of stroke choices? UDisc uses big buttons.
- D3. OB control: shadcn `Switch`, `Toggle` (single button on/off), or `Checkbox`?
- D4. Hole stepper / progress dots: keep "dot per hole" current pattern, swap to numbered chips, or a horizontal carousel?
- D5. Front-9 and final-summary cards: include in this step, or defer to a Step 6c?
- D6. Hole nav (back / forward): visible buttons, edge swipe, both, or button-only (safer on mobile)?

**Sub-tasks:**
1. Walk decisions with user. Probably the longest decision conversation in the sprint.
2. Implement sticky save bar (D1).
3. Implement stroke input pattern (D2).
4. Swap OB control (D3).
5. Polish hole progress (D4).
6. Hole nav controls (D6).
7. **Phone-test by simulating a full round** in dev. Pay attention to one-handed thumb reach.
8. Four checks. Commit.

**Done when:**
- Sticky save bar works on both iOS Safari and Android Chrome.
- Stroke targets are ≥44×44.
- OB control is touch-friendly.
- A full simulated round saves cleanly.

**Notes:**

(empty)

- [ ] **Step 6a complete**

---

## Step 6b — Scorecard token swap (keep layout, swap colors)

**Scope:** The bespoke scorecard table keeps its layout (sticky first column, horizontal scroll). Only swap hard-coded color classes for theme tokens so the palette propagates.

**Files in scope:**
- `app/rounds/[roundId]/components/scorecard-segment.tsx`
- `app/rounds/[roundId]/components/scorecard-section.tsx` (chrome around the segments)

**Out of scope:**
- Any structural change to the table layout. If something feels structurally wrong, surface it; don't fix it here.

**Decision points:**
- D1. Mapping: what current color does what theme token replace? (e.g. `bg-zinc-50` → `bg-muted`, `text-zinc-900` → `text-foreground`, accent for current hole → `text-primary`.) Agent should propose a full mapping table for user approval before editing.
- D2. Eagle / birdie / bogey / double markers: keep current treatment (e.g. ring around the cell) or introduce shadcn badge-like chips? Token swap may not need this — flag for a future polish step if so.

**Sub-tasks:**
1. Agent proposes mapping table (D1) and any scoring-mark treatment idea (D2).
2. User approves.
3. Apply the mapping. No layout changes.
4. Phone-test horizontal scroll + sticky-column behavior.
5. Four checks. Commit.

**Done when:**
- No hard-coded `zinc-*` / `slate-*` / `emerald-*` color classes remain in the scorecard files — all colors flow from theme tokens.
- Scorecard layout visually unchanged.
- Phone-tested scroll.

**Notes:**

(empty)

- [ ] **Step 6b complete**

---

## Step 7 — Layout picker grouping

**Scope:** `/rounds/new` currently lists all 18 layouts flat. Group by course.

**Files in scope:**
- `app/rounds/new/page.tsx` (server fetch — group on server)
- `app/rounds/new/create-round-form.tsx`

**Out of scope:**
- Any other change on `/rounds/new`.

**Decision points:**
- D1. Pattern: shadcn `Select` with grouped headings (single dropdown) / two-step picker (course → layout) / `Command` palette with grouped sections / search-first input?
- D2. Sort order within each course: by layout name alphabetical, by total par, by total distance?
- D3. Course sort order: alphabetical, by user's prior usage frequency, by proximity (future)?

**Sub-tasks:**
1. Walk decisions.
2. Group the server-side fetch by course.
3. Implement chosen pattern (D1).
4. Phone-test on a real device — thumb reach matters here.
5. Four checks. Commit.

**Done when:**
- Layouts grouped by course.
- Selection still posts the correct `layout_id`.
- Phone-tested.

**Notes:**

(empty)

- [ ] **Step 7 complete**

---

## Step 8 — PWA shell

**Scope:** Wire up the service worker and manifest. Make install-to-home-screen work.

**Files in scope:**
- `next.config.ts` (Serwist integration)
- `app/manifest.ts` (full PWA manifest)
- `public/icons/*` (new icon assets — 192, 512, maskable variants)
- `app/layout.tsx` (theme-color meta if not set by manifest alone)

**Out of scope:**
- Offline sync (per BLUEPRINT §3a: not a goal).
- Push notifications.

**Decision points:**
- D1. Icon design: simple text monogram on brand color / illustrated mark from §0.1 / placeholder until logo is commissioned?
- D2. Maskable safe area: standard 80% / aggressive 70% / conservative 90%?
- D3. App orientation: portrait-only (matches mobile usage) or unrestricted?
- D4. PWA name / short name copy.
- D5. Splash screen background color — usually matches manifest `background_color`. Confirm against §0.2.

**Sub-tasks:**
1. Walk decisions.
2. Read `node_modules/@serwist/next/dist/docs/` for the current Next 16 integration pattern (AGENTS.md rule). Surface any surprises to user before changing `next.config.ts`.
3. Implement Serwist config.
4. Generate icons (or use placeholder if D1 says so).
5. Fill out `app/manifest.ts` with all chosen values.
6. **Test install on both iOS Safari and Android Chrome.** Confirm splash, icon, theme color, orientation.
7. Validate manifest in Chrome DevTools → Application → Manifest.
8. Four checks. Commit.

**Done when:**
- Install prompt visible on a mobile browser.
- Installed app launches with splash screen, correct icon, correct theme color.
- Manifest validates with zero warnings in Chrome DevTools.
- STATUS.md Phase 4 row updated to **Done**.

**Notes:**

(empty)

- [ ] **Step 8 complete**

---

## After the sprint

- STATUS.md "Phase 4" row → **Done**, with a brief retrospective bullet.
- BLUEPRINT.md unchanged (the stack additions for shadcn + lucide are already in §2).
- Re-run a full field test on course with two phones (per the original STATUS deferred item).
- Open conversation for what's next: Phase 5 (richer stats) or a UX polish round informed by the field test.
