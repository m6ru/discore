"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { filterCoursesByQuery } from "@/lib/courses/filter-courses";
import {
  getNearbyCoursesPreference,
  isNearbySortDisabled,
  setNearbyCoursesPreference,
} from "@/lib/courses/nearby-courses";
import type { CourseSummary } from "@/lib/courses/types";
import { Input } from "@/components/ui/input";

type Props = {
  courses: CourseSummary[];
};

type UserCoords = { lat: number; lng: number };

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

function formatDistanceKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function distanceKm(from: UserCoords, to: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

function readDeviceLocation(): Promise<UserCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  });
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

  const filtered = useMemo(() => filterCoursesByQuery(sorted, query), [sorted, query]);

  return (
    <div className="space-y-4">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or location"
        aria-label="Search courses by name or location"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {courses.length === 0 ? "No courses available." : "No courses match your search."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((course) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.slug}`}
                className="block rounded-lg border px-4 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate font-medium">{course.name}</p>
                  {course.distanceKm !== null ? (
                    <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                      {formatDistanceKm(course.distanceKm)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {formatListMeta(course)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
