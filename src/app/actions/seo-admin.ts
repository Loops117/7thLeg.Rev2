"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SeoSettingsState } from "@/lib/site-config-types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export type UpdateSeoSettingsResult = { ok: true } | { ok: false; error: string };

export async function updateSeoSettings(state: SeoSettingsState): Promise<UpdateSeoSettingsResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Unauthorized. Open Settings → Login and sign in again." };
  }

  const linkPreviewTitle =
    typeof state.linkPreviewTitle === "string" ? state.linkPreviewTitle.trim().slice(0, 120) : "";
  const linkPreviewDescription =
    typeof state.linkPreviewDescription === "string"
      ? state.linkPreviewDescription.trim().slice(0, 300)
      : "";
  const googleSiteVerification =
    typeof state.googleSiteVerification === "string"
      ? state.googleSiteVerification.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120)
      : "";
  const seoStoreMetaTitle =
    typeof state.seoStoreMetaTitle === "string" ? state.seoStoreMetaTitle.trim().slice(0, 120) : "";
  const seoStoreMetaDescription =
    typeof state.seoStoreMetaDescription === "string"
      ? state.seoStoreMetaDescription.trim().slice(0, 300)
      : "";
  const seoIndexingEnabled = !!state.seoIndexingEnabled;

  try {
    await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    await prisma.$executeRaw`
      UPDATE "site_config"
      SET
        "site_link_preview_title" = ${linkPreviewTitle},
        "site_link_preview_description" = ${linkPreviewDescription},
        "seo_indexing_enabled" = ${seoIndexingEnabled},
        "google_site_verification" = ${googleSiteVerification},
        "seo_store_meta_title" = ${seoStoreMetaTitle},
        "seo_store_meta_description" = ${seoStoreMetaDescription}
      WHERE "id" = 1
    `;
    revalidatePath("/", "layout");
    revalidatePath("/store");
    revalidatePath("/sitemap.xml");
    revalidatePath("/robots.txt");
    return { ok: true };
  } catch (e) {
    console.error("updateSeoSettings", e);
    const msg = e instanceof Error ? e.message : String(e);
    const missingColumn =
      /Unknown column|column .* does not exist|does not exist in the current database|\bP2022\b|42703/i.test(msg) ||
      /\bP2021\b/.test(msg);
    if (missingColumn) {
      return {
        ok: false,
        error: "Database is missing SEO columns. Run prisma migrate deploy, then try again.",
      };
    }
    return { ok: false, error: "Could not save SEO settings." };
  }
}
