import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // `NEXT_OUTPUT=export` builds a fully static site (Cloudflare Pages, see `npm run build:lp`).
  // Anything else keeps the Node server build used by the Dockerfile.
  output: isStaticExport ? "export" : "standalone",
  ...(isStaticExport ? { trailingSlash: false } : {}),
  // turbopack: {}, // Disabled due to memory constraints
  // Rewrites need a server; the static export talks to the API through NEXT_PUBLIC_API_URL instead.
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

// Rewrites need a server and are ignored by the static export (they only trigger a build warning).
if (isStaticExport) delete nextConfig.rewrites;

export default nextConfig;
