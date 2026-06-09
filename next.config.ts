import type { NextConfig } from "next";

/** @see https://nextjs.org/docs */
const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
  /** Product images (8MB) and theatrical pane videos (25MB). Default ~1MB breaks larger uploads. */
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
