"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  distanceKm,
  findNearest,
  formatDistanceKm,
  readDeviceLocation,
} from "@/lib/courses/distance";
import { getNearbyCoursesPreference } from "@/lib/courses/nearby-courses";
import {
  homeRowMetaClassName,
  homeRowTitleClassName,
  pagePrimaryButtonClassName,
} from "@/lib/ui/page-chrome";
import { sectionHeadingClassName } from "@/lib/ui/section-heading";
import { Button } from "@/components/ui/button";

export type NearYouCourse = {
  name: string;
  slug: string;
  lat: number;
  lng: number;
  layoutCount: number;
};

type Props = {
  courses: NearYouCourse[];
};

function formatLayoutCount(count: number): string {
  return count === 1 ? "1 layout" : `${count} layouts`;
}

export function NearYouStart({ courses }: Props) {
  const [nearest, setNearest] = useState<(NearYouCourse & { distanceKm: number }) | null>(null);

  useEffect(() => {
    if (getNearbyCoursesPreference() !== "enabled" || courses.length === 0) {
      return;
    }

    let cancelled = false;
    void readDeviceLocation()
      .then((coords) => {
        if (cancelled) {
          return;
        }
        const course = findNearest(courses, coords);
        if (course) {
          setNearest({ ...course, distanceKm: distanceKm(coords, course) });
        }
      })
      .catch(() => {
        // Keep the generic Start a round fallback.
      });

    return () => {
      cancelled = true;
    };
  }, [courses]);

  if (!nearest) {
    return (
      <Button asChild size="lg" className={pagePrimaryButtonClassName}>
        <Link href="/courses">Start a round</Link>
      </Button>
    );
  }

  const meta = [formatLayoutCount(nearest.layoutCount), formatDistanceKm(nearest.distanceKm)].join(
    " · "
  );

  return (
    <section className="space-y-2">
      <h2 className={sectionHeadingClassName}>Nearest course</h2>
      <div className="space-y-3 rounded-lg bg-muted/60 px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <p className={homeRowTitleClassName}>{nearest.name}</p>
          <p className={homeRowMetaClassName}>{meta}</p>
        </div>
        <Button asChild size="lg" className={pagePrimaryButtonClassName}>
          <Link href={`/courses/${nearest.slug}`}>Start a round</Link>
        </Button>
      </div>
    </section>
  );
}
