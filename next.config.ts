import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/api/uploads/**",
      },
    ],
  },
};

export default nextConfig;
