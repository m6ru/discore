import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache prefetched RSC payloads for dynamic routes (all tabs are dynamic —
    // they read cookies) so re-tapping a tab renders instantly from the client
    // router cache instead of refetching. Realtime/refresh reconciles staleness.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
