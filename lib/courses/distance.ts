export type UserCoords = { lat: number; lng: number };

/** Great-circle distance in km (WGS84 haversine). */
export function distanceKm(from: UserCoords, to: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function readDeviceLocation(): Promise<UserCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  });
}

/** Returns the closest item by haversine distance, or null when the list is empty. */
export function findNearest<T extends { lat: number; lng: number }>(
  items: readonly T[],
  from: UserCoords
): T | null {
  let nearest: T | null = null;
  let minKm = Infinity;
  for (const item of items) {
    const km = distanceKm(from, item);
    if (km < minKm) {
      minKm = km;
      nearest = item;
    }
  }
  return nearest;
}
