import type { NextConfig } from "next";

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dl.ambientcg.com",
      },
    ],
  },
  // ... rest of your config
};

export default nextConfig;
