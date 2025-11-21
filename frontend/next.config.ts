import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "i.etsystatic.com",
      },
    ],
  },
  // Walrus SDK configuration for Next.js
  // Reference: https://sdk.mystenlabs.com/walrus
  // When using walrus in API routes, tell next.js to skip bundling for the walrus packages
  serverExternalPackages: ['@mysten/walrus', '@mysten/walrus-wasm'],
  // Suppress the lockfile warning by explicitly setting the root
  experimental: {
    // turbo: {
    //   root: process.cwd(),
    // },
  },
};

export default nextConfig;
