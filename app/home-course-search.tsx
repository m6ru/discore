"use client";

import { useMemo, useState } from "react";
import { filterCoursesByQuery } from "@/lib/courses/filter-courses";
import type { CourseSummary } from "@/lib/courses/types";
import { CourseSearchDropdown } from "@/components/courses/course-search-dropdown";
import { Input } from "@/components/ui/input";

const MIN_QUERY_LENGTH = 2;
const HUB_RESULT_LIMIT = 8;

type Props = {
  courses: CourseSummary[];
  hideLabel?: boolean;
};

export function HomeCourseSearch({ courses, hideLabel = false }: Props) {
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const showDropdown = trimmed.length >= MIN_QUERY_LENGTH;

  const results = useMemo(() => {
    if (!showDropdown) {
      return [];
    }
    return filterCoursesByQuery(courses, trimmed, { limit: HUB_RESULT_LIMIT });
  }, [courses, showDropdown, trimmed]);

  return (
    <div className="space-y-2">
      {hideLabel ? null : (
        <label htmlFor="home-course-search" className="text-sm font-medium">
          Find a course
        </label>
      )}
      <Input
        id="home-course-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by course or location"
        autoComplete="off"
      />
      {showDropdown ? (
        <div className="rounded-lg border bg-card">
          <CourseSearchDropdown courses={results} />
        </div>
      ) : null}
    </div>
  );
}
