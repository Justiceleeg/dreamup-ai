import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: require('path').join(__dirname, '..'),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
