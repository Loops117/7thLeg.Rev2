import type { MetadataRoute } from "next";
import { getPublicAppOrigin } from "@/lib/public-app-origin";
import { getSeoPublicConfig } from "@/lib/site-config";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getPublicAppOrigin();
  const now = new Date();
  const config = await getSeoPublicConfig();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/store`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  if (config.navFeaturedEnabled) {
    staticPages.push({
      url: `${origin}/featured`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  if (config.navGalleryEnabled) {
    staticPages.push({
      url: `${origin}/gallery`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }
  if (config.navAboutEnabled) {
    staticPages.push({
      url: `${origin}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  let productPages: MetadataRoute.Sitemap = [];
  if (config.seoIndexingEnabled) {
    try {
      const products = await prisma.product.findMany({
        where: { active: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      });
      productPages = products.map((p) => ({
        url: `${origin}/product/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    } catch {
      productPages = [];
    }
  }

  return [...staticPages, ...productPages];
}
