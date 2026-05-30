"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { filterCoursesByQuery } from "@/lib/courses/filter-courses";
import type { CourseSummary } from "@/lib/courses/types";
import { Input } from "@/components/ui/input";

type Props = {
  courses: CourseSummary[];
};

export function CoursesList({ courses }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterCoursesByQuery(courses, query), [courses, query]);

  return (
    <div className="space-y-4">
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by course or location"
        aria-label="Search courses"
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
                className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <p className="font-medium">{course.name}</p>
                <p className="text-sm text-muted-foreground">{course.location}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {course.layoutCount === 1 ? "1 layout" : `${course.layoutCount} layouts`}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
