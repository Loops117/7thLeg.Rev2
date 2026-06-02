import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { WatermarkPlacement } from "@/lib/site-config-types";

/** Convert `/uploads/...` to absolute path under `public/`. */
export function publicUrlToAbsoluteFilePath(url: string): string | null {
  if (!url.startsWith("/uploads/")) return null;
  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}

export async function readImageBufferFromPublicUrl(url: string): Promise<Buffer> {
  const u = url.trim();
  if (u.startsWith("https://") || u.startsWith("http://")) {
    const res = await fetch(u);
    if (!res.ok) {
      throw new Error(`Image fetch failed (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  if (u.startsWith("/")) {
    const full = path.join(process.cwd(), "public", u.replace(/^\//, ""));
    return readFile(full);
  }
  throw new Error("Unsupported image URL");
}

export async function compositeWatermarkJpegFromBuffers(
  baseImage: Buffer,
  watermarkImage: Buffer,
  opts?: { placement?: WatermarkPlacement; opacityPercent?: number },
): Promise<Buffer> {
  const baseMeta = await sharp(baseImage).metadata();
  const bw = baseMeta.width ?? 800;
  const bh = baseMeta.height ?? 800;
  const placement = opts?.placement ?? "bottomRight";
  const opacity = Math.max(0, Math.min(1, (opts?.opacityPercent ?? 38) / 100));

  const gravityForPlacement = (p: WatermarkPlacement) => {
    switch (p) {
      case "topLeft":
        return "northwest" as const;
      case "topRight":
        return "northeast" as const;
      case "bottomLeft":
        return "southwest" as const;
      case "center":
        return "center" as const;
      default:
        return "southeast" as const;
    }
  };

  let wmBuf = await sharp(watermarkImage)
    .ensureAlpha()
    .resize({
      width: placement === "stretch" ? bw : Math.max(48, Math.floor(bw * 0.22)),
      height: placement === "stretch" ? bh : undefined,
      fit: placement === "stretch" ? "fill" : "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  if (opacity < 1) {
    const wmRaw = await sharp(wmBuf)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = wmRaw.info.channels;
    if (ch >= 4) {
      for (let i = 3; i < wmRaw.data.length; i += ch) {
        wmRaw.data[i] = Math.round(wmRaw.data[i] * opacity);
      }
      wmBuf = await sharp(wmRaw.data, {
        raw: { width: wmRaw.info.width, height: wmRaw.info.height, channels: ch },
      })
        .png()
        .toBuffer();
    }
  }

  return sharp(baseImage)
    .composite([
      {
        input: wmBuf,
        gravity: gravityForPlacement(placement),
        blend: "over",
      },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}

/**
 * Composites a watermark (PNG with alpha) onto the base image, bottom-right.
 * Output JPEG for smaller public files.
 */
export async function compositeWatermarkJpeg(
  baseImageAbsolutePath: string,
  watermarkAbsolutePath: string,
): Promise<Buffer> {
  return compositeWatermarkJpegFromBuffers(
    await readFile(baseImageAbsolutePath),
    await readFile(watermarkAbsolutePath),
  );
}
