import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BackgroundStack } from "@/components/background-stickers-client";
import { Providers } from "@/components/providers";
import { UrgentHomeNotificationClient } from "@/components/urgent-home-notification";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { getSiteBrandingForMetadata } from "@/lib/site-branding";
import { getSiteConfig, getUrgentHomeNotificationPayload, resolveSiteLinkPreviewText } from "@/lib/site-config";
import { getRootLayoutThemePayload } from "@/lib/theme-config-server";
import "./globals.css";

/** Avoid DB calls during `next build` (e.g. Vercel → Supabase IPv6 ENETUNREACH on pooler). */
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [config, branding] = await Promise.all([getSiteConfig(), getSiteBrandingForMetadata()]);
  const siteName = config.companyName?.trim() || "Inverts Oasis";
  const { title: linkPreviewTitle, description } = resolveSiteLinkPreviewText(config);

  return {
    metadataBase: new URL(getPublicAppOrigin()),
    title: { default: siteName, template: `%s · ${siteName}` },
    description,
    icons: {
      icon: [
        { url: branding.icon16, sizes: "16x16", type: "image/png" },
        { url: branding.icon32, sizes: "32x32", type: "image/png" },
      ],
      apple: [{ url: branding.apple180, sizes: "180x180", type: "image/png" }],
    },
    openGraph: {
      type: "website",
      siteName,
      title: linkPreviewTitle,
      description,
      images: [{ url: branding.og1200, width: 1200, height: 630, alt: linkPreviewTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: linkPreviewTitle,
      description,
      images: [branding.og1200],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = await getRootLayoutThemePayload();
  const urgentHome = await getUrgentHomeNotificationPayload();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">
        <style id="site-theme-vars" dangerouslySetInnerHTML={{ __html: theme.themeCss }} />
        <Providers>
          <BackgroundStack
            theme={{
              enabled: theme.bgEnabled,
              maxSlots: theme.bgMaxImages,
              overlayOpacityPercent: theme.bgOpacityPercent,
              bgSandOverlayMode: theme.bgSandOverlayMode,
              storeWatermarkName: theme.storeWatermarkName,
              storeWatermarkFontPx: theme.storeWatermarkFontPx,
              storeWatermarkNameGapPx: theme.storeWatermarkNameGapPx,
              imageOpacityPercent: theme.bgImageOpacityPercent,
              spawnIntervalMs: theme.bgSpawnIntervalMs,
              tileScaleMin: theme.bgTileScaleMin,
              tileScaleMax: theme.bgTileScaleMax,
              stickerRotMinDeg: theme.bgStickerRotMinDeg,
              stickerRotMaxDeg: theme.bgStickerRotMaxDeg,
              decorTileUrls: theme.decorTileUrls,
              decorTileEntries: theme.decorTileEntries,
            }}
          >
            <div className="relative z-10 flex min-h-dvh flex-col">
              <UrgentHomeNotificationClient config={urgentHome} />
              {children}
            </div>
          </BackgroundStack>
        </Providers>
      </body>
    </html>
  );
}
