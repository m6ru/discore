export type CourseSeed = {
  name: string;
  location: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  details: string | null;
  terrain_type: string | null;
  difficulty_tier: string | null;
  source_url?: string | null;
};

export type LayoutSeed = {
  name: string;
  slug: string;
  total_par: number;
  total_distance_m: number;
  map_url: string | null;
  is_active: boolean;
};

export type HoleSeed = {
  hole_number: number;
  par: number;
  distance_m: number;
  notes: string | null;
  hole_map_url: string | null;
};

export type CourseSeedFile = {
  course: CourseSeed;
  layout: LayoutSeed;
  holes: HoleSeed[];
};

/** Legacy migration slugs → canonical JSON course slug */
export const LEGACY_COURSE_SLUG_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "jarve-discgolfipark": ["jarve"],
};
