import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Compiler
  reactCompiler: true,
  // Export as a static site for GitHub Pages
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // When building on GitHub Actions for project pages, set base paths
  ...(process.env.GITHUB_ACTIONS === "true"
    ? {
        basePath: "/drone-visualization",
        assetPrefix: "/drone-visualization/",
      }
    : {}),
};

export default nextConfig;
