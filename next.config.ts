import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Enable server actions if needed
  },
};

export default nextConfig;
