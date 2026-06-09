import type { Metadata } from "next";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { DEFAULT_COMPANY_NAME, type SeoSettingsState } from "@/lib/site-config-types";

export const SEO_META_DESCRIPTION_MAX = 160;

export type SeoAuditSnapshot = {
  activeProductCount: number;
  activeProductsMissingShortDescription: number;
  inactiveProductCount: number;
};

export function seoSettingsDefaults(companyName = DEFAULT_COMPANY_NAME): SeoSettingsState {
  return {
    linkPreviewTitle: "",
    linkPreviewDescription: "",
    seoIndexingEnabled: true,
    googleSiteVerification: "",
    seoStoreMetaTitle: "",
    seoStoreMetaDescription: "",
    companyName,
  };
}

/** Strip HTML tags and collapse whitespace for meta descriptions. */
export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateMetaDescription(text: string, max = SEO_META_DESCRIPTION_MAX): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.6) return `${cut.slice(0, lastSpace).trim()}…`;
  return `${cut.trim()}…`;
}

export function buildRobotsRules(indexingEnabled: boolean): {
  rules: { userAgent: string; allow?: string | string[]; disallow?: string | string[] }[];
  sitemap: string;
} {
  const origin = getPublicAppOrigin();
  if (!indexingEnabled) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${origin}/sitemap.xml`,
    };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/settings", "/account", "/cart", "/api", "/labels/design"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
  };
}

export function robotsDirective(indexingEnabled: boolean): Metadata["robots"] {
  if (indexingEnabled) {
    return { index: true, follow: true };
  }
  return { index: false, follow: false, nocache: true };
}
