import type { MetadataRoute } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anthos",
    short_name: "Anthos",
    description: "Riego y cuidados del patio",
    start_url: basePath || "/",
    scope: basePath || "/",
    display: "standalone",
    background_color: "#edf7f0",
    theme_color: "#2f4a2f",
    lang: "es",
    icons: [
      {
        src: `${basePath}/icon.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${basePath}/icon.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
