import sharp, { type Sharp } from "sharp";
import { prisma } from "@/lib/prisma";

const JPEG_INPUT = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

function clampQuality(n: number): number {
  return Math.min(100, Math.max(1, Math.round(n)));
}

function clampEdge(n: number): number {
  return Math.min(8192, Math.max(256, Math.round(n)));
}

export type UploadImageSettings = {
  maxEdgePx: number;
  jpegQuality: number;
};

export async function getUploadImageSettingsFromDb(): Promise<UploadImageSettings> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { uploadImageMaxEdgePx: true, uploadImageJpegQuality: true },
    });
    return {
      maxEdgePx: clampEdge(row?.uploadImageMaxEdgePx ?? 2400),
      jpegQuality: clampQuality(row?.uploadImageJpegQuality ?? 85),
    };
  } catch {
    return { maxEdgePx: 2400, jpegQuality: 85 };
  }
}

export type NormalizedImageBlob = {
  buffer: Buffer;
  contentType: string;
  ext: "jpg" | "png" | "webp" | "gif";
};

type NormalizeMode = "productJpeg" | "preservePngIfAlpha";

/**
 * Resize and re-encode for storage. GIF is treated as a single frame (static).
 */
export async function normalizeImageBufferForUpload(
  input: Buffer,
  inputMime: string,
  mode: NormalizeMode,
  settings: UploadImageSettings,
): Promise<NormalizedImageBlob> {
  const { maxEdgePx, jpegQuality } = settings;
  if (!JPEG_INPUT.has(inputMime)) {
    throw new Error("Unsupported image type");
  }

  const rotated = sharp(input, { animated: false }).rotate();
  const meta = await rotated.metadata();
  const w0 = meta.width ?? 0;
  const h0 = meta.height ?? 0;
  const hasAlpha = meta.hasAlpha === true;
  const needsResize = w0 > 0 && h0 > 0 && (w0 > maxEdgePx || h0 > maxEdgePx);

  let pipeline: Sharp = rotated;
  if (needsResize) {
    pipeline = pipeline.resize({
      width: maxEdgePx,
      height: maxEdgePx,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  if (mode === "preservePngIfAlpha" && (hasAlpha || inputMime === "image/png")) {
    const buf = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    return { buffer: buf, contentType: "image/png", ext: "png" };
  }

  if (mode === "preservePngIfAlpha") {
    const buf = await pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();
    return { buffer: buf, contentType: "image/jpeg", ext: "jpg" };
  }

  const buf = await pipeline.jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer();
  return { buffer: buf, contentType: "image/jpeg", ext: "jpg" };
}

export async function normalizeCompanyLogoBuffer(
  input: Buffer,
  inputMime: string,
  settings: UploadImageSettings,
): Promise<NormalizedImageBlob> {
  if (!JPEG_INPUT.has(inputMime)) {
    throw new Error("Unsupported image type");
  }
  if (inputMime === "image/gif") {
    return normalizeImageBufferForUpload(input, inputMime, "productJpeg", settings);
  }
  return normalizeImageBufferForUpload(input, inputMime, "preservePngIfAlpha", settings);
}

export async function normalizeWatermarkBuffer(
  input: Buffer,
  inputMime: string,
  settings: UploadImageSettings,
): Promise<NormalizedImageBlob> {
  if (!["image/png", "image/webp", "image/jpeg", "image/gif"].includes(inputMime)) {
    throw new Error("Use PNG, WebP, JPEG, or GIF for the watermark");
  }
  if (inputMime === "image/gif") {
    return normalizeImageBufferForUpload(input, inputMime, "productJpeg", settings);
  }
  return normalizeImageBufferForUpload(input, inputMime, "preservePngIfAlpha", settings);
}

export async function normalizeThemeDecorBuffer(
  input: Buffer,
  inputMime: string,
  settings: UploadImageSettings,
): Promise<NormalizedImageBlob> {
  if (!JPEG_INPUT.has(inputMime)) {
    throw new Error("Unsupported image type");
  }
  if (inputMime === "image/gif") {
    return normalizeImageBufferForUpload(input, inputMime, "productJpeg", settings);
  }
  return normalizeImageBufferForUpload(input, inputMime, "preservePngIfAlpha", settings);
}

/**
 * Label base layouts: auto-orient only — no resize/crop so the full artwork is preserved.
 */
export async function normalizeLabelBaseLayoutBuffer(
  input: Buffer,
  inputMime: string,
): Promise<NormalizedImageBlob> {
  if (!JPEG_INPUT.has(inputMime)) {
    throw new Error("Unsupported image type");
  }

  const rotated = sharp(input, { animated: false }).rotate();
  const meta = await rotated.metadata();
  const hasAlpha = meta.hasAlpha === true;

  if (hasAlpha || inputMime === "image/png") {
    const buf = await rotated.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    return { buffer: buf, contentType: "image/png", ext: "png" };
  }

  if (inputMime === "image/webp") {
    const buf = await rotated.webp({ quality: 90 }).toBuffer();
    return { buffer: buf, contentType: "image/webp", ext: "webp" };
  }

  if (inputMime === "image/gif") {
    const buf = await rotated.gif().toBuffer();
    return { buffer: buf, contentType: "image/gif", ext: "gif" };
  }

  const buf = await rotated.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return { buffer: buf, contentType: "image/jpeg", ext: "jpg" };
}
