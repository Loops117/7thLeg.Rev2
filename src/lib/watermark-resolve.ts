import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parseWatermarkPlacement } from "@/lib/site-config-types";
import { readImageBufferFromPublicUrl } from "@/lib/watermark-image";

const BUILT_IN = path.join(process.cwd(), "public", "built-in", "watermark.png");

/**
 * Custom site watermark, or the built-in `public/built-in/watermark.png` (PNG with alpha).
 */
export async function getWatermarkPngForComposite(): Promise<Buffer> {
  const row = await prisma.siteConfig.findUnique({ where: { id: 1 }, select: { watermarkImageUrl: true } });
  const u = row?.watermarkImageUrl?.trim();
  if (u) {
    return readImageBufferFromPublicUrl(u);
  }
  return readFile(BUILT_IN);
}

export async function getProductWatermarkCompositeSettings(): Promise<{
  placement: ReturnType<typeof parseWatermarkPlacement>;
  opacityPercent: number;
}> {
  const row = await prisma.siteConfig.findUnique({
    where: { id: 1 },
    select: { watermarkPlacement: true, watermarkOpacityPercent: true },
  });
  return {
    placement: parseWatermarkPlacement(row?.watermarkPlacement),
    opacityPercent: Math.min(100, Math.max(0, row?.watermarkOpacityPercent ?? 38)),
  };
}
