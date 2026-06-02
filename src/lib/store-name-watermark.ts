/**
 * Tiled store-name anti-theft: CSS `background-image` with explicit `background-size` (px) so
 * `font-size` in the SVG matches on-screen pixels. Full-viewport SVGs with
 * `preserveAspectRatio="xMidYMid slice"` scale the viewBox to cover the window and make text
 * appear huge; repeating a fixed-size tile avoids that.
 */
export function escapeForSvgText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FILL_DARK = "rgba(32,22,14,0.58)";
const FILL_LIGHT = "rgba(255,255,255,0.82)";

export function clampStoreWatermarkFontPx(n: number): number {
  if (!Number.isFinite(n)) return 15;
  return Math.min(36, Math.max(10, Math.round(n)));
}

export function clampStoreWatermarkNameGapPx(n: number): number {
  if (!Number.isFinite(n)) return 8;
  return Math.min(64, Math.max(0, Math.round(n)));
}

function hashPickLight(companyName: string, index: number): boolean {
  const s = `${companyName}\0${index}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2 === 0;
}

const SCATTER_TURN = -34;
const BAND_TURN = -34;

function textAttrsLight(fs: number): string {
  const sw = Math.max(0.5, fs * 0.055);
  return `fill="${FILL_LIGHT}" stroke="rgb(44,36,22)" stroke-opacity="0.45" stroke-width="${sw}" paint-order="stroke fill"`;
}

function textAttrsDark(fs: number): string {
  const sw = Math.max(0.45, fs * 0.045);
  return `fill="${FILL_DARK}" stroke="rgba(255,255,255,0.4)" stroke-width="${sw}" paint-order="stroke fill"`;
}

function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export type StoreNameBackgroundTile = {
  dataUrl: string;
  width: number;
  height: number;
};

/**
 * Scattered: 2 or 3 names on a circle. Tile size in px; use as `background-size: width height`.
 */
export function getStoreNameScatteredTile(
  companyName: string,
  fontSizePx: number,
  nameGapPx: number,
): StoreNameBackgroundTile {
  const fs = clampStoreWatermarkFontPx(fontSizePx);
  const g = clampStoreWatermarkNameGapPx(nameGapPx);
  const t = companyName.trim().slice(0, 120) || "Shop";
  const esc = escapeForSvgText(t);
  const long = t.length > 28;
  const nPts = long ? 2 : 3;
  const R = 10 + g * 1.85;
  const margin = Math.max(fs * 2, 28);
  const w = Math.ceil(2 * R + 2 * margin + fs * 1.2);
  const h = Math.ceil(2 * R + 2 * margin + fs * 1.2);
  const cx = w / 2;
  const cy = h / 2;
  const parts: string[] = [];
  for (let i = 0; i < nPts; i++) {
    const ang = (i / nPts) * 2 * Math.PI - Math.PI / 2;
    const x = cx + R * Math.cos(ang);
    const y = cy + R * Math.sin(ang);
    const attrs = hashPickLight(t, i) ? textAttrsLight(fs) : textAttrsDark(fs);
    parts.push(
      `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${SCATTER_TURN})"><text text-anchor="middle" x="0" y="0" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="600" ${attrs}>${esc}</text></g>`,
    );
  }
  const pid = "a";
  const inner = parts.join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><pattern id="${pid}" x="0" y="0" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><g fill="none" stroke="none">${inner}</g></pattern></defs><rect x="0" y="0" width="${w}" height="${h}" fill="url(#${pid})"/></svg>`;
  return { dataUrl: toSvgDataUrl(svg), width: w, height: h };
}

/**
 * Continuous: two diagonal text lines, compact tile for data URL and CSS `background-size`.
 */
export function getStoreNameContinuousTile(
  companyName: string,
  fontSizePx: number,
  nameGapPx: number,
): StoreNameBackgroundTile {
  const fs = clampStoreWatermarkFontPx(fontSizePx);
  const g = clampStoreWatermarkNameGapPx(nameGapPx);
  const raw = companyName.trim().slice(0, 80) || "Shop";
  const esc = escapeForSvgText(raw);
  const spaceN = 1 + Math.min(8, Math.max(0, Math.floor(g / 6)));
  const sep = Array.from({ length: spaceN }, () => " ").join("");
  const repeatN = 18;
  const longLine = () => Array.from({ length: repeatN }, () => esc).join(sep);
  const long1 = longLine();
  const n = long1.length;
  const long2 = n > 8 ? `${long1.slice(n >> 1)}${sep}${long1.slice(0, n >> 1)}` : long1;
  const lineGap = Math.max(fs * 0.35, fs * 0.2 + g * 0.85);
  const patW = 1200;
  const patH = Math.ceil(lineGap * 2 + fs * 1.5 + 10);
  const cx = patW / 2;
  const cy = patH / 2;
  const pid = "b";
  const pat = `<pattern id="${pid}" x="0" y="0" width="${patW}" height="${patH}" patternUnits="userSpaceOnUse"><g fill="none" stroke="none"><g transform="translate(${cx},${cy}) rotate(${BAND_TURN})"><text x="-10000" y="0" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="700" ${textAttrsDark(fs)}>${long1}</text><text x="-10000" y="${lineGap}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="${fs}" font-weight="600" ${textAttrsLight(fs)}>${long2}</text></g></g></pattern>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${patW}" height="${patH}" viewBox="0 0 ${patW} ${patH}"><defs>${pat}</defs><rect x="0" y="0" width="${patW}" height="${patH}" fill="url(#${pid})"/></svg>`;
  return { dataUrl: toSvgDataUrl(svg), width: patW, height: patH };
}
