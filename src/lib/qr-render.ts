import QRCode from "qrcode";
import sharp from "sharp";
import type { QrFrameShape, QrModuleShape, QrStyle } from "@/generated/prisma/enums";

function styleHex(style: QrStyle): { dark: string; light: string } {
  switch (style) {
    case "SOFT":
      return { dark: "#1b4332", light: "#fafaf9" };
    case "INVERTED":
      return { dark: "#ffffff", light: "#0a0a0a" };
    case "CLASSIC":
    default:
      return { dark: "#000000", light: "#ffffff" };
  }
}

type QrSymbol = {
  modules: {
    size: number;
    get: (row: number, col: number) => boolean;
  };
};

/**
 * Renders QR modules to PNG via SVG (supports dot / rounded / square modules and circular frame).
 */
export async function renderQrMatrixToPngBuffer(input: {
  scanUrl: string;
  style: QrStyle;
  moduleShape: QrModuleShape;
  frameShape: QrFrameShape;
  /** Approximate output width/height in pixels (square). */
  pixelSize: number;
}): Promise<Buffer> {
  const sym = (QRCode as unknown as { create: (t: string, o?: { errorCorrectionLevel?: string }) => QrSymbol }).create(
    input.scanUrl,
    { errorCorrectionLevel: "H" },
  );

  const modules = sym.modules;
  const n = modules.size;
  const margin = 4;
  const total = n + margin * 2;
  const cell = Math.max(2, Math.floor(input.pixelSize / total));
  const W = cell * total;
  const { dark, light } = styleHex(input.style);

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${W}" viewBox="0 0 ${W} ${W}">`);

  if (input.frameShape === "CIRCLE") {
    const cx = W / 2;
    const cy = W / 2;
    const r = W / 2;
    parts.push(`<defs><clipPath id="qrFrameClip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>`);
    parts.push(`<g clip-path="url(#qrFrameClip)">`);
  }

  parts.push(`<rect x="0" y="0" width="${W}" height="${W}" fill="${light}"/>`);

  const ox = margin * cell;
  const oy = margin * cell;

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!modules.get(r, c)) continue;
      const x = ox + c * cell;
      const y = oy + r * cell;
      switch (input.moduleShape) {
        case "DOT": {
          const rad = cell * 0.45;
          const cx = x + cell / 2;
          const cy = y + cell / 2;
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${dark}"/>`);
          break;
        }
        case "ROUNDED_SQUARE": {
          const pad = cell * 0.07;
          const w = cell - pad * 2;
          const rx = Math.max(1, cell * 0.28);
          parts.push(
            `<rect x="${x + pad}" y="${y + pad}" width="${w}" height="${w}" rx="${rx}" ry="${rx}" fill="${dark}"/>`,
          );
          break;
        }
        case "SQUARE":
        default:
          parts.push(`<rect x="${x}" y="${y}" width="${cell}" height="${cell}" fill="${dark}"/>`);
      }
    }
  }

  if (input.frameShape === "CIRCLE") {
    parts.push(`</g>`);
  }

  parts.push(`</svg>`);

  const svg = parts.join("");
  return sharp(Buffer.from(svg, "utf8")).png({ compressionLevel: 9 }).toBuffer();
}
