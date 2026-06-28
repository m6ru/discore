"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeoCoords } from "@/lib/courses/distance";

export type NearbyLocationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; coords: GeoCoords }
  | { status: "denied" }
  | { status: "unavailable" };

type UseNearbyLocationResult = {
  locationState: NearbyLocationState;
  requestLocation: () => void;
  showLocationPrompt: boolean;
};

function readPosition(): Promise<GeoCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  });
}

async function queryGeolocationPermission(): Promise<PermissionState | "unsupported"> {
  if (!navigator.permissions?.query) {
    return "unsupported";
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state;
  } catch {
    return "unsupported";
  }
}

export function useNearbyLocation(): UseNearbyLocationResult {
  const [locationState, setLocationState] = useState<NearbyLocationState>({ status: "idle" });

  const requestLocation = useCallback(() => {
    setLocationState({ status: "loading" });

    void readPosition()
      .then((coords) => {
        setLocationState({ status: "ready", coords });
      })
      .catch(() => {
        setLocationState({ status: "denied" });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const permission = await queryGeolocationPermission();
      if (cancelled) {
        return;
      }

      if (permission === "granted") {
        setLocationState({ status: "loading" });
        try {
          const coords = await readPosition();
          if (!cancelled) {
            setLocationState({ status: "ready", coords });
          }
        } catch {
          if (!cancelled) {
            setLocationState({ status: "unavailable" });
          }
        }
        return;
      }

      if (permission === "denied") {
        setLocationState({ status: "denied" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const showLocationPrompt =
    locationState.status === "idle" || locationState.status === "unavailable";

  return { locationState, requestLocation, showLocationPrompt };
}
