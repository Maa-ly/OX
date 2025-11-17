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
  // Suppress the lockfile warning by explicitly setting the root
  experimental: {
    // turbo: {
    //   root: process.cwd(),
    // },
  },
};

export default nextConfig;
