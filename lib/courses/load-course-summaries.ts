import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CourseSummary } from "./types";

type Client = SupabaseClient<Database>;

export async function loadCourseSummaries(supabase: Client) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, slug, location, layouts(id, is_active)")
    .order("name", { ascending: true });

  if (error) {
    return { courses: null, error };
  }

  const courses: CourseSummary[] = (data ?? []).map((course) => ({
    id: course.id,
    name: course.name,
    slug: course.slug,
    location: course.location,
    layoutCount: (course.layouts ?? []).filter((layout) => layout.is_active).length,
  }));

  return { courses, error: null };
}
