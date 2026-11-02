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
  homeFrameClassName,
  homeFrameLabelClassName,
  homeRowMetaClassName,
  pagePrimaryButtonClassName,
} from "@/lib/ui/page-chrome";
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

  return (
    <section className={homeFrameClassName}>
      <h2 className={homeFrameLabelClassName}>
        Nearest course · <span className="font-mono tabular-nums">{formatDistanceKm(nearest.distanceKm)}</span>
      </h2>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate font-display text-[22px] font-semibold leading-tight">{nearest.name}</p>
        <p className={homeRowMetaClassName}>{formatLayoutCount(nearest.layoutCount)}</p>
      </div>
      <Button asChild size="lg" className={pagePrimaryButtonClassName}>
        <Link href={`/courses/${nearest.slug}`}>Start a round</Link>
      </Button>
    </section>
  );
}
