import { prisma } from "@/lib/prisma";
import { pickPrimaryProductImage } from "@/lib/product-images-public";
import { clampStoreWatermarkFontPx, clampStoreWatermarkNameGapPx } from "@/lib/store-name-watermark";
import {
  buildThemeCss,
  mergeThemeBlob,
  parseBgProductIdsJson,
  parseBgSandOverlayMode,
  type BgSandOverlayMode,
  type DecorTileForClient,
  type ResolvedPublicTheme,
  type RootLayoutThemePayload,
} from "@/lib/theme-config";

export async function loadResolvedPublicThemeFromDb(): Promise<ResolvedPublicTheme> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { themeConfig: true },
    });
    return mergeThemeBlob(row?.themeConfig ?? null);
  } catch {
    return mergeThemeBlob(null);
  }
}

/** How many image URLs to include in the *pool* sent to the client. On-screen count is separate (`bgMaxImages`). */
const DECOR_URL_POOL_MAX = 64;

function clampWeight(n: number): number {
  return Math.min(100, Math.max(1, Math.round(n)));
}

/** Merged upload list + product-pick into a single weighted pool (cap 64 for client payload). */
export async function resolveBackgroundDecorForClient(opts: {
  maxTiles: number;
  merged: ResolvedPublicTheme;
  bgProductIds: string[] | null;
}): Promise<DecorTileForClient[]> {
  const max = Math.min(DECOR_URL_POOL_MAX, Math.max(1, opts.maxTiles));
  const out: DecorTileForClient[] = [];
  for (const e of opts.merged.decorImageEntries) {
    if (out.length >= max) break;
    if (e.url && (e.url.startsWith("/") || e.url.startsWith("https://"))) {
      out.push({
        url: e.url,
        weight: clampWeight(e.weight),
        alwaysOnTop: Boolean(e.alwaysOnTop),
      });
    }
  }
  const need = max - out.length;
  if (need > 0 && opts.bgProductIds && opts.bgProductIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: opts.bgProductIds.slice(0, 32) } },
      select: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 8,
          select: { url: true, watermarkedUrl: true, useWatermarkedPublic: true, variantId: true },
        },
      },
    });
    for (const p of products) {
      if (out.length >= max) break;
      const url = pickPrimaryProductImage(p.images);
      if (url) out.push({ url, weight: 25, alwaysOnTop: false });
    }
  }
  return out.slice(0, max);
}

/**
 * Reads `bg_sand_overlay_mode` via raw SQL so the app does not break if `prisma generate` was not run
 * after a schema change (Turbopack can otherwise reject `select: { bgSandOverlayMode: true }` on a stale client).
 */
export async function getBgSandOverlayModeFromDb(): Promise<BgSandOverlayMode> {
  try {
    const r = await prisma.$queryRaw<Array<{ m: string | null }>>`
      SELECT "bg_sand_overlay_mode" AS m FROM "site_config" WHERE "id" = 1 LIMIT 1
    `;
    return parseBgSandOverlayMode(r[0]?.m);
  } catch {
    return "diagonal";
  }
}

/**
 * Store-name font + name gap via raw SQL (stale `prisma generate` / no new fields on client).
 * Single logical font: average the two DB columns; both are written the same on save.
 */
export async function getStoreWatermarkTextSettingsFromDb(): Promise<{
  storeWatermarkFontPx: number;
  storeWatermarkNameGapPx: number;
}> {
  try {
    const r = await prisma.$queryRaw<Array<{ s: number | null; c: number | null; g: number | null }>>`
      SELECT
        "store_watermark_scattered_font_px" AS s,
        "store_watermark_continuous_font_px" AS c,
        "store_watermark_name_gap_px" AS g
      FROM "site_config" WHERE "id" = 1 LIMIT 1
    `;
    const s = r[0]?.s ?? 15;
    const c = r[0]?.c ?? 15;
    const storeWatermarkFontPx = clampStoreWatermarkFontPx(Math.round((Number(s) + Number(c)) / 2));
    const storeWatermarkNameGapPx = clampStoreWatermarkNameGapPx(Number(r[0]?.g ?? 8));
    return { storeWatermarkFontPx, storeWatermarkNameGapPx };
  } catch {
    return {
      storeWatermarkFontPx: 15,
      storeWatermarkNameGapPx: 8,
    };
  }
}

export async function getRootLayoutThemePayload(): Promise<RootLayoutThemePayload> {
  try {
    const [row, bgSandOverlayMode, storeText] = await Promise.all([
      prisma.siteConfig.findUnique({
        where: { id: 1 },
        select: {
          themeConfig: true,
          companyName: true,
          bgEnabled: true,
          bgMaxImages: true,
          bgSpawnIntervalMs: true,
          bgOpacityPercent: true,
          bgImageOpacityPercent: true,
          bgTileScaleMin: true,
          bgTileScaleMax: true,
          bgStickerRotMinDeg: true,
          bgStickerRotMaxDeg: true,
          bgProductIds: true,
        },
      }),
      getBgSandOverlayModeFromDb(),
      getStoreWatermarkTextSettingsFromDb(),
    ]);
    const merged = mergeThemeBlob(row?.themeConfig ?? null);
    const bgEnabled = row?.bgEnabled ?? true;
    const bgMaxImages = Math.min(300, Math.max(1, row?.bgMaxImages ?? 10));
    const bgSpawnIntervalMs = row?.bgSpawnIntervalMs ?? 2000;
    const bgOpacityPercent = Math.min(
      100,
      Math.max(0, Math.round(Number(row?.bgOpacityPercent ?? 88) || 88)),
    );
    const bgImageOpacityPercent = Math.min(100, Math.max(0, row?.bgImageOpacityPercent ?? 85));
    const rawMin = row?.bgTileScaleMin ?? 50;
    const rawMax = row?.bgTileScaleMax ?? 100;
    const bgTileScaleMin = Math.min(1000, Math.max(5, rawMin));
    const bgTileScaleMax = Math.min(1000, Math.max(bgTileScaleMin, rawMax));
    const rawRotMin = row?.bgStickerRotMinDeg ?? -45;
    const rawRotMax = row?.bgStickerRotMaxDeg ?? 45;
    let bgStickerRotMinDeg = Math.min(360, Math.max(-360, Math.round(Number(rawRotMin) || -45)));
    let bgStickerRotMaxDeg = Math.min(360, Math.max(-360, Math.round(Number(rawRotMax) || 45)));
    if (bgStickerRotMinDeg > bgStickerRotMaxDeg) {
      const t = bgStickerRotMinDeg;
      bgStickerRotMinDeg = bgStickerRotMaxDeg;
      bgStickerRotMaxDeg = t;
    }
    const productIds = parseBgProductIdsJson(row?.bgProductIds ?? null);
    const decorTileEntries = await resolveBackgroundDecorForClient({
      maxTiles: DECOR_URL_POOL_MAX,
      merged,
      bgProductIds: productIds,
    });
    const decorTileUrls = decorTileEntries.map((e) => e.url);
    const rawName = (row?.companyName ?? "").trim();
    const storeWatermarkName = rawName.slice(0, 120) || "Shop";
    const storeWatermarkFontPx = storeText.storeWatermarkFontPx;
    const storeWatermarkNameGapPx = storeText.storeWatermarkNameGapPx;
    return {
      themeCss: buildThemeCss(merged),
      bgEnabled,
      bgMaxImages,
      bgSpawnIntervalMs,
      bgOpacityPercent,
      bgSandOverlayMode,
      storeWatermarkName,
      storeWatermarkFontPx,
      storeWatermarkNameGapPx,
      bgImageOpacityPercent,
      bgTileScaleMin,
      bgTileScaleMax,
      bgStickerRotMinDeg,
      bgStickerRotMaxDeg,
      decorTileUrls,
      decorTileEntries,
    };
  } catch {
    const merged = mergeThemeBlob(null);
    return {
      themeCss: buildThemeCss(merged),
      bgEnabled: true,
      bgMaxImages: 10,
      bgSpawnIntervalMs: 2000,
      bgOpacityPercent: 88,
      bgSandOverlayMode: "diagonal" as const,
      storeWatermarkName: "Shop",
      storeWatermarkFontPx: 15,
      storeWatermarkNameGapPx: 8,
      bgImageOpacityPercent: 85,
      bgTileScaleMin: 50,
      bgTileScaleMax: 100,
      bgStickerRotMinDeg: -45,
      bgStickerRotMaxDeg: 45,
      decorTileUrls: [],
      decorTileEntries: [],
    };
  }
}
