import { cache } from "react";
import { PUBLIC_DEFAULT_BRAND_LOGO_PATH } from "@/lib/brand-assets";
import { prisma } from "@/lib/prisma";

export const SITE_BRANDING_SOURCES = ["default", "companyLogo", "custom"] as const;
export type SiteBrandingSource = (typeof SITE_BRANDING_SOURCES)[number];

export type SiteBrandingAssets = {
  icon16: string;
  icon32: string;
  apple180: string;
  og1200: string;
};

export type SiteBrandingAdminState = {
  source: SiteBrandingSource;
  assets: SiteBrandingAssets | null;
};

export type ResolvedSiteBranding = SiteBrandingAssets & {
  source: SiteBrandingSource;
};

export const siteBrandingAdminDefaults: SiteBrandingAdminState = {
  source: "default",
  assets: null,
};

export function parseSiteBrandingSource(s: string | null | undefined): SiteBrandingSource {
  if (s === "companyLogo" || s === "custom") return s;
  return "default";
}

export function parseSiteBrandingAssets(raw: unknown): SiteBrandingAssets | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const icon16 = typeof o.icon16 === "string" ? o.icon16.trim() : "";
  const icon32 = typeof o.icon32 === "string" ? o.icon32.trim() : "";
  const apple180 = typeof o.apple180 === "string" ? o.apple180.trim() : "";
  const og1200 = typeof o.og1200 === "string" ? o.og1200.trim() : "";
  if (!icon16 || !icon32 || !apple180 || !og1200) return null;
  return { icon16, icon32, apple180, og1200 };
}

function defaultBrandingAssets(): SiteBrandingAssets {
  const p = PUBLIC_DEFAULT_BRAND_LOGO_PATH;
  return { icon16: p, icon32: p, apple180: p, og1200: p };
}

function assetsFromCompanyLogoUrl(url: string): SiteBrandingAssets | null {
  const u = url.trim();
  if (!u) return null;
  return { icon16: u, icon32: u, apple180: u, og1200: u };
}

export function resolveSiteBranding(
  source: SiteBrandingSource,
  assets: SiteBrandingAssets | null,
  companyLogoUrl: string,
): ResolvedSiteBranding {
  if (source === "custom" && assets) {
    return { source, ...assets };
  }
  if (source === "companyLogo") {
    if (assets) return { source, ...assets };
    const fromLogo = assetsFromCompanyLogoUrl(companyLogoUrl);
    if (fromLogo) return { source, ...fromLogo };
  }
  return { source: "default", ...defaultBrandingAssets() };
}

export const getSiteBrandingForMetadata = cache(async function getSiteBrandingForMetadata(): Promise<ResolvedSiteBranding> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        siteBrandingSource: true,
        siteBrandingAssets: true,
        companyLogoUrl: true,
      },
    });
    if (!row) return resolveSiteBranding("default", null, "");
    return resolveSiteBranding(
      parseSiteBrandingSource(row.siteBrandingSource),
      parseSiteBrandingAssets(row.siteBrandingAssets),
      row.companyLogoUrl ?? "",
    );
  } catch {
    return resolveSiteBranding("default", null, "");
  }
});

export async function getSiteBrandingForAdmin(): Promise<SiteBrandingAdminState> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { siteBrandingSource: true, siteBrandingAssets: true },
    });
    if (!row) return { ...siteBrandingAdminDefaults };
    return {
      source: parseSiteBrandingSource(row.siteBrandingSource),
      assets: parseSiteBrandingAssets(row.siteBrandingAssets),
    };
  } catch {
    return { ...siteBrandingAdminDefaults };
  }
}
