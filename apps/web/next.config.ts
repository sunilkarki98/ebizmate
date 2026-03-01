import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@ebizmate/db", "@ebizmate/shared", "@ebizmate/contracts"],

  // Reduces Docker image size by ~80% for production deployments
  output: 'standalone',

  // Image optimization for social media platform CDNs
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.cdninstagram.com' },
      { protocol: 'https', hostname: '*.fbcdn.net' },
      { protocol: 'https', hostname: '*.tiktokcdn.com' },
    ],
  },
};

export default nextConfig;
