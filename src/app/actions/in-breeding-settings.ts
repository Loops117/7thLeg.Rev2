"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  defaultInBreedingPageSettingsState,
  IN_BREEDING_PAGE_TITLE_DEFAULT,
  type InBreedingPageSettingsState,
} from "@/lib/in-breeding-settings-shared";
import { parseFeaturedStripConfig, parseStoreProductCardConfig } from "@/lib/store-settings-shared";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
}

export async function updateInBreedingPageSettings(state: InBreedingPageSettingsState) {
  await requireAdmin();
  const base = defaultInBreedingPageSettingsState();
  const strip = parseFeaturedStripConfig(state.featuredStripConfig ?? base.featuredStripConfig);
  const productCards = parseStoreProductCardConfig(state.productCardConfig ?? base.productCardConfig);
  const pageTitle = state.pageTitle?.trim().slice(0, 120) || IN_BREEDING_PAGE_TITLE_DEFAULT;

  const data = {
    inBreedingPageTitle: pageTitle,
    inBreedingPageEnabled: !!state.pageEnabled,
    inBreedingBannerEnabled: !!state.bannerEnabled,
    inBreedingBannerHtml: typeof state.bannerHtml === "string" ? state.bannerHtml : "",
    inBreedingFeaturedStripEnabled: !!state.featuredStripEnabled,
    inBreedingFeaturedStripConfig: strip as object,
    inBreedingProductCardConfig: productCards as object,
    inBreedingFooterEnabled: !!state.footerEnabled,
    inBreedingFooterHtml: typeof state.footerHtml === "string" ? state.footerHtml : "",
  };

  await prisma.siteConfig.upsert({
    where: { id: 1 },
    create: { id: 1, companyName: "7th Leg", ...data },
    update: data,
  });

  revalidatePath("/in-breeding");
  revalidatePath("/settings/in-breeding");
}
