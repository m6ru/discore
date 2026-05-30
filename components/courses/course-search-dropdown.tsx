import Link from "next/link";
import type { CourseSummary } from "@/lib/courses/types";

type Props = {
  courses: CourseSummary[];
  emptyMessage?: string;
};

export function CourseSearchDropdown({
  courses,
  emptyMessage = "No courses found.",
}: Props) {
  if (courses.length === 0) {
    return <p className="px-3 py-2 text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="max-h-48 overflow-auto">
      {courses.map((course) => (
        <li key={course.id} className="border-b last:border-b-0">
          <Link
            href={`/courses/${course.slug}`}
            className="block px-3 py-2 text-sm hover:bg-muted/50"
          >
            <span className="font-medium">{course.name}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{course.location}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
