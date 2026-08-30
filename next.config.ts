import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  images: {
    localPatterns: [
      {
        pathname: `${basePath}/api/uploads/**`,
      },
      {
        pathname: "/api/uploads/**",
      },
      {
        pathname: `${basePath}/icons/**`,
      },
      {
        pathname: "/icons/**",
      },
      {
        pathname: `${basePath}/maps/**`,
      },
      {
        pathname: "/maps/**",
      },
    ],
  },
};

export default nextConfig;
