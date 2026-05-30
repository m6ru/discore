"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";

type CourseSearchResult = {
  id: string;
  name: string;
  slug: string;
  location: string;
};

type Props = {
  enabled: boolean;
};

export function HomeCourseSearch({ enabled }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourseSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const trimmed = query.trim();
  const showDropdown = enabled && trimmed.length >= 2;

  useEffect(() => {
    if (!enabled || trimmed.length < 2) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug, location")
        .ilike("name", `%${trimmed}%`)
        .order("name", { ascending: true })
        .limit(8);

      if (!error) {
        setResults((data ?? []) as CourseSearchResult[]);
      } else {
        setResults([]);
      }
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [trimmed, enabled, supabase]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="space-y-2">
      <label htmlFor="home-course-search" className="text-sm font-medium">
        Find a course
      </label>
      <Input
        id="home-course-search"
        type="search"
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          if (next.trim().length < 2) {
            setResults([]);
            setIsSearching(false);
          }
        }}
        placeholder="Type a course name"
        autoComplete="off"
      />
      {showDropdown ? (
        <div className="rounded-lg border bg-card">
          {isSearching ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
          ) : results.length > 0 ? (
            <ul className="max-h-48 overflow-auto">
              {results.map((course) => (
                <li key={course.id} className="border-b last:border-b-0">
                  <Link
                    href={`/courses/${course.slug}`}
                    className="block px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{course.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {course.location}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">No courses found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
