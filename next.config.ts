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
    ],
  },
};

export default nextConfig;
