import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/apidocs",
        destination: "http://backend:5000/apidocs",
      },
      {
        source: "/apidocs/:path*",
        destination: "http://backend:5000/apidocs/:path*",
      },
      {
        source: "/flasgger_static/:path*",
        destination: "http://backend:5000/flasgger_static/:path*",
      },
      {
        source: "/apispec_1.json",
        destination: "http://backend:5000/apispec_1.json",
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
