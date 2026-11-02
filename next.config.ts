import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O e2e builda em outra pasta para não pisar no `.next` do `next dev` que estiver rodando
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
