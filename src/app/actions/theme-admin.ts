"use server";

import { randomUUID } from "node:crypto";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { getUploadImageSettingsFromDb, normalizeThemeDecorBuffer } from "@/lib/image-upload-normalize";
import { deleteUploadByUrl, putUploadObject } from "@/lib/app-uploads";
import { prisma } from "@/lib/prisma";
import { clampStoreWatermarkFontPx, clampStoreWatermarkNameGapPx } from "@/lib/store-name-watermark";
import {
  mergeThemeBlob,
  parseThemeConfigBlob,
  type BgSandOverlayMode,
  type SiteThemeConfigBlob,
  type ThemeDecorImageEntry,
} from "@/lib/theme-config";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
}

const MAX_DECOR = 300;
const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]);

function safeBasename(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "image";
}

export type ThemeSavePayload = {
  themeBlob: SiteThemeConfigBlob;
  bgEnabled: boolean;
  bgMaxImages: number;
  bgSpawnIntervalMs: number;
  bgOpacityPercent: number;
  /** Top anti-theft layer: flat sand, diagonal line texture, etc. */
  bgSandOverlayMode: BgSandOverlayMode;
  bgImageOpacityPercent: number;
  bgTileScaleMin: number;
  bgTileScaleMax: number;
  /** Inclusive degrees; each new sticker picks a random angle in [min, max]. */
  bgStickerRotMinDeg: number;
  bgStickerRotMaxDeg: number;
  /** string[] product ids from multi-select; empty array stored as null = use any with images */
  bgProductIds: string[];
  storeWatermarkFontPx: number;
  storeWatermarkNameGapPx: number;
  cardHoverMode: "zoom" | "glow";
};

export async function saveFullThemeSettings(payload: ThemeSavePayload) {
  await requireAdmin();
  const bgEnabled = !!payload.bgEnabled;
  const bgMaxImages = Math.min(300, Math.max(1, Math.floor(Number(payload.bgMaxImages) || 10)));
  const bgSpawnIntervalMs = Math.min(20000, Math.max(250, Math.floor(Number(payload.bgSpawnIntervalMs) || 2000)));
  const bgOpacityPercent = Math.min(100, Math.max(0, Math.floor(Number(payload.bgOpacityPercent) || 88)));
  const bgSandOverlayMode: BgSandOverlayMode =
    payload.bgSandOverlayMode === "solid"
      ? "solid"
      : payload.bgSandOverlayMode === "store_name"
        ? "store_name"
        : payload.bgSandOverlayMode === "store_name_continuous"
          ? "store_name_continuous"
          : "diagonal";
  const rawImgOp = Number(payload.bgImageOpacityPercent);
  const bgImageOpacityPercent = Math.min(
    100,
    Math.max(0, Number.isFinite(rawImgOp) ? Math.floor(rawImgOp) : 85),
  );
  const rawMin = Math.floor(Number(payload.bgTileScaleMin) || 50);
  const rawMax = Math.floor(Number(payload.bgTileScaleMax) || 100);
  const bgTileScaleMin = Math.min(1000, Math.max(5, rawMin));
  const bgTileScaleMax = Math.min(1000, Math.max(bgTileScaleMin, rawMax));
  let bgStickerRotMinDeg = Math.min(360, Math.max(-360, Math.round(Number(payload.bgStickerRotMinDeg) || -45)));
  let bgStickerRotMaxDeg = Math.min(360, Math.max(-360, Math.round(Number(payload.bgStickerRotMaxDeg) || 45)));
  if (bgStickerRotMinDeg > bgStickerRotMaxDeg) {
    const t = bgStickerRotMinDeg;
    bgStickerRotMinDeg = bgStickerRotMaxDeg;
    bgStickerRotMaxDeg = t;
  }
  const storeWatermarkFontPx = clampStoreWatermarkFontPx(
    Math.floor(Number(payload.storeWatermarkFontPx) || 15),
  );
  const storeWatermarkNameGapPx = clampStoreWatermarkNameGapPx(
    Math.floor(Number(payload.storeWatermarkNameGapPx) || 8),
  );
  const cardHoverMode = payload.cardHoverMode === "glow" ? "glow" : "zoom";
  const ids = [...new Set((payload.bgProductIds ?? []).filter(Boolean))];
  const bgProductIdsJson: Prisma.NullableJsonNullValueInput | string[] =
    ids.length > 0 ? ids : Prisma.JsonNull;

  const decor = payload.themeBlob.background?.decorImageUrls;
  const decorSanitized = Array.isArray(decor)
    ? decor
        .filter(
          (u): u is string =>
            typeof u === "string" && (u.startsWith("/uploads/theme/") || (u.startsWith("https://") && u.length < 2000)),
        )
        .slice(0, MAX_DECOR)
    : undefined;

  const rawEntries = payload.themeBlob.background?.decorImageEntries;
  const decorEntriesSanitized: ThemeDecorImageEntry[] | undefined = Array.isArray(rawEntries)
    ? rawEntries
        .filter(
          (e: unknown) =>
            e != null && typeof e === "object" && typeof (e as { url?: unknown }).url === "string",
        )
        .map((e) => {
          const rec = e as Record<string, unknown>;
          const url = rec.url;
          if (
            typeof url !== "string" ||
            (!url.startsWith("/uploads/theme/") && !(url.startsWith("https://") && url.length < 2000))
          ) {
            return null;
          }
          const w = rec.weight;
          const weight =
            typeof w === "number" && !Number.isNaN(w) ? Math.min(100, Math.max(1, Math.round(w))) : 50;
          return { url, weight, alwaysOnTop: Boolean(rec.alwaysOnTop) };
        })
        .filter((x): x is ThemeDecorImageEntry => x != null)
        .slice(0, MAX_DECOR)
    : undefined;

  const useEntries = decorEntriesSanitized && decorEntriesSanitized.length > 0;
  const blob: SiteThemeConfigBlob = {
    ...payload.themeBlob,
    background: {
      ...payload.themeBlob.background,
      decorImageUrls: useEntries
        ? decorEntriesSanitized!.map((e) => e.url)
        : (decorSanitized ?? payload.themeBlob.background?.decorImageUrls ?? []),
      decorImageEntries: useEntries ? decorEntriesSanitized! : undefined,
    },
  };

  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      companyName: "Inverts Oasis",
      themeConfig: blob as object,
      bgEnabled,
      bgMaxImages,
      bgSpawnIntervalMs,
      bgOpacityPercent,
      bgImageOpacityPercent,
      bgTileScaleMin,
      bgTileScaleMax,
      bgStickerRotMinDeg,
      bgStickerRotMaxDeg,
      bgProductIds: bgProductIdsJson,
      storeBannerEnabled: false,
      storeBannerHtml: "",
      storeFeaturedStripEnabled: false,
      storeFeaturedStripConfig: { title: "Featured picks", maxProducts: 8 } as object,
      storeFooterEnabled: false,
      storeFooterHtml: "",
      cardHoverMode: "zoom",
    },
    update: {
      themeConfig: blob as object,
      bgEnabled,
      bgMaxImages,
      bgSpawnIntervalMs,
      bgOpacityPercent,
      bgImageOpacityPercent,
      bgTileScaleMin,
      bgTileScaleMax,
      bgStickerRotMinDeg,
      bgStickerRotMaxDeg,
      bgProductIds: bgProductIdsJson,
      cardHoverMode,
    },
  });
  // Stale `prisma generate` / Turbopack: use raw for columns not on the generated client; keeps DB in sync.
  await prisma.$executeRaw`
    UPDATE "site_config" SET
      "bg_sand_overlay_mode" = ${bgSandOverlayMode},
      "store_watermark_scattered_font_px" = ${storeWatermarkFontPx},
      "store_watermark_continuous_font_px" = ${storeWatermarkFontPx},
      "store_watermark_name_gap_px" = ${storeWatermarkNameGapPx}
    WHERE "id" = 1
  `;

  revalidatePath("/", "layout");
  revalidatePath("/settings/theme", "page");
  revalidatePath("/store", "layout");
  revalidatePath("/product", "layout");
}

export type UploadThemeDecorResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadThemeDecorImage(formData: FormData): Promise<UploadThemeDecorResult> {
  try {
    await requireAdmin();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return { ok: false, error: "Choose an image file." };
    }
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "Image must be 6MB or smaller." };
    }
    if (!ALLOWED.has(file.type)) {
      return { ok: false, error: "Use JPEG, PNG, GIF, WebP, or AVIF." };
    }
    const raw = Buffer.from(await file.arrayBuffer());
    const settings = await getUploadImageSettingsFromDb();
    const norm = await normalizeThemeDecorBuffer(raw, file.type, settings);
    const baseLeaf = safeBasename(file.name).replace(/\.[^.]+$/, "") || "image";
    const storedName = `${randomUUID()}-${baseLeaf}.${norm.ext}`;
    const key = `uploads/theme/${storedName}`;
    const url = await putUploadObject(key, norm.buffer, norm.contentType);
    revalidatePath("/", "layout");
    return { ok: true, url };
  } catch (e) {
    console.error("uploadThemeDecorImage", e);
    if (e instanceof Error && e.message === "Unauthorized") {
      return { ok: false, error: "You must be signed in as admin to upload." };
    }
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
}

export async function removeThemeDecorUrl(url: string) {
  await requireAdmin();
  if (!url.startsWith("/uploads/theme/") && !url.startsWith("https://")) return;
  await deleteUploadByUrl(url);
  const row = await prisma.siteConfig.findUnique({ where: { id: 1 }, select: { themeConfig: true } });
  const cur = parseThemeConfigBlob(row?.themeConfig ?? null);
  const merged = mergeThemeBlob(row?.themeConfig ?? null);
  const prev = cur.background?.decorImageUrls ?? [];
  const list = prev.filter((u) => u !== url);
  const nextEntries = merged.decorImageEntries.filter((e) => e.url !== url);
  const next: SiteThemeConfigBlob = {
    ...cur,
    background: {
      ...cur.background,
      decorImageUrls: list,
      decorImageEntries: nextEntries.length > 0 ? nextEntries : undefined,
    },
  };
  await prisma.siteConfig.update({
    where: { id: 1 },
    data: { themeConfig: next as object },
  });
  revalidatePath("/", "layout");
  revalidatePath("/settings/theme", "page");
}
