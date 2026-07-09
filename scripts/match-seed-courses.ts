import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CourseSeedFile } from "../lib/courses/seed-types";

type CourseAgg = {
  slug: string;
  name: string;
  location: string;
  lat: number | null;
  lng: number | null;
  layouts: string[];
  files: string[];
};

function loadCourses(dir: string): CourseAgg[] {
  const map = new Map<string, CourseAgg>();

  for (const name of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "_template.json")) {
    const data = JSON.parse(readFileSync(join(dir, name), "utf8")) as CourseSeedFile;
    const slug = data.course.slug;
    const existing = map.get(slug);
    if (existing) {
      existing.layouts.push(data.layout.slug);
      existing.files.push(name);
      continue;
    }
    map.set(slug, {
      slug,
      name: data.course.name,
      location: data.course.location,
      lat: data.course.lat,
      lng: data.course.lng,
      layouts: [data.layout.slug],
      files: [name],
    });
  }

  return [...map.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLng = (lng2 - lng1) * p;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 80;
  const aw = new Set(na.split(" ").filter((w) => w.length > 2));
  const bw = new Set(nb.split(" ").filter((w) => w.length > 2));
  let shared = 0;
  for (const w of aw) if (bw.has(w)) shared += 1;
  return Math.round((shared / Math.max(aw.size, bw.size, 1)) * 60);
}

function slugBase(slug: string): string {
  return slug
    .replace(/-(edasijoudnute|harjutus|harrastajad|pro|am|am-asetus|pro-asetus|18-korvi|9-korvi|12-korvi|b-asetus|a-asetus|kollane|punane|sinine|must|valge|dg-park)$/i, "")
    .replace(/-(edasijoudnute|harjutus|harrastajad|pro|kollane)$/i, "");
}

type ReviewGroup = {
  id: string;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "REVIEW";
  reason: string[];
  members: CourseAgg[];
  maxDistM: number;
  suggestedCanonical: string;
};

function buildSplitReviewGroups(courses: CourseAgg[]): ReviewGroup[] {
  const withCoords = courses.filter((c) => c.lat != null && c.lng != null);
  const parent = new Map<string, string>();

  function find(slug: string): string {
    const p = parent.get(slug);
    if (!p || p === slug) return slug;
    const root = find(p);
    parent.set(slug, root);
    return root;
  }

  function unite(a: string, b: string): void {
    parent.set(find(a), find(b));
  }

  for (const c of withCoords) parent.set(c.slug, c.slug);

  const pairReasons = new Map<string, string[]>();

  function pairKey(a: string, b: string): string {
    return [a, b].sort().join("||");
  }

  function note(a: string, b: string, reason: string): void {
    const key = pairKey(a, b);
    const list = pairReasons.get(key) ?? [];
    list.push(reason);
    pairReasons.set(key, list);
  }

  for (let i = 0; i < withCoords.length; i += 1) {
    for (let j = i + 1; j < withCoords.length; j += 1) {
      const a = withCoords[i];
      const b = withCoords[j];
      if (a.slug === b.slug) continue;

      const dist = haversineM(a.lat!, a.lng!, b.lat!, b.lng!);
      const nscore = nameScore(a.name, b.name);
      const locscore = nameScore(a.location, b.location);
      const baseA = slugBase(a.slug);
      const baseB = slugBase(b.slug);
      const slugPrefix =
        a.slug.startsWith(b.slug) ||
        b.slug.startsWith(a.slug) ||
        (baseA.length > 8 && baseB.length > 8 && (baseA.startsWith(baseB) || baseB.startsWith(baseA)));

      let link = false;
      if (dist <= 150 && (nscore >= 50 || locscore >= 50 || slugPrefix)) {
        link = true;
        note(a.slug, b.slug, `${dist}m + name/loc/slug similarity`);
      } else if (dist <= 500 && nscore >= 40) {
        link = true;
        note(a.slug, b.slug, `${dist}m + name score ${nscore}`);
      } else if (dist <= 500 && slugPrefix) {
        link = true;
        note(a.slug, b.slug, `${dist}m + shared slug prefix`);
      } else if (dist <= 300 && locscore >= 50) {
        link = true;
        note(a.slug, b.slug, `${dist}m + location score ${locscore}`);
      } else if (nscore >= 80 && dist <= 2000) {
        link = true;
        note(a.slug, b.slug, `${dist}m + strong name match (${nscore})`);
      }

      if (link) unite(a.slug, b.slug);
    }
  }

  const groups = new Map<string, CourseAgg[]>();
  for (const c of withCoords) {
    const root = find(c.slug);
    const list = groups.get(root) ?? [];
    list.push(c);
    groups.set(root, list);
  }

  const result: ReviewGroup[] = [];

  for (const members of groups.values()) {
    const unique = [...new Map(members.map((m) => [m.slug, m])).values()];
    if (unique.length < 2) continue;

    let maxDistM = 0;
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        maxDistM = Math.max(
          maxDistM,
          haversineM(unique[i].lat!, unique[i].lng!, unique[j].lat!, unique[j].lng!),
        );
      }
    }

    const reasons = new Set<string>();
    for (let i = 0; i < unique.length; i += 1) {
      for (let j = i + 1; j < unique.length; j += 1) {
        for (const r of pairReasons.get(pairKey(unique[i].slug, unique[j].slug)) ?? []) {
          reasons.add(r);
        }
      }
    }

    const minLayouts = Math.min(...unique.map((m) => m.layouts.length));
    const suggestedCanonical =
      unique
        .slice()
        .sort((a, b) => {
          const layoutCount = b.layouts.length - a.layouts.length;
          if (layoutCount !== 0) return layoutCount;
          return a.slug.length - b.slug.length;
        })[0]?.slug ?? unique[0].slug;

    let confidence: ReviewGroup["confidence"] = "REVIEW";
    const avgName =
      unique.length === 2
        ? nameScore(unique[0].name, unique[1].name)
        : Math.max(...unique.map((a, i) => unique.slice(i + 1).map((b) => nameScore(a.name, b.name))).flat());

    if (maxDistM <= 100 && (avgName >= 60 || unique.every((m) => normalize(m.name).includes(normalize(unique[0].name).split(" ")[0])))) {
      confidence = "HIGH";
    } else if (maxDistM <= 500 && avgName >= 40) {
      confidence = "MEDIUM";
    } else if (maxDistM <= 500) {
      confidence = "LOW";
    }

    const id = unique
      .map((m) => m.slug)
      .sort()
      .join("+")
      .slice(0, 60);

    result.push({
      id,
      confidence,
      reason: [...reasons],
      members: unique.sort((a, b) => a.slug.localeCompare(b.slug)),
      maxDistM,
      suggestedCanonical,
    });
  }

  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2, REVIEW: 3 };
  return result.sort((a, b) => rank[a.confidence] - rank[b.confidence] || a.maxDistM - b.maxDistM);
}

const existingDir = join(process.cwd(), "supabase/seeds/courses");
const scraperDir = process.argv[2] ?? "C:/Users/Kristjan/Documents/KOOD/scraper/discore-seeds";

const existing = loadCourses(existingDir);
const scraper = loadCourses(scraperDir);

if (process.argv.includes("--split-review")) {
  const seedsDir = process.argv[2] ?? existingDir;
  const courses = loadCourses(seedsDir);
  const groups = buildSplitReviewGroups(courses);

  console.log(`# Suspected venue splits (${groups.length} groups from ${courses.length} course slugs)\n`);
  console.log(`Review each group: merge into one course.slug with multiple layout.slug values.\n`);

  let n = 1;
  for (const g of groups) {
    console.log(`## ${n}. [${g.confidence}] ${g.members.map((m) => m.name).join(" / ")}`);
    console.log(`- Max distance within group: ${g.maxDistM}m`);
    console.log(`- Suggested canonical slug: \`${g.suggestedCanonical}\``);
    console.log(`- Signals: ${g.reason.join("; ")}`);
    console.log(`- Members:`);
    for (const m of g.members) {
      const layoutDetail = m.layouts.join(", ");
      console.log(`  - \`${m.slug}\` — layouts: ${layoutDetail} — ${m.location}`);
    }
    const allLayouts = g.members.flatMap((m) => m.layouts);
    console.log(`- After merge layouts: ${allLayouts.join(", ")}`);
    console.log(`- Merge from slugs: ${g.members.filter((m) => m.slug !== g.suggestedCanonical).map((m) => `\`${m.slug}\``).join(", ") || "(pick canonical)"}`);
    console.log("");
    n += 1;
  }
  process.exit(0);
}

if (process.argv.includes("--dupe-scan")) {
  console.log("=== DUPLICATE RISK: scraper course within 500m of existing, different slug ===\n");
  for (const s of scraper) {
    if (s.lat == null || s.lng == null) continue;
    for (const e of existing) {
      if (e.lat == null || e.lng == null) continue;
      const dist = haversineM(e.lat, e.lng, s.lat, s.lng);
      if (dist <= 500 && e.slug !== s.slug) {
        console.log(
          `${dist}m | existing=${e.slug} (${e.layouts.join(",")}) | scraper=${s.slug} (${s.layouts.join(",")})`,
        );
      }
    }
  }
  process.exit(0);
}

console.log(`EXISTING_COURSES=${existing.length} SCRAPER_COURSES=${scraper.length}\n`);

for (const e of existing) {
  console.log(`\n=== ${e.slug} ===`);
  console.log(`existing: ${e.name}`);
  console.log(`location: ${e.location}`);
  console.log(`coords: ${e.lat ?? "null"}, ${e.lng ?? "null"}`);
  console.log(`layouts: ${e.layouts.join(", ")}`);

  const ranked = scraper
    .map((s) => {
      const dist =
        e.lat != null && e.lng != null && s.lat != null && s.lng != null
          ? haversineM(e.lat, e.lng, s.lat, s.lng)
          : null;
      const nscore = nameScore(e.name, s.name);
      const locscore = nameScore(e.location, s.location);
      let verdict = "UNLIKELY";
      if (e.slug === s.slug) verdict = "SAME_SLUG";
      else if (dist != null && dist < 300) verdict = "LIKELY_SAME_VENUE";
      else if (dist != null && dist < 1500 && nscore >= 40) verdict = "POSSIBLE_SAME";
      else if (dist != null && dist < 3000) verdict = "NEARBY";
      else if (nscore >= 50) verdict = "NAME_MATCH_ONLY";

      return { ...s, dist, nscore, locscore, verdict };
    })
    .filter((s) => s.verdict !== "UNLIKELY" || s.dist == null || s.dist <= 8000 || s.nscore >= 35)
    .sort((a, b) => {
      const rank = (v: string) =>
        ({
          SAME_SLUG: 0,
          LIKELY_SAME_VENUE: 1,
          POSSIBLE_SAME: 2,
          NAME_MATCH_ONLY: 3,
          NEARBY: 4,
          UNLIKELY: 5,
        })[v as keyof object] ?? 9;
      const d = rank(a.verdict) - rank(b.verdict);
      if (d !== 0) return d;
      return (a.dist ?? 99_999) - (b.dist ?? 99_999);
    })
    .slice(0, 5);

  if (ranked.length === 0) {
    console.log("matches: none");
    continue;
  }

  console.log("top scraper matches:");
  for (const m of ranked) {
    console.log(
      `  [${m.verdict}] ${m.dist != null ? `${m.dist}m` : "no-coords"} | slug=${m.slug} | ${m.name} | nameScore=${m.nscore} | layouts=${m.layouts.join(", ")}`,
    );
  }
}
