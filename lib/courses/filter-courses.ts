type SearchableCourse = {
  name: string;
  location: string;
};

export function filterCoursesByQuery<T extends SearchableCourse>(
  courses: readonly T[],
  query: string,
  options?: { limit?: number }
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return [...courses];
  }

  const matched = courses.filter(
    (course) =>
      course.name.toLowerCase().includes(normalized) ||
      course.location.toLowerCase().includes(normalized)
  );

  const limit = options?.limit;
  if (limit !== undefined && limit >= 0) {
    return matched.slice(0, limit);
  }

  return matched;
}
