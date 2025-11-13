import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Suppress the lockfile warning by explicitly setting the root
  experimental: {
    // turbo: {
    //   root: process.cwd(),
    // },
  },
};

export default nextConfig;
