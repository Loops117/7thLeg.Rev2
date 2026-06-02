import Link from "next/link";
import { ThemeEditor } from "@/components/settings/theme-editor";
import { mergeThemeBlob, parseBgProductIdsJson } from "@/lib/theme-config";
import { getBgSandOverlayModeFromDb, getStoreWatermarkTextSettingsFromDb } from "@/lib/theme-config-server";
import { prisma } from "@/lib/prisma";

export default async function SettingsThemePage() {
  const [row, productsForPool, bgSandOverlayMode, storeText] = await Promise.all([
    prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        themeConfig: true,
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
        cardHoverMode: true,
      },
    }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      take: 400,
      select: { id: true, name: true },
    }),
    getBgSandOverlayModeFromDb(),
    getStoreWatermarkTextSettingsFromDb(),
  ]);

  const initialTheme = mergeThemeBlob(row?.themeConfig ?? null);
  const cardHoverMode = row?.cardHoverMode === "glow" ? "glow" : "zoom";
  const bgProductIds = parseBgProductIdsJson(row?.bgProductIds ?? null) ?? [];
  const storeFont = storeText.storeWatermarkFontPx;
  const storeNameGap = storeText.storeWatermarkNameGapPx;

  return (
    <div className="max-w-4xl">
      <h1 className="border-b-4 border-palm pb-3 text-2xl font-black text-palm">Theme</h1>
      <p className="mt-4 text-ink/80">
        Controls the <strong>public storefront</strong> look (not the dark admin sidebar). Use the sections below for
        layout, header/footer colors, shop product cards, buttons, and the animated background. Footer <em>text and links</em>{" "}
        are under{" "}
        <Link href="/settings/footer" className="font-medium text-lagoon-dark underline">
          Settings → Site Footer
        </Link>
        .
      </p>
      <p className="mt-2 text-sm text-ink/70">
        <Link href="/" className="font-medium text-lagoon-dark underline">
          Preview home
        </Link>
      </p>

      <div className="mt-8">
        <ThemeEditor
          initialTheme={initialTheme}
          initialCardHoverMode={cardHoverMode}
          bgEnabled={row?.bgEnabled ?? true}
          bgMaxImages={row?.bgMaxImages ?? 10}
          bgSpawnIntervalMs={row?.bgSpawnIntervalMs ?? 2000}
          bgOpacityPercent={row?.bgOpacityPercent ?? 88}
          bgSandOverlayMode={bgSandOverlayMode}
          bgImageOpacityPercent={row?.bgImageOpacityPercent ?? 85}
          bgTileScaleMin={row?.bgTileScaleMin ?? 50}
          bgTileScaleMax={row?.bgTileScaleMax ?? 100}
          bgStickerRotMinDeg={row?.bgStickerRotMinDeg ?? -45}
          bgStickerRotMaxDeg={row?.bgStickerRotMaxDeg ?? 45}
          bgProductIds={bgProductIds}
          storeWatermarkFontPx={storeFont}
          storeWatermarkNameGapPx={storeNameGap}
          productsForPool={productsForPool}
        />
      </div>
    </div>
  );
}
