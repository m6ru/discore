"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { findNearest, readDeviceLocation } from "@/lib/courses/distance";
import { getNearbyCoursesPreference } from "@/lib/courses/nearby-courses";
import { pagePrimaryButtonClassName } from "@/lib/ui/page-chrome";
import { Button } from "@/components/ui/button";

export type NearYouCourse = {
  name: string;
  slug: string;
  lat: number;
  lng: number;
};

type Props = {
  courses: NearYouCourse[];
};

export function NearYouStart({ courses }: Props) {
  const [nearest, setNearest] = useState<NearYouCourse | null>(null);

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
        setNearest(findNearest(courses, coords));
      })
      .catch(() => {
        // Keep the generic Start a round fallback.
      });

    return () => {
      cancelled = true;
    };
  }, [courses]);

  if (nearest) {
    return (
      <Button asChild size="lg" className={pagePrimaryButtonClassName}>
        <Link href={`/courses/${nearest.slug}`}>Play at {nearest.name}</Link>
      </Button>
    );
  }

  return (
    <Button asChild size="lg" className={pagePrimaryButtonClassName}>
      <Link href="/courses">Start a round</Link>
    </Button>
  );
}
