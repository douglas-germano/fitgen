import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  // turbopack: {}, // Disabled due to memory constraints
  async rewrites() {
    const backendUrl = process.env.NODE_ENV === "development"
      ? "http://localhost:5001"
      : "https://fitgen.suacozinha.site";

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/apidocs",
        destination: `${backendUrl}/apidocs`,
      },
      {
        source: "/apidocs/:path*",
        destination: `${backendUrl}/apidocs/:path*`,
      },
      {
        source: "/flasgger_static/:path*",
        destination: `${backendUrl}/flasgger_static/:path*`,
      },
      {
        source: "/apispec_1.json",
        destination: `${backendUrl}/apispec_1.json`,
      },
    ];
  },
};

import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

export default withPWA(nextConfig);
