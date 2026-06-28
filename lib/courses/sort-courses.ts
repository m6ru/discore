import { courseHasCoords, haversineDistanceKm, type GeoCoords } from "./distance";

type SortableCourse = {
  name: string;
  lat: number | null;
  lng: number | null;
};

export type CourseSortEntry<T extends SortableCourse> = T & {
  distanceKm: number | null;
};

function compareByName<T extends SortableCourse>(a: T, b: T): number {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

export function sortCoursesAlphabetically<T extends SortableCourse>(courses: readonly T[]): T[] {
  return [...courses].sort(compareByName);
}

/** Nearby courses first (by distance), then courses without coords alphabetically. */
export function sortCoursesByProximity<T extends SortableCourse>(
  courses: readonly T[],
  userCoords: GeoCoords
): CourseSortEntry<T>[] {
  const withDistance: CourseSortEntry<T>[] = courses.map((course) => {
    if (!courseHasCoords(course)) {
      return { ...course, distanceKm: null };
    }

    return {
      ...course,
      distanceKm: haversineDistanceKm(userCoords, { lat: course.lat, lng: course.lng }),
    };
  });

  const located = withDistance
    .filter((course): course is CourseSortEntry<T> & { distanceKm: number } => course.distanceKm !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm || compareByName(a, b));

  const unlocated = withDistance
    .filter((course) => course.distanceKm === null)
    .sort(compareByName);

  return [...located, ...unlocated];
}

export function attachCoursesWithoutDistance<T extends SortableCourse>(
  courses: readonly T[]
): CourseSortEntry<T>[] {
  return sortCoursesAlphabetically(courses).map((course) => ({
    ...course,
    distanceKm: null,
  }));
}
