Create Discore course seed JSON files (`supabase/seeds/courses/`).

## One file = one layout
Same Metrix **course** can have several layouts → several JSON files.  
Each entry below is one layout.

## User provides (per layout)
1. **courseUrl** — e.g. `https://discgolfmetrix.com/course/46749`
2. **layoutName** — exact layout name you want in the app (e.g. `Discgolf.ee Männiku Wakepark 2026`)
3. **holes** — manual table: hole number, par, distance (metres). Paste as a list or table.
Example holes input:
1 4 129 2 4 124 ... 21 5 177

## Agent / assistant does
- Open **courseUrl** and read:
  - **course.name** (page title, e.g. `Männiku Wakepark`)
  - **course.location** (Location line, e.g. `Saku, Harjumaa, Estonia` — short but non-empty)
- **course.slug** — slugify `course.name` (e.g. `manniku-wakepark`)
- **layout.slug** — slugify `layoutName` (e.g. `wakepark-2026`)
- Build **holes[]** from your table (`hole_number`, `par`, `distance_m`)
- Set **layout.total_par** and **layout.total_distance_m** = sums of holes (ignore Metrix footer if it differs; note mismatch in checklist)
- **notes** and **hole_map_url**: `null`
- **map_url**: `null` unless you paste a link
- **is_active**: `true`
Do not invent hole data. If the course page is unclear, ask. If totals on the course page (e.g. Par 77, 2292m) disagree with your table, use **your table** and mention the difference in the checklist.
## JSON shape (minimal)
```json
{
  "course": {
    "name": "",
    "location": "",
    "slug": ""
  },
  "layout": {
    "name": "",
    "slug": "",
    "total_par": 0,
    "total_distance_m": 0,
    "map_url": null,
    "is_active": true
  },
  "holes": [
    { "hole_number": 1, "par": 4, "distance_m": 129, "notes": null, "hole_map_url": null }
  ]
}
Output (per layout)
One fenced JSON block
Suggested filename: {course-slug}-{layout-slug}.json
Checklist: hole count, total par, total metres, course name, layout name

---
## Example for [course/46749](https://discgolfmetrix.com/course/46749)
From that page (for the agent to fetch):
| Field | From Metrix |
|--------|-------------|
| `course.name` | Männiku Wakepark |
| `course.location` | e.g. `Saku, Männiku, Harjumaa, Estonia` (from “Location: Estonia, Harju Maakond, Saku, Männiku, Trapi tee”) |
| Summary line | 21 baskets, par 77, 2292 m — **check** against your hole table |
You still choose **layoutName** (the page lists several: 2025, 2026, Talv, etc.). Your 21-hole par/length table must match **that** layout, not another.
---
## What you do manually (minimal)
1. Pick **courseUrl** once per park (same for all layouts at that park).
2. For each layout: set **layoutName** + paste **holes** (from Metrix map table or practice screen).
3. Run the prompt in a separate chat → save each JSON under `supabase/seeds/courses/`.
4. Later: Slice D-courses import script reads those files (no Metrix fetching in the app).
---

## Coordinates (nearby sort)

Buen Kiiu: 59.43688857336663, 25.38687752540513
Haapsalu: 58.943171232588085, 23.58034820584791
Järve Talu: 59.254694916716, 24.2860837542537
Järve Tallinn: 59.37690691704653, 24.74931361143389
Keila discgolfpark: 59.316220, 24.388013
Kohila: 59.172410, 24.763018
Kurna discgolfipark: 59.339132, 24.843053
Maardu: 59.463366, 25.004581
Männiku Wakepark: 59.331007, 24.689243
Muraste: 59.456446, 24.474480
Nõva discgolfipark: 59.231773, 23.674513
Pirgu: 59.111053, 24.823458
Vasalemma: 59.233744, 24.278432
Viimsi discgolfipark: 59.497554, 24.857640



