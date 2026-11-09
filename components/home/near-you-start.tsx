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
import { ArrowRight } from "lucide-react";
import {
  homeFrameClassName,
  homeFrameLabelClassName,
  homeFrameTitleClassName,
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
  /** Without a known location: a framed "Pick a course" (Home) or just the button (landing). */
  fallback?: "frame" | "button";
};

function formatLayoutCount(count: number): string {
  return count === 1 ? "1 layout" : `${count} layouts`;
}

function StartButton({ href }: { href: string }) {
  return (
    <Button asChild size="lg" className={`${pagePrimaryButtonClassName} justify-between px-[18px]`}>
      <Link href={href}>
        Start a round
        <ArrowRight className="size-5" aria-hidden />
      </Link>
    </Button>
  );
}

export function NearYouStart({ courses, fallback = "frame" }: Props) {
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
    if (fallback === "button") {
      return <StartButton href="/courses" />;
    }
    return (
      <section className={homeFrameClassName}>
        <h2 className={homeFrameLabelClassName}>Play</h2>
        <p className={homeFrameTitleClassName}>Pick a course</p>
        <StartButton href="/courses" />
      </section>
    );
  }

  return (
    <section className={homeFrameClassName}>
      <h2 className={homeFrameLabelClassName}>
        Nearest course
        <span className="font-mono tabular-nums">{formatDistanceKm(nearest.distanceKm)}</span>
      </h2>
      <p className={homeFrameTitleClassName}>{nearest.name}</p>
      <p className={homeRowMetaClassName}>{formatLayoutCount(nearest.layoutCount)}</p>
      <StartButton href={`/courses/${nearest.slug}`} />
    </section>
  );
}
