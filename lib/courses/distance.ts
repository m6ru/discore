const EARTH_RADIUS_KM = 6371;

export type GeoCoords = {
  lat: number;
  lng: number;
};

export type CourseWithCoords = {
  lat: number | null;
  lng: number | null;
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres between two WGS-84 points. */
export function haversineDistanceKm(from: GeoCoords, to: GeoCoords): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function courseHasCoords(course: CourseWithCoords): course is CourseWithCoords & {
  lat: number;
  lng: number;
} {
  return course.lat !== null && course.lng !== null;
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceKm)} km`;
}

export function mapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
