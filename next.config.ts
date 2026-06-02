import type { NextConfig } from "next";

/** @see https://nextjs.org/docs */
const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas", "sharp"],
  /** Match product image uploads (see `product-images-admin` MAX_BYTES). Default ~1MB breaks larger files with opaque client errors. */
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
