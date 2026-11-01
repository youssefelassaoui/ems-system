import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root so Turbopack ignores unrelated lockfiles higher up.
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
