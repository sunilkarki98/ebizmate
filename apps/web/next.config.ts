import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["@ebizmate/db", "@ebizmate/shared", "@ebizmate/contracts"],
};

export default nextConfig;
