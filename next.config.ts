import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
        ],
      },
    ];
  },
  experimental: {
    // Enable server actions if needed
  },
};

export default nextConfig;
