import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  // Respaldo JSON con fotos embebidas suele superar 10MB (proxy/middleware clona el body).
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
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
