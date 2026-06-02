import { prisma } from "@/lib/prisma";
import {
  BUILTIN_SITE_FOOTER,
  type SiteFooterAlignment,
  type SiteFooterLayout,
  type SiteFooterSettings,
} from "@/lib/site-footer-settings-shared";

export type {
  SiteFooterAlignment,
  SiteFooterLayout,
  SiteFooterSettings,
} from "@/lib/site-footer-settings-shared";

export { BUILTIN_SITE_FOOTER } from "@/lib/site-footer-settings-shared";

function clampAlignment(raw: unknown): SiteFooterAlignment {
  if (raw === "left" || raw === "right") return raw;
  return "center";
}

function clampLayout(raw: unknown): SiteFooterLayout {
  return raw === "stacked" ? "stacked" : "split";
}

export function parseSiteFooterConfigBlob(raw: unknown): SiteFooterSettings {
  const d = BUILTIN_SITE_FOOTER;
  if (!raw || typeof raw !== "object") {
    return { ...d };
  }
  const o = raw as Record<string, unknown>;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : d.enabled,
    alignment: clampAlignment(o.alignment),
    layout: clampLayout(o.layout),
    taglineHtml: typeof o.taglineHtml === "string" ? o.taglineHtml : d.taglineHtml,
    showTagline: typeof o.showTagline === "boolean" ? o.showTagline : d.showTagline,
    copyrightHtml: typeof o.copyrightHtml === "string" ? o.copyrightHtml : d.copyrightHtml,
    showCopyright: typeof o.showCopyright === "boolean" ? o.showCopyright : d.showCopyright,
    showBuilderCredit:
      typeof o.showBuilderCredit === "boolean" ? o.showBuilderCredit : d.showBuilderCredit,
    builderCreditPrefix:
      typeof o.builderCreditPrefix === "string"
        ? o.builderCreditPrefix.trim() || d.builderCreditPrefix
        : d.builderCreditPrefix,
    showNavLinks: typeof o.showNavLinks === "boolean" ? o.showNavLinks : d.showNavLinks,
    showShopLink: typeof o.showShopLink === "boolean" ? o.showShopLink : d.showShopLink,
    showAboutLink: typeof o.showAboutLink === "boolean" ? o.showAboutLink : d.showAboutLink,
    showBuilderCreditLink:
      typeof o.showBuilderCreditLink === "boolean" ? o.showBuilderCreditLink : d.showBuilderCreditLink,
    showAdminLink: typeof o.showAdminLink === "boolean" ? o.showAdminLink : d.showAdminLink,
  };
}

export {
  applyFooterPlaceholders,
  footerAlignmentClasses,
} from "@/lib/site-footer-settings-shared";

export async function getSiteFooterSettings(): Promise<SiteFooterSettings> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { siteFooterConfig: true },
    });
    return parseSiteFooterConfigBlob(row?.siteFooterConfig ?? null);
  } catch {
    return { ...BUILTIN_SITE_FOOTER };
  }
}
