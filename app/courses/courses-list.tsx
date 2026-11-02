"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterCoursesByQuery } from "@/lib/courses/filter-courses";
import {
  distanceKm,
  formatDistanceKm,
  readDeviceLocation,
  type UserCoords,
} from "@/lib/courses/distance";
import {
  getNearbyCoursesPreference,
  isNearbySortDisabled,
  setNearbyCoursesPreference,
} from "@/lib/courses/nearby-courses";
import type { CourseSummary } from "@/lib/courses/types";
import { Search } from "lucide-react";

type Props = {
  courses: CourseSummary[];
};

type ListCourse = CourseSummary & { distanceKm: number | null };

function formatListMeta(course: CourseSummary): string {
  const city = course.location.includes(",")
    ? course.location.slice(0, course.location.indexOf(",")).trim()
    : course.location.trim();
  const layouts = course.layoutCount === 1 ? "1 layout" : `${course.layoutCount} layouts`;
  const parts = [city, layouts, course.terrainType?.trim(), course.difficultyTier?.trim()].filter(
    Boolean
  );
  return parts.join(" · ");
}

function sortForList(courses: CourseSummary[], coords: UserCoords | null): ListCourse[] {
  const byName = (a: CourseSummary, b: CourseSummary) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

  if (!coords) {
    return [...courses].sort(byName).map((course) => ({ ...course, distanceKm: null }));
  }

  const withDistance = courses.map((course) => {
    if (course.lat === null || course.lng === null) {
      return { ...course, distanceKm: null };
    }
    return { ...course, distanceKm: distanceKm(coords, { lat: course.lat, lng: course.lng }) };
  });

  const located = withDistance
    .filter((c): c is ListCourse & { distanceKm: number } => c.distanceKm !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm || byName(a, b));
  const unlocated = withDistance
    .filter((c) => c.distanceKm === null)
    .sort(byName);

  return [...located, ...unlocated];
}

export function CoursesList({ courses }: Props) {
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [sortByDistance, setSortByDistance] = useState(() => !isNearbySortDisabled());

  useEffect(() => {
    if (!sortByDistance) {
      return;
    }

    let cancelled = false;
    const preferenceOnMount = getNearbyCoursesPreference();

    void readDeviceLocation()
      .then((position) => {
        if (cancelled) {
          return;
        }
        setCoords(position);
        if (preferenceOnMount !== "enabled") {
          setNearbyCoursesPreference("enabled");
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setCoords(null);
        if (preferenceOnMount === "unset") {
          setNearbyCoursesPreference("disabled");
          setSortByDistance(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sortByDistance]);

  const sorted = useMemo(
    () => sortForList(courses, sortByDistance && coords ? coords : null),
    [courses, sortByDistance, coords]
  );

  const isByDistance = sortByDistance && coords !== null;
  const filtered = useMemo(() => filterCoursesByQuery(sorted, query), [sorted, query]);

  return (
    <div className="space-y-4">
      <label className="flex h-12 items-center gap-2.5 rounded-md border border-input bg-card px-3.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/30">
        <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or town"
          aria-label="Search courses by name or location"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{courses.length === 0 ? "No courses available." : "No courses match your search."}</p>
          {query.trim() ? (
            <p>
              Missing a course?{" "}
              <Link
                href={`/courses/suggest?name=${encodeURIComponent(query.trim())}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Suggest “{query.trim()}”
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <section>
          <div className="flex items-center justify-between gap-3 border-b border-foreground pb-2 text-[13px] text-muted-foreground">
            <span className="font-semibold">{isByDistance ? "Nearest first" : "A–Z"}</span>
            {isByDistance ? <span>Distance</span> : null}
          </div>
          <ul>
            {filtered.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.slug}`}
                  className="flex items-center gap-3 border-b py-[13px] transition-colors hover:bg-accent/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold">{course.name}</span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                      {formatListMeta(course)}
                    </span>
                  </span>
                  {course.distanceKm !== null ? (
                    <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                      {formatDistanceKm(course.distanceKm)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
