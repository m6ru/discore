---
name: disc-golf
description: Disc golf rules, terminology and Estonian context that matter for a scoring app — PDGA penalties (OB, mandatories, drop zones, hazards, provisionals, misplays), Estonian terms, the federation and course landscape, and what casual scoring apps do. Use before designing or changing scoring, stats, course data, or any copy that names a rule.
---

# Disc golf for Discore

Researched 2026-10-21. PDGA rule text is **Official Rules of Disc Golf, rev. 1 Jan 2026**; each rule page has its own update date. Re-check the linked rule before building something that depends on its exact wording.

## 1. How a score is counted (PDGA)

- **Hole score = throws + penalty throws.** Round total = sum of hole scores + any penalty throws added to the total ([808](https://www.pdga.com/rules/official-rules-disc-golf/808)).
- **Holed out** = disc at rest supported by the tray or the chains below the chain support ([807](https://www.pdga.com/rules/official-rules-disc-golf/807)).
- In competition **every player keeps a card for the whole group** and records after each hole; warnings and penalties are noted on that hole ([808](https://www.pdga.com/rules/official-rules-disc-golf/808)). A casual app has no such duty — Discore's single scorer is fine for casual play.
- **Par is set by the organiser**, not fixed by the hole ("Par'i otsustab korraldaja") — so par can change between seasons and layouts ([811](https://www.pdga.com/rules/official-rules-disc-golf/811); [EDGL translation](https://discgolfiliit.ee/pdga-reeglid/)). This is why `hole_scores.par` snapshots the par played.

## 2. Penalties that change a hole score

| Situation | Penalty | Next lie | Rule |
|---|---|---|---|
| **Out-of-bounds (OB)** | **+1** — the normal case, including when the next throw is from the drop zone | Previous lie, or ≤ 1 m from where it last was in bounds; organiser may also allow the drop zone or ≤ 1 m from the OB line nearest the disc | [806.02](https://www.pdga.com/rules/official-rules-disc-golf/80602) D |
| *Rare:* skipping straight to an OB area's drop zone, only where the organiser announces it | +2 | Drop zone | [806.02](https://www.pdga.com/rules/official-rules-disc-golf/80602) G |
| **Missed mandatory** (disc enters the restricted plane) | +1 | Mando's drop zone, else previous lie | [804.01](https://www.pdga.com/rules/official-rules-disc-golf/80401) |
| **Hazard** | +1 | Lie stays where the disc is | [806.05](https://www.pdga.com/rules/official-rules-disc-golf/80605) |
| Required relief area | 0 | Played like OB without the penalty | [806.04](https://www.pdga.com/rules/official-rules-disc-golf/80604) |
| Casual area (e.g. water not declared in play) | 0 | Optional relief back on the line of play | [806.03](https://www.pdga.com/rules/official-rules-disc-golf/80603) |
| **Abandoned throw** | throw counts +1 | Previous lie (or a designated drop zone) | [809.01](https://www.pdga.com/rules/official-rules-disc-golf/80901) |
| Practice throw | +1 (throw not counted) | — | [809.03](https://www.pdga.com/rules/official-rules-disc-golf/80903) |
| Stance violation (tee or marked lie) | +1 | — | [802.04](https://www.pdga.com/rules/official-rules-disc-golf/80204), [802.07](https://www.pdga.com/rules/official-rules-disc-golf/80207) |
| **Lost disc** (not found within 3 min) | +1 | Previous lie, or the lost-disc drop zone if there is one | [805.03](https://www.pdga.com/rules/official-rules-disc-golf/80503) |
| Above two metres | +1, **only** if the organiser declares the rule in effect | On the ground directly below the disc | [805.02](https://www.pdga.com/rules/official-rules-disc-golf/80502) |

**Drop zone** (*karistusviskeala*) is not a penalty by itself: it is a designated place to play from, used as an option after OB, a missed mando or an abandoned throw. It is played like a tee or a marked lie ([802.07](https://www.pdga.com/rules/official-rules-disc-golf/80207)).

**Provisional throw** (*varuvise*): an alternative sequence of throws played when the ruling is unclear (e.g. disc maybe OB or lost); only one sequence counts. Not allowed for a possibly missed mando ([809.02](https://www.pdga.com/rules/official-rules-disc-golf/80902)). For scoring this means: **the app records only the final, counted score** — never two sequences.

**Incomplete / missing holes** ([811 F](https://www.pdga.com/rules/official-rules-disc-golf/811)):
- Failure to complete a hole: throws made + 1 + 2 penalty.
- Absent, missing or omitted hole: **par + 4**.
- Holes out of order: +2 to the total; scores stand.

### What this means for Discore

- `strokes` is the **total including penalties** — the number a player says aloud. Never ask casual players to split throws and penalties.
- The penalty itself is one bit per hole for casual use: the `ob` boolean ("something went wrong here") covers OB, mando and hazard alike. **Decided (owner, 2026-10-21): keep the label "OB"**: it's what Estonian players say, and mandos and hazards are rare enough to fold in. A per-penalty count or type belongs to opt-in advanced scoring (STATUS → Roadmap, "Advanced scoring"), not the default flow.
- Provisionals, abandoned throws and relief options are **decisions on the course**, not data. Don't model them.
- **Decided (owner, 2026-10-21): an unfinished hole scores par + 4**, as in tournaments ([811 F](https://www.pdga.com/rules/official-rules-disc-golf/811)). The hole then counts in totals and stats like any other score. **Not reachable today:** Discore only lets a round be completed once every player has a score on every hole, so this is the rule for a future "unfinished hole / end early" option — not a current code path.
- Simple input stays the default: no provisionals, relief options or drop zones in the data. A per-round par override (when the tee sign differs from the course data) is a cheap later addition.
- Strokes 1–25 per hole (DB check) easily covers real play.

## 3. Terminology (English → Estonian)

Estonian rule terms are from the federation's translation of the PDGA rules ([discgolfiliit.ee/pdga-reeglid](https://discgolfiliit.ee/pdga-reeglid/)); everyday terms from [et.wikipedia: Kettagolf](https://et.wikipedia.org/wiki/Kettagolf).

| English | Estonian | Notes |
|---|---|---|
| disc golf | **discgolf** (federation, clubs), kettagolf (Wikipedia, press) | Not "frisbeegolf" — that's Finnish |
| course / park | rada, discgolfipark, kettagolfipark | Course names usually end in "discgolfipark" |
| hole | rada (also korv in speech) | |
| basket | korv | "Korvid" = number of holes on a park card |
| tee / teeing area | tiiala, tii | tee shot = avavise |
| lie | viskekoht | |
| marker disc | markerketas, marker | |
| penalty throw | karistusvise | |
| out-of-bounds | OB (väljaspool mänguala) | OB-joon, OB-ala |
| mandatory (mando) | kohustuslik rajapunkt / trajektoor | "mando" is slang, not in the rules |
| drop zone | karistusviskeala (DZ) | |
| hazard / casual area / relief area | riskiala / juhuslik ala / vabastusala | |
| provisional / abandoned throw | varuvise / loovutatud vise | |
| lost disc | kadunud ketas | |
| misplay | reeglitevastane mäng | |
| par, birdie, eagle, bogey, ace | par (in the rules); the rest kept in English | Only "par" is in the translation; the others are everyday usage, not sourced |
| round | mänguring (ring in speech) | |
| scorecard | skoorikaart | |
| layout | rada / asetus (e.g. "AM asetus", "PRO asetus") | |
| putt / putting | putt / puttamine | |
| driver / midrange / putter | kaugmaaketas / keskmaaketas / lähimaaketas | |

Score names (relative to par): ace (hole-in-one, any par), albatross −3, eagle −2, birdie −1, par 0, bogey +1, double bogey +2, triple +3. Show totals as `E`, `+3`, `−2`.

**Zones** used by stats-heavy apps and by players: **Circle 1 (C1)** = within 10 m of the basket, **Circle 2 (C2)** = 10–20 m, **parked** ≈ within 3.3 m (tap-in). **C1/C2 in regulation** = reaching the circle with two throws left for par. **C1X putting** = putts from 3.3–10 m. **Scramble** = par or better after an off-fairway or OB drive. Relevant for advanced scoring.

## 4. Estonian context

- **Federation:** Eesti Discgolfi Liit (EDGL; English pages also say EDGA), founded 2014, member of the Estonian Olympic Committee; non-profit, ~45 member clubs ([discgolfiliit.ee](https://discgolfiliit.ee/), [liitumine](https://discgolfiliit.ee/liitumine/), [Wikipedia](https://en.wikipedia.org/wiki/Estonian_Disc_Golf_Association)). Runs the Estonian championships (ETMV, amateur EHTMV, doubles championship), sanctioned as PDGA events; sells a yearly player licence (€20 adults / €15 youth and 65+ in 2026) ([litsents](https://discgolfiliit.ee/litsents/)). Publishes the Estonian PDGA rules translation, course evaluation criteria and basket requirements ([dokumendid](https://discgolfiliit.ee/dokumendid/)).
- **Competitions and ratings** run on another platform the federation partners with; Discore stays out of that (no competitions, no ratings — CLAUDE.md, BLUEPRINT §1).
- **Courses:** 212 courses in 2021, 40 built that year, ~20,000 players (up from ~4,000 in 2015), popular courses crowded ([ERR, 2021](https://www.err.ee/1608222418/kettagolfi-suur-menu-on-tekitanud-radade-nappuse)); "over 200 parks" as of Jan 2025 ([et.wikipedia](https://et.wikipedia.org/wiki/Kettagolf)). Discore's catalog has ~182 parks / ~209 layouts (`supabase/seeds/courses/`).
- **Course shape:** most parks are free; some charge a small fee (≈ €1–5, sometimes with disc rental, sometimes free for campsite guests). Many parks have **AM and PRO layouts** (Järve, Maardu, Pärnu Raeküla, Annikoru) or **colour-named layouts** (Jõulumäe Kollane / Punane / Sinine). Layouts get re-set by season ("2025AM"). Mix of city parks, forest courses, farm and campsite courses, and resort courses.
- Some forest courses have been **closed for tree damage** by the Environmental Board ([et.wikipedia](https://et.wikipedia.org/wiki/Kettagolf)) — a reason course data needs `is_active` retirement rather than deletion.
- Notable venues for championships: Kõrvemaa, Alutaguse / Mäetaguse, Jõulumäe, Annikoru, Elva, Viljandi, Pärnu Jõekääru; first permanent courses Mäeotsa and Jõulumäe ([et.wikipedia](https://et.wikipedia.org/wiki/Kettagolf)).

### What this means for Discore

- UI copy in Estonian should use **discgolf**, **rada**, **korv**, **tiiala**, **karistusvise**, **OB**; keep par/birdie/bogey in English.
- Course data model already matches reality: park → layouts (AM/PRO/colour, seasonal) → holes with per-hole par. Seasonal re-sets mean new layouts or new par values, not edits to played history.
- A fee is useful course info (About text), not a feature.

## 5. What casual scoring apps do (lessons, no names)

From the leading global app and the Estonian competition platform (reviewed 2026-10-21; not named or linked here per the repo rule):

- **Default entry is one number per player per hole** with +/− and "next"; penalties are folded into that number. Detailed per-throw tracking (fairway / C1 / C2 / parked / OB) is a separate opt-in mode, often "for me only" while friends keep plain scores. → Discore: keep the default as is; advanced stats per round and per player.
- **Par per hole can be adjusted on the card** for a round. → Discore snapshots par; a per-round override is a cheap future option.
- **Team / doubles formats** (best shot, alternate shot) are scored per team and **excluded from personal stats**. → If Discore adds doubles, don't feed it into player stats.
- **Several phones can edit one live card** in the global app; the Estonian platform is "each player submits". → Discore's single scorer + read-only observers is simpler and avoids edit conflicts; keep it.
- **Offline entry with a per-hole sync status** (not sent / saving / saved / waiting for network, shown as a colour per hole) is how the Estonian platform handles bad forest coverage. → Discore's instant scoring (BLUEPRINT §3a) uses a per-round "waiting for signal · N holes" badge that never blocks input; a per-hole marker on the scorecard is a possible refinement.
- **User-submitted courses** exist in both; quality varies. → Discore's owner-reviewed suggestions (STATUS → Roadmap, "Course suggestions") are a deliberate difference.
- **Ratings** (round and player) and competitions/handicaps are the main pull of those apps. → Out of scope (Phase 6).
