import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { deleteUploadByUrl, putUploadObject } from "@/lib/app-uploads";
import type { SiteBrandingAssets } from "@/lib/site-branding";

async function squarePng(input: Buffer, size: number): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(size, size, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function ogJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

/** Build favicon, apple-touch, and OG sizes from one source image; upload to blob storage. */
export async function generateAndUploadSiteBrandingAssets(input: Buffer): Promise<SiteBrandingAssets> {
  const [icon16, icon32, apple180, og1200] = await Promise.all([
    squarePng(input, 16),
    squarePng(input, 32),
    squarePng(input, 180),
    ogJpeg(input),
  ]);

  const id = randomUUID();
  const [u16, u32, uApple, uOg] = await Promise.all([
    putUploadObject(`uploads/site/branding/${id}-icon-16.png`, icon16, "image/png"),
    putUploadObject(`uploads/site/branding/${id}-icon-32.png`, icon32, "image/png"),
    putUploadObject(`uploads/site/branding/${id}-apple-180.png`, apple180, "image/png"),
    putUploadObject(`uploads/site/branding/${id}-og-1200.jpg`, og1200, "image/jpeg"),
  ]);

  return { icon16: u16, icon32: u32, apple180: uApple, og1200: uOg };
}

export async function deleteSiteBrandingAssetUrls(assets: SiteBrandingAssets | null): Promise<void> {
  if (!assets) return;
  await Promise.all([
    deleteUploadByUrl(assets.icon16),
    deleteUploadByUrl(assets.icon32),
    deleteUploadByUrl(assets.apple180),
    deleteUploadByUrl(assets.og1200),
  ]);
}

const BRANDING_FETCH_MAX = 8 * 1024 * 1024;

/** Load image bytes from an uploaded logo URL (blob or local /uploads/). */
export async function fetchImageBufferFromPublicUrl(url: string): Promise<Buffer> {
  const u = url.trim();
  if (!u) throw new Error("No image URL.");
  if (u.startsWith("/")) {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const full = path.join(process.cwd(), "public", u.replace(/^\//, ""));
    return readFile(full);
  }
  if (!u.startsWith("http://") && !u.startsWith("https://")) {
    throw new Error("Invalid image URL.");
  }
  const res = await fetch(u, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not load image (${res.status}).`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > BRANDING_FETCH_MAX) throw new Error("Image is too large.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > BRANDING_FETCH_MAX) throw new Error("Image is too large.");
  return buf;
}
