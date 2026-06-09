import type { MetadataRoute } from "next";
import { buildRobotsRules } from "@/lib/seo";
import { getSeoPublicConfig } from "@/lib/site-config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getSeoPublicConfig();
  const { rules, sitemap } = buildRobotsRules(config.seoIndexingEnabled);
  return { rules, sitemap };
}
