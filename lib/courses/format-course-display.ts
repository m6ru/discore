import type { CourseSummary } from "./types";

/** First segment of a comma-separated location string (e.g. city). */
export function formatCourseLocationShort(location: string): string {
  const trimmed = location.trim();
  if (!trimmed) {
    return "";
  }
  const commaIndex = trimmed.indexOf(",");
  if (commaIndex === -1) {
    return trimmed;
  }
  return trimmed.slice(0, commaIndex).trim();
}

export function formatLayoutCount(layoutCount: number): string {
  return layoutCount === 1 ? "1 layout" : `${layoutCount} layouts`;
}

/** Line 2 for course list rows: city · N layouts · terrain · difficulty */
export function formatCourseListMeta(course: Pick<
  CourseSummary,
  "location" | "layoutCount" | "terrainType" | "difficultyTier"
>): string {
  const parts = [
    formatCourseLocationShort(course.location),
    formatLayoutCount(course.layoutCount),
    course.terrainType?.trim(),
    course.difficultyTier?.trim(),
  ].filter((part): part is string => Boolean(part && part.length > 0));

  return parts.join(" · ");
}
