"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceKm } from "@/lib/courses/distance";
import { formatCourseListMeta } from "@/lib/courses/format-course-display";
import { filterCoursesByQuery } from "@/lib/courses/filter-courses";
import {
  attachCoursesWithoutDistance,
  sortCoursesByProximity,
} from "@/lib/courses/sort-courses";
import type { CourseSummary } from "@/lib/courses/types";
import { useNearbyLocation } from "@/lib/courses/use-nearby-location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  courses: CourseSummary[];
};

export function CoursesList({ courses }: Props) {
  const [query, setQuery] = useState("");
  const { locationState, requestLocation, showLocationPrompt } = useNearbyLocation();

  const sortedCourses = useMemo(() => {
    if (locationState.status === "ready") {
      return sortCoursesByProximity(courses, locationState.coords);
    }
    return attachCoursesWithoutDistance(courses);
  }, [courses, locationState]);

  const filtered = useMemo(
    () => filterCoursesByQuery(sortedCourses, query),
    [sortedCourses, query]
  );

  return (
    <div className="space-y-4">
      {showLocationPrompt ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <p className="text-sm text-muted-foreground">Show nearby courses</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={locationState.status === "loading"}
            onClick={requestLocation}
          >
            {locationState.status === "loading" ? "Locating…" : "Use my location"}
          </Button>
        </div>
      ) : null}

      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
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
                  {formatCourseListMeta(course)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
