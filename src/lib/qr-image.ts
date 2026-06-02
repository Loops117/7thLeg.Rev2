import sharp from "sharp";
import type { QrFrameShape, QrModuleShape, QrStyle } from "@/generated/prisma/enums";
import { renderQrMatrixToPngBuffer } from "@/lib/qr-render";

/**
 * PNG for print: styled QR matrix, optional center image (color or grayscale).
 */
export async function buildQrCodePng(
  scanUrl: string,
  style: QrStyle,
  moduleShape: QrModuleShape,
  frameShape: QrFrameShape,
  logoBuffer: Buffer | null,
  centerUseColor: boolean,
): Promise<Buffer> {
  const pixelSize = 640;
  const base = await renderQrMatrixToPngBuffer({
    scanUrl,
    style,
    moduleShape,
    frameShape,
    pixelSize,
  });

  if (!logoBuffer || logoBuffer.length === 0) {
    return base;
  }

  const meta = await sharp(base).metadata();
  const w = meta.width ?? pixelSize;
  const logoSize = Math.round(w * 0.2);
  let logoResized: Buffer;
  try {
    let pipe = sharp(logoBuffer).resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    });
    if (centerUseColor) {
      pipe = pipe.flatten({ background: { r: 255, g: 255, b: 255, alpha: 1 } });
    } else {
      pipe = pipe.flatten({ background: { r: 255, g: 255, b: 255 } }).grayscale();
    }
    logoResized = await pipe.png().toBuffer();
  } catch {
    return base;
  }

  return sharp(base).composite([{ input: logoResized, gravity: "center" }]).png().toBuffer();
}
