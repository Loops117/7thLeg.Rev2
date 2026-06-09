import type { Metadata } from "next";
import type { ResolvedSiteBranding } from "@/lib/site-branding";
import { getPublicAppOrigin, toAbsolutePublicUrl } from "@/lib/public-app-origin";
import { formatPriceUsd } from "@/lib/product-slug";
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_SITE_LINK_PREVIEW_DESCRIPTION,
  resolveSiteLinkPreviewText,
  type SeoPublicConfig,
} from "@/lib/site-config-types";
import {
  plainTextFromHtml,
  robotsDirective,
  truncateMetaDescription,
} from "@/lib/seo";

type ProductMetaInput = {
  name: string;
  shortDescription: string | null;
  description: string;
  slug: string;
  imageUrl: string | null;
  priceCents: number;
};

export function resolveSiteDefaultDescription(
  config: Pick<SeoPublicConfig, "companyName" | "linkPreviewTitle" | "linkPreviewDescription">,
): string {
  return resolveSiteLinkPreviewText(config).description;
}

export function buildProductLinkPreviewDescription(
  product: Pick<ProductMetaInput, "name" | "shortDescription" | "description" | "priceCents">,
  siteName: string,
): string {
  const price = formatPriceUsd(product.priceCents);
  const fromShort = product.shortDescription?.trim() ?? "";
  const fromLong = plainTextFromHtml(product.description);
  const blurb = fromShort || fromLong;
  if (blurb) return truncateMetaDescription(`${price} · ${blurb}`);
  return truncateMetaDescription(`${product.name} at ${siteName} — ${price}`);
}

export function resolveStorePageTitle(
  config: Pick<SeoPublicConfig, "companyName" | "seoStoreMetaTitle" | "navShopLabel">,
): string {
  const custom = config.seoStoreMetaTitle?.trim();
  if (custom) return custom;
  const shop = config.navShopLabel?.trim() || "Shop";
  const site = config.companyName?.trim() || DEFAULT_COMPANY_NAME;
  return `${shop} · ${site}`;
}

export function resolveStorePageDescription(
  config: Pick<
    SeoPublicConfig,
    "companyName" | "linkPreviewDescription" | "seoStoreMetaDescription" | "navShopLabel"
  >,
): string {
  const custom = config.seoStoreMetaDescription?.trim();
  if (custom) return truncateMetaDescription(custom);
  const shop = config.navShopLabel?.trim() || "Shop";
  const site = config.companyName?.trim() || DEFAULT_COMPANY_NAME;
  const fallback = `Browse ${shop.toLowerCase()} at ${site}.`;
  const siteDefault = config.linkPreviewDescription?.trim() || DEFAULT_SITE_LINK_PREVIEW_DESCRIPTION;
  return truncateMetaDescription(`${fallback} ${siteDefault}`);
}

export function buildProductMetadata(
  product: ProductMetaInput,
  config: Pick<SeoPublicConfig, "companyName" | "linkPreviewTitle" | "linkPreviewDescription"> & {
    seoIndexingEnabled: boolean;
  },
  branding: ResolvedSiteBranding,
): Metadata {
  const siteName = config.companyName?.trim() || DEFAULT_COMPANY_NAME;
  const pageTitle = `${product.name} · ${siteName}`;
  const description = buildProductLinkPreviewDescription(product, siteName);
  const origin = getPublicAppOrigin();
  const canonical = `${origin}/product/${product.slug}`;
  const heroImage = product.imageUrl?.trim()
    ? toAbsolutePublicUrl(product.imageUrl)
    : toAbsolutePublicUrl(branding.og1200);

  return {
    title: pageTitle,
    description,
    alternates: { canonical },
    robots: robotsDirective(config.seoIndexingEnabled),
    openGraph: {
      type: "website",
      siteName,
      title: product.name,
      description,
      url: canonical,
      images: heroImage
        ? [{ url: heroImage, alt: `${product.name} — ${siteName}` }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

export function buildStoreMetadata(
  config: SeoPublicConfig & { seoIndexingEnabled: boolean },
  branding: ResolvedSiteBranding,
): Metadata {
  const title = resolveStorePageTitle(config);
  const description = resolveStorePageDescription(config);
  const origin = getPublicAppOrigin();
  const ogImage = toAbsolutePublicUrl(branding.og1200);

  return {
    title,
    description,
    alternates: { canonical: `${origin}/store` },
    robots: robotsDirective(config.seoIndexingEnabled),
    openGraph: {
      type: "website",
      siteName: config.companyName?.trim() || DEFAULT_COMPANY_NAME,
      title,
      description,
      url: `${origin}/store`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export function buildProductJsonLd(
  product: {
    name: string;
    slug: string;
    description: string;
    shortDescription: string | null;
    basePriceCents: number;
    imageUrl: string | null;
  },
  siteName: string,
): Record<string, unknown> {
  const origin = getPublicAppOrigin();
  const description = truncateMetaDescription(
    product.shortDescription?.trim() ||
      plainTextFromHtml(product.description) ||
      `${product.name} at ${siteName}`,
  );
  const image = product.imageUrl?.trim();
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description,
    url: `${origin}/product/${product.slug}`,
    brand: { "@type": "Brand", name: siteName },
    offers: {
      "@type": "Offer",
      url: `${origin}/product/${product.slug}`,
      priceCurrency: "USD",
      price: (product.basePriceCents / 100).toFixed(2),
      availability: "https://schema.org/InStock",
    },
  };
  if (image) {
    payload.image = toAbsolutePublicUrl(image);
  }
  return payload;
}
