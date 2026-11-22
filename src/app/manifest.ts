import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Footy Tips",
    short_name: "Footy Tips",
    description: "Rugby league tipping with friends, family and everyone else.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#0b7a43",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
