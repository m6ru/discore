import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "discbook",
    short_name: "discbook",
    start_url: "/",
    display: "standalone",
    background_color: "#1d3a2c",
    theme_color: "#1d3a2c",
    // Drawn by scripts/generate-icons.ts. Maskable keeps the mark inside Android's safe circle.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
