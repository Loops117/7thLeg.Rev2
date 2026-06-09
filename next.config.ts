import type { NextConfig } from "next";

/** @see https://nextjs.org/docs */
const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
  /** Product images (8MB). Theatrical videos use Blob client upload (75MB); this covers small server-action fallbacks. */
  experimental: {
    serverActions: {
      bodySizeLimit: "80mb",
    },
  },
};

export default nextConfig;
