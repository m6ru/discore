export type CourseSummary = {
  id: string;
  name: string;
  slug: string;
  location: string;
  lat: number | null;
  lng: number | null;
  terrainType: string | null;
  difficultyTier: string | null;
  layoutCount: number;
};
